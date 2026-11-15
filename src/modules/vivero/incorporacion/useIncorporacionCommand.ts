import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { WebAuthnService } from '../../../services/webauthn.service'
import { CommandLifecycle } from '../../participacion/commands/commandLifecycle'
import { IncorporacionApi, IncorporacionApiError } from './incorporacion.api'
import { validarBase, validarRecibo, validarFechaOperativa, type IncorporacionBase, type IncorporacionRecibo, type FotoPendiente } from './incorporacion.contract'
import {
  leerIntento, guardarIntento, liberarConfirmado, descartarPreparacion, withIncorporacionLock,
  indexedIncorporacionStorage, IncorporacionStorageError, INCORPORACION_CHANGED, incorporacionSignalKey, type IntentoIncorporacion, type IncorporacionStorage,
} from './incorporacion.store'

type Labels = IntentoIncorporacion['labels']
type Snapshot = {
  attempt: IntentoIncorporacion | null
  receipt: IncorporacionRecibo | null
  photos: (FotoPendiente & { expiraEn: number })[]
  busy: 'loading' | 'upload' | 'recover' | 'post' | 'clear' | null
  ready: boolean
  storageError: boolean
  error: string | null
  rejected: boolean
  canReplay: boolean
  canRepeatPhotos: boolean
}
const message = (error: unknown) => error instanceof Error ? error.message : 'No se pudo comprobar el resultado. Conserva la misma solicitud y vuelve a consultar.'
const payload = (attempt: IntentoIncorporacion) => ({ ...attempt.base, solicitud_id: attempt.solicitud_id, evidencia_ids: attempt.evidencia_ids })

export class IncorporacionController extends CommandLifecycle<Snapshot> {
  private actor: string
  private token: string
  private admin: boolean
  private storage: IncorporacionStorage
  constructor(actor: string, token: string, admin: boolean, storage: IncorporacionStorage = indexedIncorporacionStorage) {
    super({ attempt: null, receipt: null, photos: [], busy: 'loading', ready: false, storageError: false, error: null, rejected: false, canReplay: false, canRepeatPhotos: false })
    this.actor = actor; this.token = token; this.admin = admin; this.storage = storage
  }
  start = () => {
    this.activate()
    void this.load()
    window.addEventListener('storage', this.changed)
    window.addEventListener(INCORPORACION_CHANGED, this.changed)
    return () => {
      this.deactivate()
      window.removeEventListener('storage', this.changed)
      window.removeEventListener(INCORPORACION_CHANGED, this.changed)
    }
  }
  private changed = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== null && event.key !== incorporacionSignalKey(this.actor)) return
    if (event instanceof CustomEvent && event.detail?.actor_id !== this.actor) return
    if (!this.running) void this.load()
  }
  load = async () => {
    const operation = this.begin()
    if (!operation) return
    this.update({ ...this.snapshot, busy: 'loading', error: null, canReplay: false, canRepeatPhotos: false })
    try {
      const attempt = await leerIntento(this.actor, this.storage)
      if (operation.current() && this.sameSession()) {
        const knownReceipt = this.snapshot.receipt?.data.solicitud_id === attempt?.solicitud_id ? this.snapshot.receipt : null
        this.update({ ...this.snapshot, attempt, receipt: attempt?.recibo ?? knownReceipt, photos: [], busy: null, ready: true, storageError: false })
      }
    } catch (error) {
      if (operation.current() && this.sameSession()) this.update({ ...this.snapshot, busy: null, ready: false, storageError: true, error: message(error) })
    } finally { operation.finish() }
  }
  private sameSession() { return WebAuthnService.getToken()?.trim() === this.token }
  private async existing() {
    const record = await leerIntento(this.actor, this.storage)
    const local = this.snapshot.attempt
    if (!record || !local || record.solicitud_id !== local.solicitud_id || record.revision !== local.revision) throw new Error('La solicitud cambió en otra pestaña. Vuelve a consultar la preparación antes de continuar.')
    return record
  }
  private async save(record: IntentoIncorporacion) {
    const stored = await guardarIntento(record, this.storage)
    this.update({ ...this.snapshot, attempt: stored })
    return stored
  }
  private async confirmed(record: IntentoIncorporacion, receipt: IncorporacionRecibo) {
    // Antes de conocer IDs por recuperación, el recibo debe conservar toda la base.
    const known = record.evidencia_ids.length ? record.evidencia_ids : receipt.data.evidencia_ids_vinculadas
    const validated = validarRecibo(receipt, { ...payload(record), evidencia_ids: known })
    this.update({ ...this.snapshot, receipt: validated, photos: [], canReplay: false, canRepeatPhotos: false })
    // Una falla local posterior no transforma la confirmación remota en rechazo.
    await this.save({ ...record, evidencia_ids: known, fase: 'CONFIRMADO', files: [], recibo: validated })
  }
  private run = async (busy: NonNullable<Snapshot['busy']>, task: (signal: AbortSignal, current: () => boolean) => Promise<void>, needsLock = true) => {
    if (!this.sameSession()) return
    const operation = this.begin()
    if (!operation) return
    const current = () => operation.current() && this.sameSession()
    this.update({ ...this.snapshot, busy, error: null, rejected: false })
    try {
      const execute = async () => {
        if (!current()) return
        operation.signal.throwIfAborted()
        await task(operation.signal, current)
      }
      if (needsLock) await withIncorporacionLock(this.actor, execute)
      else await execute()
    }
    catch (error) {
      if (current()) this.update({ ...this.snapshot, error: message(error), storageError: error instanceof IncorporacionStorageError || this.snapshot.storageError, rejected: error instanceof IncorporacionApiError && error.concluyente && [400, 422].includes(error.status), canReplay: false, canRepeatPhotos: false })
    } finally {
      if (current()) this.update({ ...this.snapshot, busy: null })
      operation.finish()
    }
  }
  preparar = (base: IncorporacionBase, labels: Labels, files: File[]) => this.run('upload', async (signal, current) => {
    if (!this.admin || !this.snapshot.ready || this.snapshot.storageError) throw new Error('Se requiere ADMIN y almacenamiento disponible para preparar un ingreso.')
    const existing = await leerIntento(this.actor, this.storage)
    if (existing) { if (current()) this.update({ ...this.snapshot, attempt: existing, receipt: existing.recibo }); throw new Error('Esta cuenta ya tiene una incorporación conservada. Consulta primero esa solicitud.') }
    const normalized = validarBase(base)
    if (!validarFechaOperativa(normalized.fecha_evento)) throw new Error('La fecha física debe estar entre hoy y diez días atrás en La Paz.')
    const record: IntentoIncorporacion = { version: 1, actor_id: this.actor, solicitud_id: crypto.randomUUID().toLowerCase(), base: normalized, labels, files: [...files], evidencia_ids: [], fase: 'FOTOS_POR_CARGAR', recibo: null, revision: 0 }
    if (!current()) return
    let stored = await this.save(record) // UUID, intención y bytes antes del primer efecto remoto.
    if (!current()) return
    stored = await this.save({ ...stored, fase: 'FOTOS_POR_CONSULTAR' })
    if (!current()) return
    const uploaded = await IncorporacionApi.subir(this.actor, stored.solicitud_id, stored.base.vivero_id, stored.files, signal)
    if (!current()) return
    if (uploaded.evidencia_ids.length !== stored.files.length) throw new Error('La carga no pudo comprobarse por completo. Consulta las fotos pendientes antes de repetirla.')
    await this.save({ ...stored, evidencia_ids: uploaded.evidencia_ids, fase: 'LISTO_PARA_CONFIRMAR' })
    if (current()) this.update({ ...this.snapshot, photos: uploaded.data.map(photo => ({ ...photo, expiraEn: Date.now() + photo.url_expira_en_segundos * 1000 })) })
  })
  recuperar = () => this.run('recover', async (signal, current) => {
    const original = await this.existing()
    const result = await IncorporacionApi.recuperar(this.actor, original.solicitud_id, signal)
    if (!current()) return
    // La lectura propia no depende de Web Locks; sin ellos no se cambian datos
    // durables ni se habilitan reenvíos, pero un éxito sigue siendo consultable.
    if (!navigator.locks?.request) {
      if (result.estado === 'CONFIRMADO') {
        const evidenceIds = original.evidencia_ids.length ? original.evidencia_ids : result.data.evidencia_ids_vinculadas
        const receipt = validarRecibo(result, { ...payload(original), evidencia_ids: evidenceIds })
        this.update({ ...this.snapshot, receipt, photos: [], canReplay: false, canRepeatPhotos: false, error: 'El ingreso está confirmado. Este navegador no permite coordinar la actualización local; puedes seguir consultando el recibo.' })
      } else this.update({ ...this.snapshot, canReplay: false, canRepeatPhotos: false, error: 'Todavía no hay un resultado confirmado. Puedes seguir consultándolo; este navegador no permite coordinar nuevas escrituras.' })
      return
    }
    await withIncorporacionLock(this.actor, async () => {
      if (!current()) return
      const stored = await this.existing()
      if (result.estado === 'CONFIRMADO') { await this.confirmed(stored, result); return }
      if (stored.fase === 'ALTA_POR_CONSULTAR') {
        this.update({ ...this.snapshot, canReplay: this.admin, error: 'Todavía no hay un resultado confirmado. Conserva esta solicitud; puedes volver a consultar o reenviar expresamente los mismos datos.' })
        return
      }
      if (!this.admin) { this.update({ ...this.snapshot, error: 'Todavía no hay un resultado confirmado. Puedes seguir consultándolo con esta cuenta; preparar fotos o confirmar un alta nueva requiere ADMIN.' }); return }
      const photos = await IncorporacionApi.pendientes(this.actor, stored.solicitud_id, stored.base.vivero_id, signal)
      if (!current()) return
      await this.adoptPhotos(stored, photos)
    })
  }, false)
  private async adoptPhotos(stored: IntentoIncorporacion, photos: Awaited<ReturnType<typeof IncorporacionApi.pendientes>>) {
    if (!photos.evidencia_ids.length) {
      this.update({ ...this.snapshot, photos: [], canRepeatPhotos: !stored.evidencia_ids.length, error: 'No se recuperaron fotos pendientes en esta consulta. Esto no acredita que la carga anterior se haya deshecho. Vuelve a consultar antes de repetirla expresamente.' })
      return
    }
    if (photos.evidencia_ids.length !== stored.files.length || stored.evidencia_ids.length && (photos.evidencia_ids.length !== stored.evidencia_ids.length || photos.evidencia_ids.some(id => !stored.evidencia_ids.includes(id)))) throw new Error('Las fotos recuperadas no coinciden con la preparación conservada. No se cambiarán sus referencias; revisa esta solicitud antes de continuar.')
    if (!stored.evidencia_ids.length) await this.save({ ...stored, evidencia_ids: photos.evidencia_ids, fase: 'LISTO_PARA_CONFIRMAR' })
    this.update({ ...this.snapshot, photos: photos.data.map(photo => ({ ...photo, expiraEn: Date.now() + photo.url_expira_en_segundos * 1000 })), canRepeatPhotos: false, error: null })
  }
  repetirFotos = () => this.run('upload', async (signal, current) => {
    if (!this.admin || !this.snapshot.canRepeatPhotos) throw new Error('Consulta la carga anterior antes de repetir las mismas fotos.')
    let stored = await this.existing()
    if (stored.fase === 'ALTA_POR_CONSULTAR' || stored.evidencia_ids.length) throw new Error('No se pueden cambiar las fotos de una incorporación que pudo enviarse.')
    this.update({ ...this.snapshot, canRepeatPhotos: false })
    const receipt = await IncorporacionApi.recuperar(this.actor, stored.solicitud_id, signal)
    if (!current()) return
    if (receipt.estado === 'CONFIRMADO') { await this.confirmed(stored, receipt); return }
    const pending = await IncorporacionApi.pendientes(this.actor, stored.solicitud_id, stored.base.vivero_id, signal)
    if (!current()) return
    if (pending.evidencia_ids.length) { await this.adoptPhotos(stored, pending); return }
    stored = await this.save({ ...stored, fase: 'FOTOS_POR_CONSULTAR' })
    if (!current()) return
    const uploaded = await IncorporacionApi.subir(this.actor, stored.solicitud_id, stored.base.vivero_id, stored.files, signal)
    if (current()) await this.adoptPhotos(stored, uploaded)
  })
  confirmar = () => this.run('post', async (signal, current) => {
    if (!this.admin) throw new Error('Sólo ADMIN puede confirmar una incorporación nueva.')
    let stored = await this.existing()
    const replay = stored.fase === 'ALTA_POR_CONSULTAR'
    if (!replay && !validarFechaOperativa(stored.base.fecha_evento)) throw new Error('La fecha preparada quedó fuera de la ventana de diez días. El alta no se envió; revisa la preparación antes de continuar.')
    if (!replay && stored.fase !== 'LISTO_PARA_CONFIRMAR' || replay && !this.snapshot.canReplay) throw new Error('Consulta el resultado antes de reenviar la misma solicitud.')
    this.update({ ...this.snapshot, canReplay: false, canRepeatPhotos: false })
    if (replay) {
      const receipt = await IncorporacionApi.recuperar(this.actor, stored.solicitud_id, signal)
      if (!current()) return
      if (receipt.estado === 'CONFIRMADO') { await this.confirmed(stored, receipt); return }
    }
    stored = await this.save({ ...stored, fase: 'ALTA_POR_CONSULTAR' }) // Intención exacta antes del POST.
    if (!current()) return
    const receipt = await IncorporacionApi.confirmar(this.actor, payload(stored), signal)
    if (current()) await this.confirmed(stored, receipt)
  })
  descartar = () => this.run('clear', async (_signal, current) => {
    const stored = await this.existing()
    await descartarPreparacion(stored, this.storage)
    if (current()) this.update({ ...this.snapshot, attempt: null, photos: [], receipt: null, canReplay: false, canRepeatPhotos: false })
  })
  nueva = () => this.run('clear', async (_signal, current) => {
    const receipt = this.snapshot.receipt
    let stored = await this.existing()
    if (!receipt) throw new Error('Consulta primero el resultado de esta incorporación.')
    if (stored.fase !== 'CONFIRMADO') stored = await this.save({ ...stored, evidencia_ids: receipt.data.evidencia_ids_vinculadas, fase: 'CONFIRMADO', files: [], recibo: receipt })
    await liberarConfirmado(stored, this.storage)
    if (current()) this.update({ ...this.snapshot, attempt: null, receipt: null, photos: [], canReplay: false, canRepeatPhotos: false })
  })
}

export function useIncorporacionCommand(actor: string, token: string, admin: boolean, permissionKey: string) {
  const controller = useMemo(() => {
    // La revisión de permisos invalida el controlador sin borrar el intento propio.
    void permissionKey
    return new IncorporacionController(actor, token, admin)
  }, [actor, token, admin, permissionKey])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => controller.start(), [controller])
  return { ...snapshot, preparar: controller.preparar, recuperar: controller.recuperar, repetirFotos: controller.repetirFotos, confirmar: controller.confirmar, descartar: controller.descartar, nueva: controller.nueva, load: controller.load }
}
