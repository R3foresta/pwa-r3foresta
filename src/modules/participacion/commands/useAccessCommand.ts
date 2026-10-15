import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ParticipacionApiError, ParticipacionService } from '../api/participacion.api'
import type { IntentoAcceso, ReciboAcceso } from '../types'
import {
  AccessCommandPendingError,
  accessCommandStorageKey,
  claimAccessCommand,
  clearAccessCommand,
  readAccessCommand,
  withAccessCommandLock,
  type AccessCommandDraft,
} from './accessCommandStore'

export type { AccessCommandDraft } from './accessCommandStore'
export type AccessCommandState = 'idle' | 'sending' | 'unconfirmed' | 'confirmed' | 'rejected' | 'sessionExpired'
type Snapshot = {
  state: AccessCommandState
  busy: boolean
  pending: IntentoAcceso | null
  receipt: ReciboAcceso | null
  error: string | null
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo confirmar el resultado. Conserva el envío y consulta nuevamente.'
}

function initialSnapshot(actorId: string | null): Snapshot {
  try {
    const pending = actorId ? readAccessCommand(actorId) : null
    return { state: pending ? 'unconfirmed' : 'idle', busy: false, pending, receipt: null, error: null }
  } catch (error) {
    return { state: 'unconfirmed', busy: false, pending: null, receipt: null, error: message(error) }
  }
}

// Instancia por cuenta; useSyncExternalStore evita mostrar siquiera un render
// del actor anterior mientras React cambia de sesión.
class AccessCommandController {
  private readonly actorId: string | null
  private snapshot: Snapshot
  private readonly listeners = new Set<() => void>()
  private active = false
  private running = false
  private requestVersion = 0
  private abort: AbortController | null = null

  constructor(actorId: string | null) {
    this.actorId = actorId
    this.snapshot = initialSnapshot(actorId)
  }

  getSnapshot = (): Snapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private update(next: Snapshot): void {
    this.snapshot = next
    this.listeners.forEach((listener) => listener())
  }

  start = (): (() => void) => {
    this.active = true
    window.addEventListener('storage', this.storageChanged)
    if (this.snapshot.pending && !this.snapshot.receipt) void this.recover()
    return () => {
      this.active = false
      this.requestVersion += 1
      this.abort?.abort()
      this.running = false
      window.removeEventListener('storage', this.storageChanged)
    }
  }

  private storageChanged = (event: StorageEvent): void => {
    if (!this.actorId || event.key !== accessCommandStorageKey(this.actorId) || this.running) return
    try {
      const stored = readAccessCommand(this.actorId)
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

  confirm = async (draft: AccessCommandDraft): Promise<void> => {
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
      await clearAccessCommand(this.snapshot.pending)
      if (this.active) this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
    } catch (error) {
      if (this.active) this.update({ ...this.snapshot, error: message(error) })
    }
  }

  private async perform(mode: 'confirm' | 'recover' | 'retry', draft?: AccessCommandDraft): Promise<void> {
    if (this.running || !this.active) return
    const actorId = this.actorId
    if (!actorId) {
      this.update({ state: 'sessionExpired', busy: false, pending: null, receipt: null, error: 'Ingresa con la cuenta original para gestionar o recuperar sus envíos.' })
      return
    }
    this.running = true
    const version = ++this.requestVersion
    const controller = new AbortController()
    this.abort = controller
    const current = () => this.active && version === this.requestVersion
    let intento = mode === 'confirm' ? null : this.snapshot.pending
    this.update({ state: 'sending', busy: true, pending: intento, receipt: null, error: null })
    try {
      if (mode === 'confirm' && draft) intento = await claimAccessCommand(actorId, draft)
      else intento ??= readAccessCommand(actorId)
      if (!current()) return
      if (!intento) {
        this.update({ state: 'idle', busy: false, pending: null, receipt: null, error: null })
        return
      }
      const original = intento
      this.update({ state: 'sending', busy: true, pending: original, receipt: null, error: null })
      const receipt = mode === 'recover'
        ? await ParticipacionService.recuperar(original, controller.signal)
        : await withAccessCommandLock(actorId, async () => {
          controller.signal.throwIfAborted()
          const stored = readAccessCommand(actorId)
          // Un terminal conocido por otra pestaña puede haber liberado el slot.
          // En ese caso sólo consultamos, sin reabrir un envío local antiguo.
          return stored?.payload.comando_id === original.payload.comando_id && stored.operacion === original.operacion
            ? ParticipacionService.enviar(original, controller.signal)
            : ParticipacionService.recuperar(original, controller.signal)
        })
      if (!current()) return
      let cleanupError: string | null = null
      try {
        await clearAccessCommand(original)
      } catch (error) {
        cleanupError = message(error)
      }
      if (current()) this.update({ state: receipt.estado === 'CONFIRMADO' ? 'confirmed' : 'rejected', busy: false, pending: original, receipt, error: cleanupError })
    } catch (error) {
      if (!current()) return
      if (error instanceof AccessCommandPendingError) intento = error.intento
      this.update({ state: error instanceof ParticipacionApiError && error.status === 401 ? 'sessionExpired' : 'unconfirmed', busy: false, pending: intento, receipt: null, error: message(error) })
    } finally {
      if (current()) {
        this.running = false
        this.abort = null
      }
    }
  }
}

export function useAccessCommand(actorId: string | null) {
  const controller = useMemo(() => new AccessCommandController(actorId), [actorId])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return { ...snapshot, confirm: controller.confirm, recover: controller.recover, retrySame: controller.retrySame, resetTerminal: controller.resetTerminal }
}
