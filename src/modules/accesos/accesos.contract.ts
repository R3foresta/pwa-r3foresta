import { ParticipacionContratoError, validarErrorEstable, validarId, validarRevision } from '../participacion/api/participacion.contract'
import { ROLES_GLOBALES } from '../usuarios/types'
import type { AccesoM1, AccesoM2, DominioAcceso, HistorialAcceso, IntentoAcceso, LecturaAcceso, ReciboAcceso } from './types'

export function fail(): never { throw new ParticipacionContratoError('La respuesta no corresponde al acceso solicitado. Consulta nuevamente; no se confirmó otro permiso.') }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
export function row(value: unknown, keys: string[]): Record<string, unknown> {
  const result = object(value)
  if (Object.keys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key))) return fail()
  return result
}
export function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return fail(); return value }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value }
function instant(value: unknown): string {
  const result = text(value)
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result) || !Number.isFinite(Date.parse(result))) return fail()
  return result
}
function uuid(value: unknown): string {
  const result = text(value)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result)) return fail()
  return result
}
function flags<K extends string>(value: unknown, keys: K[]): Record<K, boolean> {
  const result = row(value, keys)
  return Object.fromEntries(keys.map(key => [key, bool(result[key])])) as Record<K, boolean>
}
function common(input: Record<string, unknown>, usuarioId: string, domain: DominioAcceso) {
  const usuario_id = validarId(input.usuario_id)
  if (usuario_id !== validarId(usuarioId) || !ROLES_GLOBALES.includes(input.rol_global as AccesoM1['rol_global'])) return fail()
  if (!Array.isArray(input.historial) || input.historial.length > 50) return fail()
  let previous: bigint | null = null
  const historial = input.historial.map((value): HistorialAcceso => {
    const item = row(value, ['id', ...(domain === 'M2' ? ['vivero_id'] : []), 'evento', 'acceso_id', 'actor_id', 'revision_anterior', 'revision_nueva', 'motivo', 'creado_en', 'comando_id', 'otorgado_en', 'revocado_en'])
    const id = validarId(item.id)
    const revision_anterior = validarRevision(item.revision_anterior), revision_nueva = validarRevision(item.revision_nueva)
    if (previous !== null && BigInt(id) >= previous || BigInt(revision_nueva) !== BigInt(revision_anterior) + 1n || !['ACCESO_OTORGADO', 'ACCESO_RETIRADO'].includes(text(item.evento))) return fail()
    previous = BigInt(id)
    return { id, ...(domain === 'M2' ? { vivero_id: validarId(item.vivero_id) } : {}), evento: item.evento as HistorialAcceso['evento'], acceso_id: validarId(item.acceso_id), actor_id: validarId(item.actor_id), revision_anterior, revision_nueva, motivo: text(item.motivo), creado_en: instant(item.creado_en), comando_id: uuid(item.comando_id), otorgado_en: instant(item.otorgado_en), revocado_en: item.revocado_en === null ? null : instant(item.revocado_en) }
  })
  const cursor = input.siguiente_antes_de_id === null ? null : validarId(input.siguiente_antes_de_id)
  if (cursor && (!historial.length || cursor !== historial.at(-1)?.id)) return fail()
  return { usuario_id, rol_global: input.rol_global as AccesoM1['rol_global'], activo: bool(input.activo), revision_acceso: validarRevision(input.revision_acceso), revision_autoridad: validarRevision(input.revision_autoridad), historial, siguiente_antes_de_id: cursor }
}
const COMMON = ['usuario_id', 'rol_global', 'activo', 'revision_acceso', 'revision_autoridad', 'historial', 'siguiente_antes_de_id']
export function validarM1(value: unknown, user: string): LecturaAcceso<AccesoM1> {
  const envelope = row(value, ['data', 'observado_en'])
  const input = row(envelope.data, [...COMMON, 'acceso_explicito', 'acceso_efectivo', 'origen', 'capacidades', 'vigencia_actual'])
  const cuenta = common(input, user, 'M1')
  const capacidades = flags(input.capacidades, ['crear', 'mantener_propias', 'confirmar_propias', 'desechar'])
  if (capacidades.confirmar_propias !== false || !['ADMIN', 'EXPLICITO', 'SIN_ACCESO'].includes(text(input.origen))) return fail()
  const vigencia = input.vigencia_actual === null ? null : row(input.vigencia_actual, ['id', 'otorgado_en', 'otorgado_por'])
  return { data: { ...cuenta, acceso_explicito: bool(input.acceso_explicito), acceso_efectivo: bool(input.acceso_efectivo), origen: input.origen as AccesoM1['origen'], capacidades: { ...capacidades, confirmar_propias: false }, vigencia_actual: vigencia ? { id: validarId(vigencia.id), otorgado_en: instant(vigencia.otorgado_en), otorgado_por: validarId(vigencia.otorgado_por) } : null }, observado_en: instant(envelope.observado_en) }
}
export function validarM2(value: unknown, user: string): LecturaAcceso<AccesoM2> {
  const envelope = row(value, ['data', 'observado_en'])
  const input = row(envelope.data, [...COMMON, 'alcance_global', 'viveros', 'capacidades_globales'])
  const cuenta = common(input, user, 'M2')
  if (!Array.isArray(input.viveros)) return fail()
  const ids = new Set<string>()
  const viveros = input.viveros.map(value => {
    const item = row(value, ['id', 'vivero_id', 'otorgado_en', 'otorgado_por', 'acceso_efectivo', 'capacidades'])
    const vivero_id = validarId(item.vivero_id)
    if (ids.has(vivero_id)) return fail()
    ids.add(vivero_id)
    return { id: validarId(item.id), vivero_id, otorgado_en: instant(item.otorgado_en), otorgado_por: validarId(item.otorgado_por), acceso_efectivo: bool(item.acceso_efectivo), capacidades: flags(item.capacidades, ['operar', 'consultar_material', 'desechar_semillas', 'recibir_y_validar']) }
  })
  return { data: { ...cuenta, alcance_global: bool(input.alcance_global), viveros, capacidades_globales: flags(input.capacidades_globales, ['administrar', 'operar_cualquier_vivero', 'desechar_semillas_cualquier_vivero', 'recibir_y_validar_cualquier_vivero']) }, observado_en: instant(envelope.observado_en) }
}
export function validarIntentoAcceso(value: unknown): IntentoAcceso {
  const input = row(value, ['actor_id', 'dominio', 'operacion', 'usuario_id', 'payload'])
  if (input.dominio !== 'M1' && input.dominio !== 'M2') return fail()
  const suffix = input.dominio === 'M1' ? 'RECOLECCION' : 'VIVERO'
  if (![ `OTORGAR_ACCESO_${suffix}`, `RETIRAR_ACCESO_${suffix}` ].includes(text(input.operacion))) return fail()
  const payload = row(input.payload, ['comando_id', 'revision_esperada', 'motivo', ...(input.dominio === 'M2' ? ['vivero_id'] : [])])
  const motivo = text(payload.motivo).normalize('NFC').trim()
  if ([...motivo].length < 3 || [...motivo].length > 1000) return fail()
  return { actor_id: validarId(input.actor_id), dominio: input.dominio, operacion: input.operacion as IntentoAcceso['operacion'], usuario_id: validarId(input.usuario_id), payload: { comando_id: uuid(payload.comando_id), revision_esperada: validarRevision(payload.revision_esperada), motivo, ...(input.dominio === 'M2' ? { vivero_id: validarId(payload.vivero_id) } : {}) } }
}
export function validarReciboAcceso(value: unknown, intento: IntentoAcceso): ReciboAcceso {
  validarIntentoAcceso(intento)
  const input = row(value, ['comando_id', 'operacion', 'estado', 'resultado', 'error', 'finalizado_en'])
  if (uuid(input.comando_id) !== intento.payload.comando_id || input.operacion !== intento.operacion) return fail()
  const base = { comando_id: intento.payload.comando_id, operacion: intento.operacion, finalizado_en: instant(input.finalizado_en) }
  if (input.estado === 'RECHAZADO') {
    if (input.resultado !== null) return fail()
    return { ...base, estado: 'RECHAZADO', resultado: null, error: validarErrorEstable(input.error) }
  }
  if (input.estado !== 'CONFIRMADO' || input.error !== null) return fail()
  const result = row(input.resultado, ['tipo', 'usuario_id', ...(intento.dominio === 'M2' ? ['vivero_id'] : []), 'acceso_explicito_anterior', 'acceso_explicito_nuevo', 'revision_anterior', 'revision_nueva', 'cambio'])
  const anterior = bool(result.acceso_explicito_anterior), nuevo = bool(result.acceso_explicito_nuevo)
  const revision_anterior = validarRevision(result.revision_anterior), revision_nueva = validarRevision(result.revision_nueva)
  if (result.tipo !== (intento.dominio === 'M1' ? 'ACCESO_RECOLECCION' : 'ACCESO_VIVERO') || validarId(result.usuario_id) !== intento.usuario_id || nuevo !== intento.operacion.startsWith('OTORGAR') || revision_anterior !== intento.payload.revision_esperada) return fail()
  if (intento.dominio === 'M2' && validarId(result.vivero_id) !== intento.payload.vivero_id) return fail()
  if (result.cambio === 'CAMBIO_APLICADO' ? anterior === nuevo || BigInt(revision_nueva) !== BigInt(revision_anterior) + 1n : result.cambio !== 'SIN_CAMBIOS' || anterior !== nuevo || revision_nueva !== revision_anterior) return fail()
  return { ...base, estado: 'CONFIRMADO', error: null, resultado: { tipo: intento.dominio === 'M1' ? 'ACCESO_RECOLECCION' : 'ACCESO_VIVERO', usuario_id: intento.usuario_id, ...(intento.dominio === 'M2' ? { vivero_id: intento.payload.vivero_id } : {}), acceso_explicito_anterior: anterior, acceso_explicito_nuevo: nuevo, revision_anterior, revision_nueva, cambio: result.cambio as 'CAMBIO_APLICADO' | 'SIN_CAMBIOS' } }
}
