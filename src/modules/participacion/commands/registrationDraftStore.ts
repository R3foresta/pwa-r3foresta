import { validarId, validarRevision } from '../api/participacion.contract'
import { validarCargaRegistro, validarReciboRegistro, validarRegistroComandoId, validarRegistroEntrada } from '../api/registro.contract'
import type { CargaRegistro, RegistroInicialEntrada, ReciboRegistro } from '../registroTypes'
import type { PersonaMinima } from '../types'
import { withPrivateCommandLock } from './commandLifecycle'

export type RegistroDraft = {
  fecha_plantacion: string
  latitud: number | null
  longitud: number | null
  especies: RegistroInicialEntrada['especies']
  coresponsable_ids: string[]
  observaciones: string | null
  afiliaciones_declaradas?: RegistroInicialEntrada['afiliaciones_declaradas']
  gps_confirmado: boolean
  step: 1 | 2 | 3
  plan_revision_revisada: string | null
  participantes_ui?: PersonaMinima[]
}
export type RegistrationFile = { carga_id: string; file: File; carga: CargaRegistro | null; error: string | null; omitted: boolean }
export type RegistrationDraftRecord = {
  version: 1
  key: string
  actor_id: string
  subcampania_id: string
  comando_id: string | null
  revision_local: number
  creado_en: number
  actualizado_en: number
  draft: RegistroDraft
  files: RegistrationFile[]
  payload: RegistroInicialEntrada | null
  preparado: boolean
  cancelacion_solicitada: boolean
  terminal: ReciboRegistro | null
}
export type RegistrationDraftSummary = Pick<RegistrationDraftRecord, 'subcampania_id' | 'comando_id' | 'actualizado_en' | 'revision_local'> & { estado: 'BORRADOR' | 'PREPARADO' | 'RESULTADO_NO_CONFIRMADO' | 'DESCARTE_PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'DESCARTADO' }

// El adaptador puede inyectarse en pruebas; producción siempre usa transacciones
// IndexedDB completas, incluidas las fotos, antes de iniciar una petición.
export interface RegistrationStorage {
  read(key: string): Promise<unknown | null>
  write(record: RegistrationDraftRecord): Promise<void>
  delete(key: string): Promise<void>
  list(actorId: string): Promise<unknown[]>
}
export class RegistrationStorageError extends Error {
  constructor(message = 'No se pudo conservar o recuperar el borrador privado. No se enviará la operación hasta resolver el almacenamiento.', cause?: unknown) {
    super(message, { cause }); this.name = 'RegistrationStorageError'
  }
}
export class RegistrationChangedError extends RegistrationStorageError {
  constructor() { super('El borrador cambió en otra pestaña. Recupera su estado antes de volver a revisar.'); this.name = 'RegistrationChangedError' }
}

const STORE = 'registro_commands'
export const REGISTRATION_CHANGED = 'r3foresta:registration-draft-changed'
let database: Promise<IDBDatabase> | null = null
function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new RegistrationStorageError('Este navegador no ofrece almacenamiento privado de fotos. La operación no se ha enviado.'))
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('r3foresta-participacion', 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' })
      store.createIndex('actor_id', 'actor_id', { unique: false })
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); database = null }
      resolve(db)
    }
    request.onerror = () => { database = null; reject(new RegistrationStorageError(undefined, request.error)) }
    request.onblocked = () => { database = null; reject(new RegistrationStorageError('Cierra las otras pestañas para actualizar el almacenamiento privado.')) }
  })
  const opening = database
  return opening.catch((error: unknown) => {
    // open() también puede lanzar síncronamente (permisos/privacidad). No
    // conservar una promesa fallida: volver a comprobar debe poder recuperarse.
    if (database === opening) database = null
    throw error
  })
}
async function transaction<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  try {
    const db = await openDatabase()
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = execute(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error ?? request.error)
      tx.onabort = () => reject(tx.error ?? request.error)
    })
  } catch (error) { throw new RegistrationStorageError(undefined, error) }
}
export const indexedRegistrationStorage: RegistrationStorage = {
  read: async (key) => (await transaction('readonly', (store) => store.get(key))) ?? null,
  write: async (record) => { await transaction('readwrite', (store) => store.put(record)) },
  delete: async (key) => { await transaction('readwrite', (store) => store.delete(key)) },
  list: (actorId) => transaction('readonly', (store) => store.index('actor_id').getAll(IDBKeyRange.only(actorId))),
}

export function registrationDraftKey(actorId: string, scopeId: string): string { return `${validarId(actorId)}:${validarId(scopeId)}` }
export function registrationLockKey(actorId: string, scopeId: string): string { return `r3foresta:participacion:registro:v1:${registrationDraftKey(actorId, scopeId)}` }
export function emptyRegistrationDraft(): RegistroDraft {
  return { fecha_plantacion: '', latitud: null, longitud: null, especies: [], coresponsable_ids: [], observaciones: null, gps_confirmado: false, step: 1, plan_revision_revisada: null }
}
export function newRegistrationDraft(actorId: string, scopeId: string): RegistrationDraftRecord {
  return { version: 1, key: registrationDraftKey(actorId, scopeId), actor_id: actorId, subcampania_id: scopeId, comando_id: null, revision_local: 0, creado_en: Date.now(), actualizado_en: Date.now(), draft: emptyRegistrationDraft(), files: [], payload: null, preparado: false, cancelacion_solicitada: false, terminal: null }
}
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export function validateRegistrationDraft(value: unknown, actorId: string, scopeId: string): RegistrationDraftRecord {
  if (!isObject(value) || value.version !== 1 || value.key !== registrationDraftKey(actorId, scopeId) || value.actor_id !== actorId || value.subcampania_id !== scopeId || !Number.isSafeInteger(value.revision_local) || Number(value.revision_local) < 0 || typeof value.creado_en !== 'number' || typeof value.actualizado_en !== 'number' || !Number.isFinite(value.creado_en) || !Number.isFinite(value.actualizado_en) || !isObject(value.draft) || !Array.isArray(value.files) || value.files.length > 10 || typeof value.preparado !== 'boolean' || typeof value.cancelacion_solicitada !== 'boolean') throw new RegistrationStorageError('El borrador privado guardado tiene un formato incompatible. Conserva el dispositivo y recupera su almacenamiento antes de enviar otra acción.')
  const draft = value.draft
  const allowed = ['fecha_plantacion', 'latitud', 'longitud', 'especies', 'coresponsable_ids', 'observaciones', 'gps_confirmado', 'step', 'plan_revision_revisada', 'afiliaciones_declaradas', 'participantes_ui']
  const coordinate = (item: unknown) => item === null || typeof item === 'number' && Number.isFinite(item)
  if (Object.keys(draft).some((key) => !allowed.includes(key)) || typeof draft.fecha_plantacion !== 'string' || !coordinate(draft.latitud) || !coordinate(draft.longitud) || !Array.isArray(draft.especies) || draft.especies.length > 100 || !Array.isArray(draft.coresponsable_ids) || draft.coresponsable_ids.length > 100 || typeof draft.step !== 'number' || ![1, 2, 3].includes(draft.step) || typeof draft.gps_confirmado !== 'boolean' || draft.observaciones !== null && typeof draft.observaciones !== 'string' || draft.plan_revision_revisada !== null && typeof draft.plan_revision_revisada !== 'string') throw new RegistrationStorageError()
  const speciesIds = new Set<string>()
  for (const species of draft.especies) {
    if (!isObject(species) || Object.keys(species).length !== 2 || !Object.hasOwn(species, 'planta_id') || !Object.hasOwn(species, 'cantidad') || typeof species.cantidad !== 'number' || !Number.isFinite(species.cantidad)) throw new RegistrationStorageError()
    const id = validarId(species.planta_id)
    if (speciesIds.has(id)) throw new RegistrationStorageError()
    speciesIds.add(id)
  }
  const participantIds = draft.coresponsable_ids.map((id: unknown) => validarId(id))
  if (new Set(participantIds).size !== participantIds.length) throw new RegistrationStorageError()
  if (draft.plan_revision_revisada !== null) validarRevision(draft.plan_revision_revisada)
  if (draft.participantes_ui !== undefined) {
    if (!Array.isArray(draft.participantes_ui) || draft.participantes_ui.length > 100) throw new RegistrationStorageError()
    const ids = new Set<string>()
    for (const person of draft.participantes_ui) {
      if (!isObject(person) || Object.keys(person).length !== 3 || !['usuario_id', 'nombre', 'organizacion'].every((key) => Object.hasOwn(person, key)) || typeof person.usuario_id !== 'string' || !draft.coresponsable_ids.includes(person.usuario_id) || ids.has(person.usuario_id) || typeof person.nombre !== 'string' || !person.nombre.trim() || person.organizacion !== null && typeof person.organizacion !== 'string') throw new RegistrationStorageError()
      validarId(person.usuario_id); ids.add(person.usuario_id)
    }
  }
  if (value.comando_id !== null && (typeof value.comando_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.comando_id))) throw new RegistrationStorageError()
  for (const photo of value.files) {
    if (!isObject(photo) || typeof photo.carga_id !== 'string' || !(photo.file instanceof File) || typeof photo.omitted !== 'boolean' || photo.error !== null && typeof photo.error !== 'string' || photo.carga !== null && (!isObject(photo.carga) || photo.carga.carga_id !== photo.carga_id)) throw new RegistrationStorageError()
    validarRegistroComandoId(photo.carga_id)
    if (photo.carga) validarCargaRegistro({ data: photo.carga, observado_en: new Date().toISOString() }, photo.carga_id)
  }
  if (value.payload !== null && (!isObject(value.payload) || value.payload.comando_id !== value.comando_id || value.payload.subcampania_id !== scopeId)) throw new RegistrationStorageError()
  if (value.payload) validarRegistroEntrada(value.payload, actorId)
  if (value.terminal !== null && (!isObject(value.terminal) || value.terminal.comando_id !== value.comando_id || value.terminal.operacion !== 'REGISTRAR_PLANTACION_INICIAL' || !['CONFIRMADO', 'RECHAZADO'].includes(String(value.terminal.estado)))) throw new RegistrationStorageError()
  if (value.terminal) validarReciboRegistro(value.terminal, { actor_id: actorId, subcampania_id: scopeId, comando_id: String(value.comando_id), ...(value.payload ? { payload: value.payload as RegistroInicialEntrada } : {}) })
  return value as RegistrationDraftRecord
}
export async function readRegistrationDraft(actorId: string, scopeId: string, storage = indexedRegistrationStorage): Promise<RegistrationDraftRecord | null> {
  const value = await storage.read(registrationDraftKey(actorId, scopeId))
  return value === null ? null : validateRegistrationDraft(value, actorId, scopeId)
}
export function notifyRegistrationChange(actorId: string, scopeId: string): void {
  window.dispatchEvent(new CustomEvent(REGISTRATION_CHANGED, { detail: { actorId, scopeId } }))
}
export async function saveRegistrationDraft(record: RegistrationDraftRecord, storage = indexedRegistrationStorage): Promise<RegistrationDraftRecord> {
  const next = { ...record, revision_local: record.revision_local + 1, actualizado_en: Date.now() }
  validateRegistrationDraft(next, record.actor_id, record.subcampania_id)
  await storage.write(next)
  notifyRegistrationChange(record.actor_id, record.subcampania_id)
  return next
}
export async function deleteRegistrationDraft(actorId: string, scopeId: string, storage = indexedRegistrationStorage): Promise<void> {
  try { await storage.delete(registrationDraftKey(actorId, scopeId)) }
  catch (error) { throw new RegistrationStorageError('No se pudo eliminar la captura de este dispositivo. Reintenta la limpieza local.', error) }
  notifyRegistrationChange(actorId, scopeId)
}
export async function listRegistrationDrafts(actorId: string, storage = indexedRegistrationStorage): Promise<RegistrationDraftSummary[]> {
  validarId(actorId)
  const values = await storage.list(actorId)
  return values.map((value) => {
    if (!isObject(value) || typeof value.subcampania_id !== 'string') throw new RegistrationStorageError()
    const record = validateRegistrationDraft(value, actorId, value.subcampania_id)
    return { subcampania_id: record.subcampania_id, comando_id: record.comando_id, actualizado_en: record.actualizado_en, revision_local: record.revision_local, estado: record.terminal?.estado === 'RECHAZADO' && record.terminal.error.codigo === 'PREPARACION_CANCELADA' ? 'DESCARTADO' : record.terminal?.estado ?? (record.cancelacion_solicitada ? 'DESCARTE_PENDIENTE' : record.payload ? 'RESULTADO_NO_CONFIRMADO' : record.comando_id ? 'PREPARADO' : 'BORRADOR') }
  })
}
export async function withRegistrationLock<T>(actorId: string, scopeId: string, callback: () => Promise<T> | T): Promise<T> {
  return withPrivateCommandLock(registrationLockKey(actorId, scopeId), callback)
}
