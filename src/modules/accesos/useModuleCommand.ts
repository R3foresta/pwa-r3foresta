import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ParticipacionApiError } from '../participacion/api/participacion.transport'
import { AccesosService } from './accesos.api'
import type { IntentoAcceso, ReciboAcceso, DominioAcceso } from './types'
import { CommandLifecycle } from '../participacion/commands/commandLifecycle'
import {
  ModuleCommandPendingError,
  moduleCommandStorageKey,
  claimModuleCommand,
  clearModuleCommand,
  readModuleCommand,
  withModuleCommandLock,
  type AccesoDraft,
} from './moduleCommandStore'

export type { AccesoDraft } from './moduleCommandStore'
export type ModuleCommandState = 'idle' | 'sending' | 'unconfirmed' | 'confirmed' | 'rejected' | 'sessionExpired'
type Snapshot = {
  state: ModuleCommandState
  busy: boolean
  pending: IntentoAcceso | null
  receipt: ReciboAcceso | null
  error: string | null
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo confirmar el resultado. Conserva el envío y consulta nuevamente.'
}

function initialSnapshot(actorId: string | null, domain: DominioAcceso): Snapshot {
  try {
    const pending = actorId ? readModuleCommand(actorId, domain) : null
    return { state: pending ? 'unconfirmed' : 'idle', busy: false, pending, receipt: null, error: null }
  } catch (error) {
    return { state: 'unconfirmed', busy: false, pending: null, receipt: null, error: message(error) }
  }
}

// Instancia por cuenta; useSyncExternalStore evita mostrar siquiera un render
// del actor anterior mientras React cambia de sesión.
class ModuleCommandController extends CommandLifecycle<Snapshot> {
  private readonly actorId: string | null
  private readonly domain: DominioAcceso

  constructor(actorId: string | null, domain: DominioAcceso) {
    super(initialSnapshot(actorId, domain))
    this.actorId = actorId
    this.domain = domain
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
    if (!this.actorId || event.key !== moduleCommandStorageKey(this.actorId, this.domain) || this.running) return
    try {
      const stored = readModuleCommand(this.actorId, this.domain)
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

  confirm = async (draft: AccesoDraft): Promise<void> => {
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
      await clearModuleCommand(this.snapshot.pending)
      if (this.active) this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
    } catch (error) {
      if (this.active) this.update({ ...this.snapshot, error: message(error) })
    }
  }

  private async perform(mode: 'confirm' | 'recover' | 'retry', draft?: AccesoDraft): Promise<void> {
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
      if (mode === 'confirm' && draft) intento = await claimModuleCommand(actorId, this.domain, draft)
      else intento ??= readModuleCommand(actorId, this.domain)
      if (!current()) return
      if (!intento) {
        this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
        return
      }
      const original = intento
      this.update({ state: 'sending', busy: true, pending: original, receipt: null, error: null })
      const receipt = mode === 'recover'
        ? await AccesosService.recuperar(original, signal)
        : await withModuleCommandLock(actorId, this.domain, async () => {
          signal.throwIfAborted()
          const stored = readModuleCommand(actorId, this.domain)
          // Un terminal conocido por otra pestaña puede haber liberado el slot.
          // En ese caso sólo consultamos, sin reabrir un envío local antiguo.
          return stored?.payload.comando_id === original.payload.comando_id && stored.operacion === original.operacion
            ? AccesosService.enviar(original, signal)
            : AccesosService.recuperar(original, signal)
        })
      if (!current()) return
      let cleanupError: string | null = null
      try {
        await clearModuleCommand(original)
      } catch (error) {
        cleanupError = message(error)
      }
      if (current()) this.update({ state: receipt.estado === 'CONFIRMADO' ? 'confirmed' : 'rejected', busy: false, pending: original, receipt, error: cleanupError })
    } catch (error) {
      if (!current()) return
      if (error instanceof ModuleCommandPendingError) intento = error.intento
      this.update({ state: error instanceof ParticipacionApiError && error.status === 401 ? 'sessionExpired' : 'unconfirmed', busy: false, pending: intento, receipt: null, error: message(error) })
    } finally {
      operation.finish()
    }
  }
}

export function useModuleCommand(actorId: string | null, domain: DominioAcceso) {
  const controller = useMemo(() => new ModuleCommandController(actorId, domain), [actorId, domain])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return { ...snapshot, confirm: controller.confirm, recover: controller.recover, retrySame: controller.retrySame, resetTerminal: controller.resetTerminal }
}
