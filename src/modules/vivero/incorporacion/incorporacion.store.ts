import { exactId } from '../../accesos/accessPolicy'
import { withPrivateCommandLock } from '../../participacion/commands/commandLifecycle'
import {
  errorFotoIncorporacion, validarBase, validarPayload, validarRecibo, validarSolicitudId,
  type IncorporacionBase, type IncorporacionPayload, type IncorporacionRecibo,
} from './incorporacion.contract'

/** Estados de este dispositivo; no son estados persistidos por el backend. */
export type FaseIncorporacion = 'FOTOS_POR_CARGAR' | 'FOTOS_POR_CONSULTAR' | 'LISTO_PARA_CONFIRMAR' | 'ALTA_POR_CONSULTAR' | 'CONFIRMADO'
export type IntentoIncorporacion = {
  version: 1
  actor_id: string
  solicitud_id: string
  base: IncorporacionBase
  labels: { vivero: string; planta: string; responsable: string }
  files: File[]
  evidencia_ids: string[]
  fase: FaseIncorporacion
  recibo: IncorporacionRecibo | null
  revision: number
}
export interface IncorporacionStorage {
  read(actor: string): Promise<unknown | null>
  write(record: IntentoIncorporacion): Promise<void>
  delete(actor: string): Promise<void>
}
export class IncorporacionStorageError extends Error {
  constructor(message = 'No se pudo conservar o recuperar la incorporación de esta cuenta. Recupera el almacenamiento antes de enviar otra operación.', cause?: unknown) {
    super(message, { cause }); this.name = 'IncorporacionStorageError'
  }
}
export class IncorporacionChangedError extends IncorporacionStorageError {
  constructor() { super('La incorporación cambió en otra pestaña. Vuelve a consultar el intento conservado antes de continuar.'); this.name = 'IncorporacionChangedError' }
}

const STORE = 'intentos'
const DATABASE = 'r3foresta-vivero-t5'
let database: Promise<IDBDatabase> | null = null
function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new IncorporacionStorageError('Este navegador no permite conservar las fotos de forma privada. La incorporación no se ha enviado.'))
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'actor_id' }) }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); database = null }
      resolve(db)
    }
    request.onerror = () => { database = null; reject(new IncorporacionStorageError(undefined, request.error)) }
    request.onblocked = () => { database = null; reject(new IncorporacionStorageError('Cierra las otras pestañas para recuperar el almacenamiento privado.')) }
  })
  const opening = database
  return opening.catch((error: unknown) => {
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
      // La petición aislada no acredita persistencia: esperar a toda la transacción.
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error ?? request.error)
      tx.onabort = () => reject(tx.error ?? request.error)
    })
  } catch (error) { throw new IncorporacionStorageError(undefined, error) }
}
export const indexedIncorporacionStorage: IncorporacionStorage = {
  read: async actor => (await transaction('readonly', store => store.get(exactId(actor)))) ?? null,
  write: async record => { await transaction('readwrite', store => store.put(record)) },
  delete: async actor => { await transaction('readwrite', store => store.delete(exactId(actor))) },
}

export const INCORPORACION_CHANGED = 'r3foresta:incorporacion-changed'
export const incorporacionSignalKey = (actor: string) => `r3foresta:vivero:t5:cambio:${exactId(actor)}`
export const incorporacionLockKey = (actor: string) => `r3foresta:vivero:t5:intento:${exactId(actor)}`
export function withIncorporacionLock<T>(actor: string, callback: () => Promise<T> | T): Promise<T> {
  return withPrivateCommandLock(incorporacionLockKey(actor), callback)
}
function notify(actor: string, revision: number): void {
  // Sólo una señal numérica; nunca intención, archivos, Bearer o firmas.
  try { localStorage.setItem(incorporacionSignalKey(actor), String(revision)) } catch { /* IDB ya confirmó; la señal auxiliar no cambia el resultado. */ }
  window.dispatchEvent(new CustomEvent(INCORPORACION_CHANGED, { detail: { actor_id: actor, revision } }))
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))
}
function invalid(): never { throw new IncorporacionStorageError('El intento conservado tiene un formato incompatible. Conserva el dispositivo y recupera sus datos antes de enviar otra incorporación.') }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !(value instanceof File)) {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
export function payloadIntento(record: IntentoIncorporacion): IncorporacionPayload {
  return validarPayload({ ...record.base, solicitud_id: record.solicitud_id, evidencia_ids: record.evidencia_ids })
}
function validate(value: unknown, actor: string): IntentoIncorporacion {
  if (!object(value) || !exactKeys(value, ['version', 'actor_id', 'solicitud_id', 'base', 'labels', 'files', 'evidencia_ids', 'fase', 'recibo', 'revision']) || value.version !== 1 || value.actor_id !== exactId(actor) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !['FOTOS_POR_CARGAR', 'FOTOS_POR_CONSULTAR', 'LISTO_PARA_CONFIRMAR', 'ALTA_POR_CONSULTAR', 'CONFIRMADO'].includes(String(value.fase))) invalid()
  if (!object(value.labels) || !exactKeys(value.labels, ['vivero', 'planta', 'responsable']) || Object.values(value.labels).some(label => typeof label !== 'string')) invalid()
  if (!Array.isArray(value.files) || value.files.length > 5 || value.files.some(file => !(file instanceof File) || errorFotoIncorporacion(file)) || value.files.length < 1 && value.fase !== 'CONFIRMADO') invalid()
  if (!Array.isArray(value.evidencia_ids) || value.evidencia_ids.length > 5) invalid()
  const evidencia_ids = value.evidencia_ids.map(exactId)
  if (new Set(evidencia_ids).size !== evidencia_ids.length) invalid()
  const result: IntentoIncorporacion = {
    version: 1, actor_id: exactId(actor), solicitud_id: validarSolicitudId(value.solicitud_id), base: validarBase(value.base),
    labels: { vivero: String(value.labels.vivero), planta: String(value.labels.planta), responsable: String(value.labels.responsable) },
    files: [...value.files] as File[], evidencia_ids, fase: value.fase as FaseIncorporacion, recibo: null, revision: Number(value.revision),
  }
  if (['LISTO_PARA_CONFIRMAR', 'ALTA_POR_CONSULTAR', 'CONFIRMADO'].includes(result.fase)) payloadIntento(result)
  if (['FOTOS_POR_CARGAR', 'FOTOS_POR_CONSULTAR'].includes(result.fase) && result.evidencia_ids.length) invalid()
  if (result.fase !== 'CONFIRMADO' && result.evidencia_ids.length && result.evidencia_ids.length !== result.files.length) invalid()
  if (result.fase === 'CONFIRMADO') result.recibo = validarRecibo(value.recibo, payloadIntento(result))
  else if (value.recibo !== null) invalid()
  return freeze(result)
}
export async function leerIntento(actor: string, storage: IncorporacionStorage = indexedIncorporacionStorage): Promise<IntentoIncorporacion | null> {
  try {
    const value = await storage.read(exactId(actor))
    return value === null ? null : validate(value, actor)
  } catch (error) {
    if (error instanceof IncorporacionStorageError) throw error
    throw new IncorporacionStorageError(undefined, error)
  }
}
const canonical = (value: object) => JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
function sameIds(left: string[], right: string[]): boolean { return left.length === right.length && left.every((id, index) => id === right[index]) }
async function bytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') return new Uint8Array(await file.arrayBuffer())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
async function sameFiles(left: File[], right: File[]): Promise<boolean> {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index], b = right[index]
    if (a.name !== b.name || a.type !== b.type || a.size !== b.size || a.lastModified !== b.lastModified) return false
    const [aBytes, bBytes] = await Promise.all([bytes(a), bytes(b)])
    if (aBytes.length !== bBytes.length || aBytes.some((byte, offset) => byte !== bBytes[offset])) return false
  }
  return true
}
function assertIdentity(stored: IntentoIncorporacion | null, record: IntentoIncorporacion): asserts stored is IntentoIncorporacion {
  if (!stored || stored.actor_id !== record.actor_id || stored.solicitud_id !== record.solicitud_id || stored.revision !== record.revision) throw new IncorporacionChangedError()
}
/** Llamar dentro de withIncorporacionLock; el controller conserva ese lock durante el trabajo. */
export async function guardarIntento(record: IntentoIncorporacion, storage: IncorporacionStorage = indexedIncorporacionStorage): Promise<IntentoIncorporacion> {
  try {
    const valid = validate(record, record.actor_id)
    const stored = await leerIntento(valid.actor_id, storage)
    if (!stored) {
      if (valid.revision !== 0) throw new IncorporacionChangedError()
    } else {
      assertIdentity(stored, valid)
      if (canonical(stored.base) !== canonical(valid.base) || canonical(stored.labels) !== canonical(valid.labels)) throw new IncorporacionChangedError()
      // Sólo la confirmación permite soltar bytes; hasta entonces son los originales.
      if (!(valid.fase === 'CONFIRMADO' && valid.files.length === 0) && !await sameFiles(stored.files, valid.files)) throw new IncorporacionChangedError()
      if (stored.evidencia_ids.length > 0 && !sameIds(stored.evidencia_ids, valid.evidencia_ids)) throw new IncorporacionChangedError()
      if (stored.fase === 'CONFIRMADO' && valid.fase !== 'CONFIRMADO' || stored.fase === 'ALTA_POR_CONSULTAR' && !['ALTA_POR_CONSULTAR', 'CONFIRMADO'].includes(valid.fase)) throw new IncorporacionChangedError()
    }
    const next = validate({ ...valid, revision: valid.revision + 1 }, valid.actor_id)
    await storage.write(next)
    const persisted = await leerIntento(next.actor_id, storage)
    if (!persisted || persisted.solicitud_id !== next.solicitud_id || persisted.revision !== next.revision || canonical(persisted.base) !== canonical(next.base) || persisted.fase !== next.fase || !sameIds(persisted.evidencia_ids, next.evidencia_ids) || !await sameFiles(persisted.files, next.files)) throw new IncorporacionStorageError('No se pudo comprobar la conservación de la incorporación. Consulta el intento de este dispositivo antes de continuar.')
    notify(next.actor_id, next.revision)
    return persisted
  } catch (error) {
    if (error instanceof IncorporacionStorageError) throw error
    throw new IncorporacionStorageError(undefined, error)
  }
}
async function remove(record: IntentoIncorporacion, confirmed: boolean, storage: IncorporacionStorage): Promise<void> {
  const valid = validate(record, record.actor_id)
  const stored = await leerIntento(valid.actor_id, storage)
  assertIdentity(stored, valid)
  if (canonical(stored.base) !== canonical(valid.base) || !sameIds(stored.evidencia_ids, valid.evidencia_ids)) throw new IncorporacionChangedError()
  if (confirmed) {
    if (valid.fase !== 'CONFIRMADO' || stored.fase !== 'CONFIRMADO' || !valid.recibo || !stored.recibo) throw new IncorporacionStorageError('Sólo una incorporación confirmada puede liberar este intento. Consulta su resultado con la cuenta original.')
    validarRecibo(stored.recibo, payloadIntento(stored))
    validarRecibo(valid.recibo, payloadIntento(valid))
  } else if (['ALTA_POR_CONSULTAR', 'CONFIRMADO'].includes(valid.fase) || ['ALTA_POR_CONSULTAR', 'CONFIRMADO'].includes(stored.fase)) {
    throw new IncorporacionStorageError('El alta ya pudo enviarse. Conserva la misma solicitud e intención para consultar su resultado.')
  }
  await storage.delete(valid.actor_id)
  if (await storage.read(valid.actor_id) !== null) throw new IncorporacionStorageError('No se pudo liberar el intento local. Conserva su solicitud y vuelve a consultar.')
  notify(valid.actor_id, valid.revision + 1)
}
/** Sólo después de mostrar y reconocer el recibo validado; ejecutar bajo el lock del actor. */
export async function liberarConfirmado(record: IntentoIncorporacion, storage: IncorporacionStorage = indexedIncorporacionStorage): Promise<void> {
  try { await remove(record, true, storage) } catch (error) {
    if (error instanceof IncorporacionStorageError) throw error
    throw new IncorporacionStorageError('La incorporación está confirmada, pero no se pudo liberar este dispositivo. Recupera el mismo resultado.', error)
  }
}
/** Descarta únicamente la preparación LOCAL antes de cualquier posible POST de alta; no borra fotos remotas. */
export async function descartarPreparacion(record: IntentoIncorporacion, storage: IncorporacionStorage = indexedIncorporacionStorage): Promise<void> {
  try { await remove(record, false, storage) } catch (error) {
    if (error instanceof IncorporacionStorageError) throw error
    throw new IncorporacionStorageError('No se pudo descartar la preparación de este dispositivo. Conserva los datos y vuelve a consultar.', error)
  }
}
