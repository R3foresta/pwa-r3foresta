import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ParticipacionApiError, UsuariosService } from '../api/usuarios.api'
import type { IntentoRol, ReciboRol } from '../types'
import { CommandLifecycle } from '../../participacion/commands/commandLifecycle'
import {
  RoleCommandPendingError,
  roleCommandStorageKey,
  claimRoleCommand,
  clearRoleCommand,
  readRoleCommand,
  withRoleCommandLock,
  type RoleCommandDraft,
} from './roleCommandStore'

export type { RoleCommandDraft } from './roleCommandStore'
export type RoleCommandState = 'idle' | 'sending' | 'unconfirmed' | 'confirmed' | 'rejected' | 'sessionExpired'
type Snapshot = {
  state: RoleCommandState
  busy: boolean
  pending: IntentoRol | null
  receipt: ReciboRol | null
  error: string | null
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo confirmar el resultado. Conserva el envío y consulta nuevamente.'
}

function initialSnapshot(actorId: string | null): Snapshot {
  try {
    const pending = actorId ? readRoleCommand(actorId) : null
    return { state: pending ? 'unconfirmed' : 'idle', busy: false, pending, receipt: null, error: null }
  } catch (error) {
    return { state: 'unconfirmed', busy: false, pending: null, receipt: null, error: message(error) }
  }
}

// Instancia por cuenta; useSyncExternalStore evita mostrar siquiera un render
// del actor anterior mientras React cambia de sesión.
class RoleCommandController extends CommandLifecycle<Snapshot> {
  private readonly actorId: string | null

  constructor(actorId: string | null) {
    super(initialSnapshot(actorId))
    this.actorId = actorId
  }

  start = (): (() => void) => {
    this.activate()
    window.addEventListener('storage', this.storageChanged)
    if (this.snapshot.pending && !this.snapshot.receipt) void this.recover()
    return () => {
      this.deactivate()
      window.removeEventListener('storage', this.storageChanged)
    }
  }

  private storageChanged = (event: StorageEvent): void => {
    if (!this.actorId || event.key !== roleCommandStorageKey(this.actorId) || this.running) return
    try {
      const stored = readRoleCommand(this.actorId)
      // Otra pestaña puede haber visto un terminal y borrado la clave. Esta
      // instancia conserva su intención hasta obtener su propio recibo validado.
      if (this.snapshot.pending && !this.snapshot.receipt) {
        this.update({ ...this.snapshot, state: 'unconfirmed', error: null })
        void this.recover()
      } else if (stored) {
        this.update({ state: 'unconfirmed', busy: false, pending: stored, receipt: null, error: null })
        void this.recover()
      }
    } catch (error) {
      this.update({ ...this.snapshot, state: 'unconfirmed', busy: false, error: message(error) })
    }
  }

  confirm = async (draft: RoleCommandDraft): Promise<void> => {
    if (this.running) return
    if (this.snapshot.pending && !this.snapshot.receipt) {
      this.update({ ...this.snapshot, error: 'Recupera el envío pendiente antes de confirmar otra acción.' })
      return
    }
    await this.perform('confirm', draft)
  }

  recover = async (): Promise<void> => this.perform('recover')

  retrySame = async (): Promise<void> => this.perform('retry')

  resetTerminal = async (): Promise<void> => {
    if (this.running || !this.snapshot.receipt || !this.snapshot.pending) return
    try {
      await clearRoleCommand(this.snapshot.pending)
      if (this.active) this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
    } catch (error) {
      if (this.active) this.update({ ...this.snapshot, error: message(error) })
    }
  }

  private async perform(mode: 'confirm' | 'recover' | 'retry', draft?: RoleCommandDraft): Promise<void> {
    if (this.running || !this.active) return
    const actorId = this.actorId
    if (!actorId) {
      this.update({ state: 'sessionExpired', busy: false, pending: null, receipt: null, error: 'Ingresa con la cuenta original para gestionar o recuperar sus envíos.' })
      return
    }
    const operation = this.begin()
    if (!operation) return
    const { signal, current } = operation
    let intento = mode === 'confirm' ? null : this.snapshot.pending
    this.update({ state: 'sending', busy: true, pending: intento, receipt: null, error: null })
    try {
      if (mode === 'confirm' && draft) intento = await claimRoleCommand(actorId, draft)
      else intento ??= readRoleCommand(actorId)
      if (!current()) return
      if (!intento) {
        this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
        return
      }
      const original = intento
      this.update({ state: 'sending', busy: true, pending: original, receipt: null, error: null })
      const receipt = mode === 'recover'
        ? await UsuariosService.recuperar(original, signal)
        : await withRoleCommandLock(actorId, async () => {
          signal.throwIfAborted()
          const stored = readRoleCommand(actorId)
          // Un terminal conocido por otra pestaña puede haber liberado el slot.
          // En ese caso sólo consultamos, sin reabrir un envío local antiguo.
          return stored?.payload.comando_id === original.payload.comando_id && stored.operacion === original.operacion
            ? UsuariosService.enviar(original, signal)
            : UsuariosService.recuperar(original, signal)
        })
      if (!current()) return
      let cleanupError: string | null = null
      try {
        await clearRoleCommand(original)
      } catch (error) {
        cleanupError = message(error)
      }
      if (current()) this.update({ state: receipt.estado === 'CONFIRMADO' ? 'confirmed' : 'rejected', busy: false, pending: original, receipt, error: cleanupError })
    } catch (error) {
      if (!current()) return
      if (error instanceof RoleCommandPendingError) intento = error.intento
      this.update({ state: error instanceof ParticipacionApiError && error.status === 401 ? 'sessionExpired' : 'unconfirmed', busy: false, pending: intento, receipt: null, error: message(error) })
    } finally {
      operation.finish()
    }
  }
}

export function useRoleCommand(actorId: string | null) {
  const controller = useMemo(() => new RoleCommandController(actorId), [actorId])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return { ...snapshot, confirm: controller.confirm, recover: controller.recover, retrySame: controller.retrySame, resetTerminal: controller.resetTerminal }
}
