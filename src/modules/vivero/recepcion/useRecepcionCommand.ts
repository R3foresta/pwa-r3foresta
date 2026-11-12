import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { CommandLifecycle } from '../../participacion/commands/commandLifecycle'
import {
  cargarIntencionRecepcion, guardarIntencionRecepcion, limpiarIntencionRecepcion,
  mismaIntencionRecepcion, recepcionStoreKey, RecepcionPendingError, RecepcionService, withRecepcionLock,
} from './recepcion.api'
import type { EntradaRecepcion, IntencionRecepcion, ReciboRecepcion } from './recepcion.contract'

type Snapshot = {
  pending: IntencionRecepcion | null
  receipt: ReciboRecepcion | null
  error: string | null
  busy: boolean
  missing: boolean
}
type Decision =
  | { accion: 'RECIBIR'; origen: string; entrada: Omit<EntradaRecepcion, 'comando_id' | 'evidencia_ids'>; files: File[] }
  | { accion: 'RECHAZAR'; origen: string; revision: string; motivo: string }
const message = (error: unknown) => error instanceof Error ? error.message : 'No se pudo determinar el resultado. Recupera la misma operación.'
function initialSnapshot(actor: string): Snapshot {
  try {
    return { pending: cargarIntencionRecepcion(actor), receipt: null, error: null, busy: false, missing: false }
  } catch (error) {
    return { pending: null, receipt: null, error: message(error), busy: false, missing: false }
  }
}

// Una instancia por actor descarta inmediatamente la vista y las respuestas de
// la cuenta anterior. CommandLifecycle invalida también los efectos de StrictMode.
class RecepcionCommandController extends CommandLifecycle<Snapshot> {
  private readonly actor: string
  constructor(actor: string) {
    super(initialSnapshot(actor))
    this.actor = actor
  }
  start = (): (() => void) => {
    this.activate()
    window.addEventListener('storage', this.storageChanged)
    return () => {
      this.deactivate()
      window.removeEventListener('storage', this.storageChanged)
    }
  }
  private storageChanged = (event: StorageEvent): void => {
    if ((event.key !== null && event.key !== recepcionStoreKey(this.actor)) || this.running) return
    try {
      const stored = cargarIntencionRecepcion(this.actor)
      // El borrado por otra pestaña no acredita por sí solo el resultado propio.
      const pending = this.snapshot.pending && !this.snapshot.receipt ? this.snapshot.pending : stored
      this.update({ ...this.snapshot, pending, error: null, missing: false })
    } catch (error) {
      this.update({ ...this.snapshot, error: message(error) })
    }
  }
  setError = (error: string | null): void => {
    if (this.active) this.update({ ...this.snapshot, error })
  }
  clearReceipt = (): void => {
    if (!this.running) this.update({ ...this.snapshot, receipt: null })
  }
  confirmar = (origen: string, entrada: Omit<EntradaRecepcion, 'comando_id' | 'evidencia_ids'>, files: File[]) =>
    this.perform('confirm', { accion: 'RECIBIR', origen, entrada: { ...entrada }, files: [...files] })
  rechazar = (origen: string, revision: string, motivo: string) =>
    this.perform('confirm', { accion: 'RECHAZAR', origen, revision, motivo })
  recuperar = () => this.perform('recover')
  reenviar = () => this.perform('retry')

  private async perform(mode: 'confirm' | 'recover' | 'retry', decision?: Decision): Promise<void> {
    if (this.running || !this.active) return
    if (mode === 'confirm' && this.snapshot.pending) {
      this.update({ ...this.snapshot, error: 'Recupera primero la operación pendiente de esta cuenta.' })
      return
    }
    const operation = this.begin()
    if (!operation) return
    const { signal, current } = operation
    let intention = mode === 'confirm' ? null : this.snapshot.pending
    this.update({ ...this.snapshot, busy: true, error: null, missing: false, receipt: null })
    try {
      let receipt: ReciboRecepcion | null = null
      if (mode === 'confirm' && decision) {
        // El lock abarca preparación, persistencia y envío final. Otra pestaña
        // que confirmó a la vez encuentra la intención guardada y no crea otra.
        receipt = await withRecepcionLock(this.actor, async () => {
          signal.throwIfAborted()
          const stored = cargarIntencionRecepcion(this.actor)
          if (stored) throw new RecepcionPendingError(stored)
          const commandId = crypto.randomUUID()
          let candidate: IntencionRecepcion
          if (decision.accion === 'RECIBIR') {
            const ids = await RecepcionService.fotos(this.actor, decision.origen, decision.files, signal)
            signal.throwIfAborted()
            candidate = {
              accion: 'RECIBIR', actor_id: this.actor, recoleccion_id: decision.origen,
              entrada: { ...decision.entrada, comando_id: commandId, evidencia_ids: ids },
            }
          } else {
            candidate = {
              accion: 'RECHAZAR', actor_id: this.actor, recoleccion_id: decision.origen,
              entrada: { comando_id: commandId, revision_esperada: decision.revision, motivo_rechazo: decision.motivo.trim().normalize('NFC') },
            }
          }
          signal.throwIfAborted()
          intention = guardarIntencionRecepcion(candidate)
          if (current()) this.update({ ...this.snapshot, pending: intention })
          return RecepcionService.comando(intention, false, signal)
        })
      } else {
        intention ??= cargarIntencionRecepcion(this.actor)
        if (!intention) {
          if (current()) this.update({ ...this.snapshot, pending: null, busy: false })
          return
        }
        const original = intention
        if (current()) this.update({ ...this.snapshot, pending: original })
        receipt = mode === 'recover'
          ? await RecepcionService.comando(original, true, signal)
          : await withRecepcionLock(this.actor, () => {
            signal.throwIfAborted()
            const stored = cargarIntencionRecepcion(this.actor)
            // Si otra pestaña liberó o sustituyó el slot, sólo consultar.
            return RecepcionService.comando(original, !stored || !mismaIntencionRecepcion(stored, original), signal)
          })
      }
      if (!current() || !receipt || !intention) return
      if (receipt.estado === 'CONFIRMADO' || receipt.estado === 'RECHAZADO') {
        let pending: IntencionRecepcion | null = intention
        let cleanupError: string | null = null
        try {
          pending = await limpiarIntencionRecepcion(intention)
        } catch (error) {
          cleanupError = message(error)
        }
        if (current()) this.update({ receipt, pending, error: cleanupError, missing: false, busy: false })
      } else {
        this.update({
          pending: intention, receipt: null, busy: false, missing: receipt.estado === 'SIN_RESULTADO',
          error: receipt.estado === 'SIN_RESULTADO'
            ? 'Aún no hay un resultado confirmado. Consulta otra vez o reenvía expresamente la misma intención.'
            : 'La clave pertenece a otra carga. Conserva el comando original y revisa su resultado antes de continuar.',
        })
      }
    } catch (error) {
      if (!current()) return
      if (error instanceof RecepcionPendingError) intention = error.intencion
      this.update({ ...this.snapshot, pending: intention, busy: false, error: message(error), missing: false })
    } finally {
      operation.finish()
    }
  }
}

export function useRecepcionCommand(actor: string) {
  const controller = useMemo(() => new RecepcionCommandController(actor), [actor])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return {
    ...snapshot,
    confirmar: controller.confirmar, rechazar: controller.rechazar,
    recuperar: controller.recuperar, reenviar: controller.reenviar,
    clearReceipt: controller.clearReceipt, setError: controller.setError,
  }
}
