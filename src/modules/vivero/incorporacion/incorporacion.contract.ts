import { exactId } from '../../accesos/accessPolicy'
import { getImageFileValidationError } from '../../../utils/imageValidation'

export type IncorporacionBase = {
  vivero_id: string
  planta_id: string
  modalidad: 'RECEPCION' | 'SALDO_INICIAL'
  procedencia: 'COMPRA' | 'DONACION' | 'PRODUCCION_PROPIA' | 'DESCONOCIDA'
  fecha_evento: string
  cantidad: number
  tercero_origen?: string
  referencia_documental?: string
  observaciones?: string
}
export type IncorporacionPayload = IncorporacionBase & { solicitud_id: string; evidencia_ids: string[] }
export type IncorporacionRecibo = {
  success: true
  estado: 'CONFIRMADO'
  data: Omit<IncorporacionBase, 'tercero_origen' | 'referencia_documental' | 'observaciones'> & {
    solicitud_id: string
    lote_vivero_id: string
    evento_incorporacion_id: string
    codigo_trazabilidad: string
    tercero_origen: string | null
    referencia_documental: string | null
    observaciones: string | null
    saldo_vivo_antes: 0
    saldo_vivo_despues: number
    evidencia_ids_vinculadas: string[]
    nombre_cientifico_snapshot: string
    nombre_comercial_snapshot: string
    variedad_snapshot: string | null
    nombre_responsable_snapshot: string | null
    registrado_en: string
  }
}
export type IncorporacionResultado = IncorporacionRecibo | { success: true; estado: 'SIN_RESULTADO'; resultado_concluyente: false }
export type FotoPendiente = {
  id: string
  bucket: 'vivero_incorporaciones'
  ruta_archivo: string
  signed_url: string
  url_expira_en_segundos: 300
  titulo?: string | null
  descripcion?: string | null
  mime_type?: string | null
  tipo_archivo?: string | null
  tamano_bytes?: number | null
  hash_sha256?: string | null
  storage_object_id?: string | null
  codigo_trazabilidad?: string | null
  tomado_en?: string | null
  creado_en?: string
  metadata?: Record<string, unknown> | null
  es_principal?: boolean
  orden?: number
  entidad_id?: string
  tipo_entidad_id?: string
  creado_por_usuario_id?: string
}
export type FotosPendientes = { success: true; data: FotoPendiente[]; evidencia_ids: string[] }

const baseKeys = ['vivero_id', 'planta_id', 'modalidad', 'procedencia', 'fecha_evento', 'cantidad', 'tercero_origen', 'referencia_documental', 'observaciones'] as const
const assert: (condition: unknown) => asserts condition = condition => {
  if (!condition) throw new Error('La incorporación no cumple el contrato. Conserva la solicitud para consultar su resultado.')
}
function object(value: unknown): Record<string, unknown> {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  return value as Record<string, unknown>
}
function text(value: unknown): string { assert(typeof value === 'string'); return value }
function nonemptyText(value: unknown): string { const result = text(value); assert(result.trim()); return result }
function nullableText(value: unknown): string | null { return value === null ? null : text(value) }
function optionalText(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined
  const result = text(value).trim().normalize('NFC')
  assert([...result].length <= max)
  return result || undefined
}
export function validarSolicitudId(value: unknown): string {
  assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
  return value.toLowerCase()
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
function ids(value: unknown, requirePhoto = true): string[] {
  assert(Array.isArray(value) && (!requirePhoto || value.length >= 1 && value.length <= 5))
  const result = value.map(exactId)
  assert(new Set(result).size === result.length)
  return result
}
function parseBase(source: Record<string, unknown>): IncorporacionBase {
  assert(source.modalidad === 'RECEPCION' || source.modalidad === 'SALDO_INICIAL')
  assert(['COMPRA', 'DONACION', 'PRODUCCION_PROPIA', 'DESCONOCIDA'].includes(String(source.procedencia)))
  assert(source.modalidad !== 'RECEPCION' || source.procedencia === 'COMPRA' || source.procedencia === 'DONACION')
  assert(typeof source.cantidad === 'number' && Number.isInteger(source.cantidad) && source.cantidad >= 1 && source.cantidad <= 2147483647)
  assert(validDate(source.fecha_evento))
  const result: IncorporacionBase = {
    vivero_id: exactId(source.vivero_id), planta_id: exactId(source.planta_id),
    modalidad: source.modalidad, procedencia: source.procedencia as IncorporacionBase['procedencia'],
    cantidad: source.cantidad, fecha_evento: source.fecha_evento,
  }
  for (const [key, limit] of [['tercero_origen', 200], ['referencia_documental', 200], ['observaciones', 1000]] as const) {
    const value = optionalText(source[key], limit)
    if (value !== undefined) result[key] = value
  }
  assert(result.procedencia !== 'DESCONOCIDA' || result.observaciones)
  return result
}
/** Estructura y reglas estables: no aplica la ventana móvil a intentos históricos. */
export function validarBase(value: unknown): IncorporacionBase {
  const source = object(value)
  assert(Object.keys(source).every(key => (baseKeys as readonly string[]).includes(key)))
  return parseBase(source)
}
export function validarPayload(value: unknown): IncorporacionPayload {
  const source = object(value)
  assert(Object.keys(source).every(key => [...baseKeys, 'solicitud_id', 'evidencia_ids'].includes(key)))
  return { ...parseBase(source), solicitud_id: validarSolicitudId(source.solicitud_id), evidencia_ids: ids(source.evidencia_ids) }
}
export function rangoIncorporacion(now = new Date()): { min: string; max: string } {
  assert(Number.isFinite(now.getTime()))
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (name: string) => parts.find(item => item.type === name)!.value
  const max = `${part('year')}-${part('month')}-${part('day')}`
  const min = new Date(Date.parse(`${max}T00:00:00Z`) - 10 * 86400000).toISOString().slice(0, 10)
  return { min, max }
}
export function validarFechaOperativa(value: unknown, now = new Date()): boolean {
  if (!validDate(value)) return false
  const { min, max } = rangoIncorporacion(now)
  return value >= min && value <= max
}
export function errorFotoIncorporacion(file: File): string | null {
  if (file.size <= 0) return 'La foto está vacía. Selecciona otro archivo.'
  if (file.size > 15 * 1024 * 1024) return 'Cada foto debe pesar como máximo 15 MiB.'
  return getImageFileValidationError(file)
}
export function validarRecibo(value: unknown, expected?: IncorporacionPayload): IncorporacionRecibo {
  const source = object(value)
  assert(source.success === true && source.estado === 'CONFIRMADO')
  const data = object(source.data)
  const base = parseBase(data)
  const solicitud = validarSolicitudId(data.solicitud_id)
  const evidencias = ids(data.evidencia_ids_vinculadas)
  assert(data.saldo_vivo_antes === 0 && data.saldo_vivo_despues === base.cantidad)
  assert(typeof data.registrado_en === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(data.registrado_en) && /(?:Z|[+-]\d{2}:\d{2})$/.test(data.registrado_en) && Number.isFinite(Date.parse(data.registrado_en)))
  // Los nulos pertenecen al recibo histórico; no se rellenan desde el catálogo.
  const tercero = nullableText(data.tercero_origen)
  const referencia = nullableText(data.referencia_documental)
  const observaciones = nullableText(data.observaciones)
  if (expected) {
    const payload = validarPayload(expected)
    assert(payload.solicitud_id === solicitud)
    for (const key of baseKeys) assert((payload[key] ?? null) === (base[key] ?? null))
    assert(evidencias.length === payload.evidencia_ids.length && evidencias.every(id => payload.evidencia_ids.includes(id)))
  }
  return { success: true, estado: 'CONFIRMADO', data: {
    ...base, solicitud_id: solicitud,
    lote_vivero_id: exactId(data.lote_vivero_id), evento_incorporacion_id: exactId(data.evento_incorporacion_id),
    codigo_trazabilidad: nonemptyText(data.codigo_trazabilidad),
    tercero_origen: tercero, referencia_documental: referencia, observaciones,
    saldo_vivo_antes: 0, saldo_vivo_despues: base.cantidad, evidencia_ids_vinculadas: evidencias,
    nombre_cientifico_snapshot: nonemptyText(data.nombre_cientifico_snapshot), nombre_comercial_snapshot: nonemptyText(data.nombre_comercial_snapshot),
    variedad_snapshot: nullableText(data.variedad_snapshot), nombre_responsable_snapshot: nullableText(data.nombre_responsable_snapshot),
    registrado_en: data.registrado_en,
  } }
}
export function validarFotosPendientes(value: unknown): FotosPendientes {
  const source = object(value)
  assert(source.success === true && Array.isArray(source.data))
  const evidenceIds = ids(source.evidencia_ids, false)
  const data: FotoPendiente[] = source.data.map(value => {
    const photo = object(value)
    assert(photo.bucket === 'vivero_incorporaciones' && photo.url_expira_en_segundos === 300)
    const signedUrl = nonemptyText(photo.signed_url)
    assert(['https:', 'http:'].includes(new URL(signedUrl).protocol))
    const result: FotoPendiente = { id: exactId(photo.id), bucket: 'vivero_incorporaciones', ruta_archivo: nonemptyText(photo.ruta_archivo), signed_url: signedUrl, url_expira_en_segundos: 300 }
    for (const key of ['titulo', 'descripcion', 'mime_type', 'tipo_archivo', 'hash_sha256', 'storage_object_id', 'codigo_trazabilidad', 'tomado_en'] as const) {
      if (Object.hasOwn(photo, key)) result[key] = nullableText(photo[key])
    }
    if (Object.hasOwn(photo, 'creado_en')) result.creado_en = text(photo.creado_en)
    if (Object.hasOwn(photo, 'tamano_bytes')) {
      assert(photo.tamano_bytes === null || typeof photo.tamano_bytes === 'number' && Number.isSafeInteger(photo.tamano_bytes) && photo.tamano_bytes >= 1 && photo.tamano_bytes <= 15 * 1024 * 1024)
      result.tamano_bytes = photo.tamano_bytes
    }
    if (Object.hasOwn(photo, 'es_principal')) { assert(typeof photo.es_principal === 'boolean'); result.es_principal = photo.es_principal }
    if (Object.hasOwn(photo, 'orden')) { assert(typeof photo.orden === 'number' && Number.isSafeInteger(photo.orden) && photo.orden >= 0); result.orden = photo.orden }
    if (Object.hasOwn(photo, 'metadata')) result.metadata = photo.metadata === null ? null : object(photo.metadata)
    for (const key of ['tipo_entidad_id', 'creado_por_usuario_id'] as const) if (Object.hasOwn(photo, key)) result[key] = exactId(photo[key])
    if (Object.hasOwn(photo, 'entidad_id')) { assert(photo.entidad_id === 0 || photo.entidad_id === '0'); result.entidad_id = '0' }
    return result
  })
  assert(data.length === evidenceIds.length && new Set(data.map(photo => photo.id)).size === data.length && data.every(photo => evidenceIds.includes(photo.id)))
  return { success: true, data, evidencia_ids: evidenceIds }
}
