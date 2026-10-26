import { ParticipacionApiError } from '../api/participacion.api'
import { RegistroParticipacionService } from '../api/registro.api'
import { validarRegistroEntrada } from '../api/registro.contract'
import type { CargaRegistro, CargasRegistroLectura, ReciboRegistro, RegistroIdentity, RegistroInicialEntrada } from '../registroTypes'
import { CommandLifecycle, type CommandOperation } from './commandLifecycle'
import {
  indexedRegistrationStorage, newRegistrationDraft, readRegistrationDraft, RegistrationChangedError,
  RegistrationStorageError, saveRegistrationDraft, withRegistrationLock,
  type RegistrationDraftRecord, type RegistrationFile, type RegistrationStorage, type RegistroDraft,
} from './registrationDraftStore'

export type RegistroCommandState = 'loading' | 'draft' | 'preparing' | 'uploading' | 'sending' | 'unconfirmed' | 'prepared' | 'confirmed' | 'rejected' | 'sessionExpired'
export type RegistroConfirmDraft = Omit<RegistroInicialEntrada, 'comando_id' | 'subcampania_id' | 'evidencia_ids'>
export type RegistroCommandSnapshot = {
  state: RegistroCommandState
  busy: boolean
  draft: RegistroDraft
  files: RegistrationFile[]
  pending: RegistroIdentity | null
  cancelRequested: boolean
  receipt: ReciboRegistro | null
  error: string | null
}
type Api = Pick<typeof RegistroParticipacionService, 'preparar' | 'recuperar' | 'listarCargas' | 'subirCarga' | 'cancelar' | 'enviar'>
function errorMessage(error: unknown, capture = false): string {
  if (capture && error instanceof ParticipacionApiError && error.codigo === 'COMANDO_NO_ENCONTRADO') return 'No pudimos conectar la carga de fotos. Tu captura sigue guardada en este dispositivo; vuelve a intentar.'
  return error instanceof Error ? error.message : 'No se pudo confirmar el resultado. Conserva el comando original y vuelve a consultar.'
}
function recoveryMessage(error: unknown, record: RegistrationDraftRecord | null): string {
  if (error instanceof ParticipacionApiError && [202, 404].includes(error.status) && ['COMANDO_NO_CONFIRMADO', 'COMANDO_NO_ENCONTRADO'].includes(error.codigo)) {
    if (record?.cancelacion_solicitada) return 'Aún no se confirmó el descarte. Conservamos esta captura; reintenta el descarte con la misma clave.'
    if (record?.payload) return 'Aún no se confirmó si esta plantación se guardó. Conservamos el envío original para comprobarlo o reintentarlo sin crear otra intención.'
  }
  return errorMessage(error, Boolean(record && !record.payload && !record.cancelacion_solicitada && !record.terminal))
}
function identity(record: RegistrationDraftRecord): RegistroIdentity {
  if (!record.comando_id) throw new RegistrationStorageError('La preparación aún no tiene una identidad conservada.')
  return { actor_id: record.actor_id, subcampania_id: record.subcampania_id, comando_id: record.comando_id, ...(record.payload ? { payload: record.payload } : {}) }
}
function immutablePayload(payload: RegistroInicialEntrada): RegistroInicialEntrada {
  payload.especies.forEach(Object.freeze); Object.freeze(payload.especies)
  Object.freeze(payload.coresponsable_ids); Object.freeze(payload.evidencia_ids)
  payload.afiliaciones_declaradas?.forEach((item) => { if (item.afiliacion) Object.freeze(item.afiliacion); Object.freeze(item) })
  if (payload.afiliaciones_declaradas) Object.freeze(payload.afiliaciones_declaradas)
  return Object.freeze(payload)
}
function fileAvailable(file: RegistrationFile): boolean {
  return !file.omitted && (file.carga?.estado === 'DISPONIBLE' || file.carga?.estado === 'VINCULADA') && file.carga.evidencia_id !== null
}

// Usa el mismo lifecycle/exclusión que los comandos INT06. El registro añade
// preparación, bytes y cargas persistidas; nunca crea otra identidad al conciliar.
export class RegistrationCommandController extends CommandLifecycle<RegistroCommandSnapshot> {
  private readonly actorId: string | null
  private readonly scopeId: string | null
  private readonly storage: RegistrationStorage
  private readonly api: Api
  private record: RegistrationDraftRecord | null = null
  private mutations: Promise<void> = Promise.resolve()
  private requiresRecovery = false

  constructor(actorId: string | null, scopeId: string | null, storage = indexedRegistrationStorage, api: Api = RegistroParticipacionService) {
    const initial = actorId && scopeId ? newRegistrationDraft(actorId, scopeId).draft : newRegistrationDraft('1', '1').draft
    super({ state: 'loading', busy: true, draft: initial, files: [], pending: null, cancelRequested: false, receipt: null, error: null })
    this.actorId = actorId; this.scopeId = scopeId; this.storage = storage; this.api = api
  }
  start = (): (() => void) => {
    this.activate()
    void this.recover()
    return () => this.deactivate()
  }
  private show(record: RegistrationDraftRecord, state: RegistroCommandState, error: string | null = null, receipt: ReciboRegistro | null = null): void {
    this.record = record
    if (this.active) this.update({ state, busy: this.running, draft: record.draft, files: record.files.filter((photo) => !photo.omitted), pending: record.comando_id ? identity(record) : null, cancelRequested: record.cancelacion_solicitada, receipt, error })
  }
  private async persist(record: RegistrationDraftRecord): Promise<RegistrationDraftRecord> {
    this.record = await saveRegistrationDraft(record, this.storage)
    return this.record
  }
  private async currentRecord(reconcile = false): Promise<RegistrationDraftRecord> {
    if (!this.actorId || !this.scopeId) throw new ParticipacionApiError(401, { codigo: 'SESION_INVALIDA', mensaje: 'Ingresa con la cuenta original para recuperar su registro.', campos: [], ambitos: [], reintento: 'RECUPERAR_SESION' })
    if (this.requiresRecovery && !reconcile) throw new RegistrationChangedError()
    const stored = await readRegistrationDraft(this.actorId, this.scopeId, this.storage)
    if (!reconcile && this.record && (stored?.revision_local ?? 0) !== this.record.revision_local) {
      this.requiresRecovery = true
      if (stored) this.record = stored
      throw new RegistrationChangedError()
    }
    if (reconcile) this.requiresRecovery = false
    return stored ?? newRegistrationDraft(this.actorId, this.scopeId)
  }
  private assertEditable(record: RegistrationDraftRecord): void {
    if (record.payload || record.cancelacion_solicitada || record.terminal) throw new Error('Este comando ya tiene una confirmación o cancelación pendiente. Recupera su resultado antes de cambiar la intención.')
  }
  private async work(state: RegistroCommandState, task: (record: RegistrationDraftRecord, operation: CommandOperation) => Promise<void>, reconcile = false): Promise<void> {
    const operation = this.begin()
    if (!operation) return
    this.update({ ...this.snapshot, state, busy: true, error: null })
    try {
      await this.mutations
      if (!operation.current()) return
      if (!this.actorId || !this.scopeId) throw new ParticipacionApiError(401, { codigo: 'SESION_INVALIDA', mensaje: 'Ingresa con la cuenta original para recuperar el registro.', campos: [], ambitos: [], reintento: 'RECUPERAR_SESION' })
      await withRegistrationLock(this.actorId, this.scopeId, async () => {
        operation.signal.throwIfAborted()
        const record = await this.currentRecord(reconcile)
        if (!operation.current()) return
        this.record = record
        await task(record, operation)
      })
    } catch (error) {
      if (operation.current()) {
        const canResumeCapture = Boolean(this.record && !this.record.payload && !this.record.cancelacion_solicitada && !this.record.terminal && !(error instanceof RegistrationStorageError))
        let state: RegistroCommandState = 'unconfirmed'
        if (error instanceof ParticipacionApiError && error.status === 401) state = 'sessionExpired'
        else if (canResumeCapture) state = this.record!.preparado ? 'prepared' : 'draft'
        if (this.record) this.show(this.record, state, recoveryMessage(error, this.record))
        else this.update({ ...this.snapshot, state, error: errorMessage(error) })
      }
    } finally {
      operation.finish()
      if (operation.current()) this.update({ ...this.snapshot, busy: false })
    }
  }

  // Los parches se encadenan incluso durante tecleo rápido; ni un POST ni un
  // PUT pueden adelantarse a la confirmación de estas transacciones locales.
  updateDraft = (patch: Partial<RegistroDraft>): Promise<void> => {
    if (!this.active || this.running || this.requiresRecovery || this.record?.payload || this.record?.terminal || this.record?.cancelacion_solicitada) return Promise.resolve()
    const copy = JSON.parse(JSON.stringify(patch)) as Partial<RegistroDraft>
    this.update({ ...this.snapshot, draft: { ...this.snapshot.draft, ...copy }, error: null })
    const job = this.mutations.then(async () => {
      if (!this.active || !this.actorId || !this.scopeId) return
      await withRegistrationLock(this.actorId, this.scopeId, async () => {
        const record = await this.currentRecord()
        this.assertEditable(record)
        await this.persist({ ...record, draft: { ...record.draft, ...copy } })
      })
    }).catch((error: unknown) => {
      if (this.active) this.update({ ...this.snapshot, state: 'unconfirmed', error: errorMessage(error) })
      throw error
    })
    this.mutations = job.catch(() => {})
    return job.catch(() => {})
  }
  addFiles = async (files: File[]): Promise<void> => this.work('uploading', async (record) => {
    this.assertEditable(record)
    if (record.files.length + files.length > 10) throw new Error('Se conservan como máximo 10 fotos por preparación, incluidas las omitidas. Cancela y revisa una preparación nueva para cambiar más fotos.')
    if (files.some((file) => file.size < 1 || file.size > 10 * 1024 * 1024)) throw new Error('Cada foto debe pesar entre 1 byte y 10 MiB.')
    const next = await this.persist({ ...record, comando_id: record.comando_id ?? crypto.randomUUID(), files: [...record.files, ...files.map((file) => ({ carga_id: crypto.randomUUID(), file, carga: null, error: null, omitted: false }))] })
    this.show(next, next.preparado ? 'prepared' : 'draft')
  })
  removeFile = async (cargaId: string): Promise<void> => this.work('uploading', async (record) => {
    this.assertEditable(record)
    const next = await this.persist({ ...record, files: record.files.map((file) => file.carga_id === cargaId ? { ...file, omitted: true } : file) })
    this.show(next, next.preparado ? 'prepared' : 'draft')
  })
  private async settle(record: RegistrationDraftRecord, receipt: ReciboRegistro, operation: CommandOperation): Promise<void> {
    if (!operation.current()) return
    const removeBytes = receipt.estado === 'CONFIRMADO' || receipt.error.codigo === 'PREPARACION_CANCELADA' || Date.now() - record.creado_en >= 30 * 24 * 60 * 60 * 1000
    // Sólo un recibo terminal validado autoriza soltar bytes. No hay TTL sobre
    // una clave incierta, aunque haya pasado un mes o se cierre la sesión.
    try {
      const next = await this.persist({ ...record, terminal: receipt, files: removeBytes ? [] : record.files })
      if (operation.current()) this.show(next, receipt.estado === 'CONFIRMADO' ? 'confirmed' : 'rejected', null, receipt)
    } catch (error) {
      // El resultado remoto ya es terminal, aunque falle la limpieza local.
      // Conservar clave/bytes y recibo visible; la siguiente recuperación vuelve
      // a verificarlo sin presentar un rechazo o una ausencia de efectos.
      if (operation.current()) this.show(record, receipt.estado === 'CONFIRMADO' ? 'confirmed' : 'rejected', `Resultado confirmado por el servidor. ${errorMessage(error)}`, receipt)
    }
  }
  private async prepareRecord(record: RegistrationDraftRecord, operation: CommandOperation): Promise<RegistrationDraftRecord> {
    this.assertEditable(record)
    let next = record
    if (!next.comando_id) next = await this.persist({ ...next, comando_id: crypto.randomUUID() })
    if (!operation.current()) return next
    const result = await this.api.preparar(identity(next), operation.signal)
    if ('estado' in result) { await this.settle(next, result, operation); return this.record! }
    next = await this.persist({ ...next, preparado: true })
    this.show(next, 'prepared')
    return next
  }
  prepare = async (): Promise<void> => this.work('preparing', async (record, operation) => {
    await this.prepareRecord(record, operation)
  })
  private async syncFiles(record: RegistrationDraftRecord, operation: CommandOperation): Promise<RegistrationDraftRecord> {
    let current = record
    let listed: CargasRegistroLectura
    try {
      listed = await this.api.listarCargas(identity(current), operation.signal)
    } catch (error) {
      if (!(error instanceof ParticipacionApiError) || error.status !== 404 || error.codigo !== 'COMANDO_NO_ENCONTRADO' || current.payload || current.cancelacion_solicitada) throw error
      // El listado acredita que no existe esta preparación. Rehacerla con la
      // misma clave conserva los bytes locales y evita crear otra intención.
      current = await this.persist({ ...current, preparado: false })
      current = await this.prepareRecord(current, operation)
      if (current.terminal || !operation.current()) return current
      listed = await this.api.listarCargas(identity(current), operation.signal)
    }
    if (!operation.current()) return record
    const known = new Set(current.files.map((file) => file.carga_id))
    if (listed.data.some((carga) => !known.has(carga.carga_id))) throw new RegistrationStorageError('Hay cargas del comando que no coinciden con las fotos conservadas en este dispositivo. Recupera su resultado antes de confirmar.')
    const byId = new Map(listed.data.map((carga) => [carga.carga_id, carga]))
    return this.persist({ ...current, files: current.files.map((file) => ({ ...file, carga: byId.get(file.carga_id) ?? null, error: null })) })
  }
  upload = async (): Promise<void> => this.work('uploading', async (record, operation) => {
    this.assertEditable(record)
    let next = record.preparado ? record : await this.prepareRecord(record, operation)
    if (next.terminal || this.snapshot.receipt || !operation.current()) return
    next = await this.syncFiles(next, operation)
    if (next.terminal || this.snapshot.receipt || !operation.current()) return
    const pending = next.files.filter((file) => !file.omitted && !fileAvailable(file))
    for (let index = 0; index < pending.length; index += 2) {
      if (!operation.current()) return
      // Dos archivos independientes por tanda. El lock abarca ambas peticiones;
      // la persistencia sigue siendo serial y conserva también éxitos parciales.
      const batch = pending.slice(index, index + 2)
      const results = await Promise.allSettled(batch.map((file) => this.api.subirCarga(identity(next), file.carga_id, file.file, operation.signal)))
      if (!operation.current()) return
      let failure: unknown = null
      for (const [offset, result] of results.entries()) {
        if (!operation.current()) return
        const file = batch[offset]
        const carga = result.status === 'fulfilled' ? result.value.data : file.carga
        const error = result.status === 'rejected' ? result.reason : carga?.estado !== 'DISPONIBLE' && carga?.estado !== 'VINCULADA' ? new Error('La foto sigue pendiente de confirmación. Puedes reintentar sin volver a seleccionarla.') : null
        if (error && !(failure instanceof ParticipacionApiError && failure.status === 401)) failure = error
        next = await this.persist({ ...next, files: next.files.map((item) => item.carga_id === file.carga_id ? { ...item, carga, error: error ? errorMessage(error, true) : null } : item) })
      }
      this.show(next, 'uploading')
      if (failure) {
        if (failure instanceof ParticipacionApiError && failure.status === 401) throw failure
        // Una lectura automática resuelve respuestas perdidas sin repetir PUT.
        const errors = new Map(next.files.map((file) => [file.carga_id, file.error]))
        next = await this.syncFiles(next, operation)
        if (!operation.current()) return
        next = await this.persist({ ...next, files: next.files.map((file) => ({ ...file, error: fileAvailable(file) ? null : errors.get(file.carga_id) ?? null })) })
        if (batch.some((file) => !next.files.some((current) => current.carga_id === file.carga_id && fileAvailable(current)))) throw failure
      }
    }
    this.show(next, 'prepared')
  })
  private async recoverRecord(record: RegistrationDraftRecord, operation: CommandOperation): Promise<void> {
    if (!record.comando_id) { this.show(record, 'draft'); return }
    try { await this.settle(record, await this.api.recuperar(identity(record), operation.signal), operation) }
    catch (error) {
      if (error instanceof ParticipacionApiError && error.status === 202 && !record.payload && !record.cancelacion_solicitada) {
        const prepared = await this.persist({ ...record, preparado: true })
        const next = await this.syncFiles(prepared, operation)
        if (operation.current() && !next.terminal) this.show(next, 'prepared')
      } else if (error instanceof ParticipacionApiError && error.status === 404 && ['COMANDO_NO_ENCONTRADO', 'COMANDO_NO_CONFIRMADO'].includes(error.codigo) && error.reintento === 'MISMA_CLAVE' && !record.payload && !record.cancelacion_solicitada) {
        // El dispositivo acredita que aún no hubo POST final. 404 no prueba
        // ausencia de la preparación: permite continuar captura/repreparar
        // exclusivamente la MISMA clave, nunca una intención nueva.
        const next = await this.persist({ ...record, preparado: false })
        if (operation.current()) this.show(next, 'draft')
      } else throw error
    }
  }
  recover = async (): Promise<void> => this.work('loading', async (record, operation) => {
    await this.recoverRecord(record, operation)
  }, true)
  confirm = async (draft: RegistroConfirmDraft): Promise<void> => this.work('sending', async (record, operation) => {
    this.assertEditable(record)
    if (!record.preparado || !record.comando_id) throw new Error('Prepara y confirma la subida de fotos antes de confirmar la plantación.')
    const selected = record.files.filter((file) => !file.omitted)
    if (selected.length < 1 || selected.some((file) => !fileAvailable(file))) throw new Error('Todas las fotos seleccionadas deben estar disponibles en el servidor antes de confirmar.')
    const payload = immutablePayload(validarRegistroEntrada({ ...draft, comando_id: record.comando_id, subcampania_id: record.subcampania_id, evidencia_ids: selected.map((file) => file.carga!.evidencia_id!) }, record.actor_id))
    const next = await this.persist({ ...record, payload })
    if (!operation.current()) return
    await this.settle(next, await this.api.enviar({ ...identity(next), payload }, operation.signal), operation)
  })
  retrySame = async (): Promise<void> => this.work('sending', async (record, operation) => {
    if (!record.payload || record.cancelacion_solicitada || record.terminal) throw new Error('No hay un envío final incierto que pueda repetirse. Recupera la preparación original.')
    const payload = immutablePayload(validarRegistroEntrada(record.payload, record.actor_id))
    // Consultar primero evita otro POST cuando la respuesta se perdió después
    // del guardado. Un resultado inconcluso sólo permite repetir el contenido
    // congelado si el contrato indica MISMA_CLAVE; nunca crear otro intento.
    let recovered: ReciboRegistro | null = null
    try { recovered = await this.api.recuperar(identity(record), operation.signal) }
    catch (error) {
      if (!(error instanceof ParticipacionApiError) || error.reintento !== 'MISMA_CLAVE' || error.status === 401 || error.status === 403) throw error
    }
    if (!operation.current()) return
    if (recovered) { await this.settle(record, recovered, operation); return }
    await this.settle(record, await this.api.enviar({ ...identity(record), payload }, operation.signal), operation)
  })
  cancel = async (): Promise<boolean> => {
    let cancelled = false
    await this.work('sending', async (record, operation) => {
      if (!record.comando_id) {
        const next = await this.persist({ ...newRegistrationDraft(record.actor_id, record.subcampania_id), revision_local: record.revision_local })
        this.show(next, 'draft'); cancelled = true; return
      }
      if (record.payload && !this.snapshot.receipt) {
        // No deducir abandono de un POST incierto. Primero obtener su terminal.
        await this.recoverRecord(record, operation)
        record = this.record!
        if (!record.terminal) return
      }
      const next = await this.persist({ ...record, cancelacion_solicitada: true })
      let receipt: ReciboRegistro
      try {
        receipt = await this.api.cancelar(identity(next), operation.signal)
      } catch (error) {
        if (!(error instanceof ParticipacionApiError) || error.status !== 404 || error.codigo !== 'COMANDO_NO_ENCONTRADO' || error.reintento !== 'MISMA_CLAVE') throw error
        // Un descarte iniciado antes de que existiera la preparación se cierra
        // creando esa misma clave y descartándola. Nunca genera otra intención.
        const prepared = await this.api.preparar(identity(next), operation.signal)
        receipt = 'estado' in prepared ? prepared : await this.api.cancelar(identity(next), operation.signal)
      }
      await this.settle(next, receipt, operation)
      cancelled = receipt.estado === 'RECHAZADO'
    })
    return cancelled
  }
  newIntent = async (): Promise<void> => this.work('loading', async (record) => {
    const receipt = this.snapshot.receipt
    if (!receipt || receipt.comando_id !== record.comando_id) throw new Error('Obtén el resultado terminal original antes de preparar otra intención.')
    const rejected = receipt.estado === 'RECHAZADO' && receipt.error.codigo !== 'PREPARACION_CANCELADA'
    const fresh = newRegistrationDraft(record.actor_id, record.subcampania_id)
    const next = await this.persist({ ...fresh, revision_local: record.revision_local, comando_id: crypto.randomUUID(), draft: rejected ? { ...record.draft, step: 2, plan_revision_revisada: null } : fresh.draft, files: rejected ? record.files.filter((file) => !file.omitted).map((file) => ({ ...file, carga_id: crypto.randomUUID(), carga: null, error: null, omitted: false })) : [] })
    this.show(next, 'draft')
  })
}

export function registrationFileState(file: RegistrationFile): CargaRegistro['estado'] | 'LOCAL' { return file.carga?.estado ?? 'LOCAL' }
