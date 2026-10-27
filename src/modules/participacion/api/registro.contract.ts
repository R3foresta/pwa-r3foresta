import type {
  AfiliacionRegistro, CargaRegistro, CargaRegistroLectura, CargasRegistroLectura, ContextoRegistroLectura,
  DetallePropioRegistroLectura, EspecieRegistro, ParticipanteSnapshotRegistro, PlantacionResultado,
  PreparacionRegistroLectura, PreviewRegistroLectura, ReciboRegistro, RegistroIdentity, RegistroInicialEntrada,
} from '../registroTypes'
import { ParticipacionContratoError, validarErrorEstable, validarId, validarRevision } from './participacion.contract'

const operation = 'REGISTRAR_PLANTACION_INICIAL' as const
const intMax = 2147483647
function fail(): never { throw new ParticipacionContratoError('La respuesta o el intento no corresponde al contrato de registro. El resultado no está confirmado.') }
function row(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const result = value as Record<string, unknown>
  if (required.some(key => !Object.hasOwn(result, key)) || Object.keys(result).some(key => !required.includes(key) && !optional.includes(key))) return fail()
  return result
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return fail(); return value }
function nullableText(value: unknown): string | null { return value === null ? null : text(value) }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value }
function choice<const T extends readonly (string | null)[]>(value: unknown, values: T): T[number] { if (!values.includes(value as T[number])) return fail(); return value as T[number] }
function list<T>(value: unknown, parse: (item: unknown) => T, min = 0, max = 100): T[] { if (!Array.isArray(value) || value.length < min || value.length > max) return fail(); return value.map(parse) }
function unique<T>(values: T[], key: (item: T) => string): T[] { if (new Set(values.map(key)).size !== values.length) return fail(); return values }
function number(value: unknown, min: number, max: number, integer = false): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) return fail(); return value }
function integer(value: unknown, min = 0): number { return number(value, min, intMax, true) }
export function validarRegistroComandoId(value: unknown): string { if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) return fail(); return value }
function instant(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return fail()
  validarRegistroFecha(value.slice(0, 10))
  return value
}
export function validarRegistroFecha(value: unknown): string { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value < '0001-01-01') return fail(); return value }
function coordinate(value: unknown, max: number): number { const result = number(value, -max, max); if (Number(result.toFixed(6)) !== result) return fail(); return Object.is(result, -0) ? 0 : result }
const idOrder = (a: string, b: string) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0
function ids(value: unknown, min: number, max: number): string[] { return unique(list(value, validarId, min, max), id => id).sort(idOrder) }
function species(value: unknown): EspecieRegistro[] {
  const result = unique(list(value, value => { const item = row(value, ['planta_id', 'cantidad']); return { planta_id: validarId(item.planta_id), cantidad: integer(item.cantidad, 1) } }, 1), item => item.planta_id)
  if (result.reduce((sum, item) => sum + item.cantidad, 0) > intMax) return fail()
  return result.sort((a, b) => idOrder(a.planta_id, b.planta_id))
}
function freeText(value: unknown, max: number): string { if (typeof value !== 'string') return fail(); const result = value.normalize('NFC').trim(); if ([...result].length > max) return fail(); return result }
function affiliation(value: unknown): AfiliacionRegistro | null {
  if (value === null) return null
  const item = row(value, ['tipo'], ['nombre', 'organizacion_id'])
  if (item.tipo === 'ORGANIZACION_REGISTRADA') { row(item, ['tipo', 'organizacion_id']); return { tipo: item.tipo, organizacion_id: validarId(item.organizacion_id) } }
  if (item.tipo === 'OTRA') { row(item, ['tipo', 'nombre']); return { tipo: item.tipo, nombre: text(freeText(item.nombre, 150)) } }
  return fail()
}
export function validarRegistroEntrada(value: unknown, actorId: string): RegistroInicialEntrada {
  const input = row(value, ['comando_id', 'subcampania_id', 'plan_revision_esperada', 'fecha_plantacion', 'latitud', 'longitud', 'especies', 'coresponsable_ids', 'evidencia_ids'], ['observaciones', 'afiliaciones_declaradas'])
  const actor = validarId(actorId)
  const coresponsable_ids = ids(input.coresponsable_ids, 0, 100)
  if (coresponsable_ids.includes(actor)) return fail()
  const declarations = unique(list(input.afiliaciones_declaradas ?? [], value => {
    const declaration = row(value, ['usuario_id', 'afiliacion'])
    const usuario_id = validarId(declaration.usuario_id)
    if (usuario_id !== actor && !coresponsable_ids.includes(usuario_id)) return fail()
    return { usuario_id, afiliacion: affiliation(declaration.afiliacion) }
  }, 0, 101), item => item.usuario_id).sort((a, b) => idOrder(a.usuario_id, b.usuario_id))
  // null no equivale a [] para la lista de declaraciones.
  if (input.afiliaciones_declaradas === null) return fail()
  return {
    comando_id: validarRegistroComandoId(input.comando_id), subcampania_id: validarId(input.subcampania_id), plan_revision_esperada: validarRevision(input.plan_revision_esperada),
    fecha_plantacion: validarRegistroFecha(input.fecha_plantacion), latitud: coordinate(input.latitud, 90), longitud: coordinate(input.longitud, 180), especies: species(input.especies),
    coresponsable_ids, evidencia_ids: ids(input.evidencia_ids, 1, 10), observaciones: input.observaciones == null ? null : freeText(input.observaciones, 2000) || null, afiliaciones_declaradas: declarations,
  }
}
export function validarRegistroIdentity(value: unknown): RegistroIdentity {
  const input = row(value, ['actor_id', 'subcampania_id', 'comando_id'], ['payload'])
  const actor_id = validarId(input.actor_id), subcampania_id = validarId(input.subcampania_id), comando_id = validarRegistroComandoId(input.comando_id)
  if (input.payload === undefined) return { actor_id, subcampania_id, comando_id }
  const payload = validarRegistroEntrada(input.payload, actor_id)
  if (payload.comando_id !== comando_id || payload.subcampania_id !== subcampania_id) return fail()
  return { actor_id, subcampania_id, comando_id, payload }
}
export function validarContextoRegistro(value: unknown, actorId: string, scopeId: string): ContextoRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = row(envelope.data, ['subcampania', 'actor', 'disponibilidad', 'especies', 'reglas'])
  const scope = row(data.subcampania, ['id', 'campania_id', 'nombre', 'campania_nombre', 'estado', 'plan_revision', 'meta_total_arboles', 'poligono'])
  const actor = row(data.actor, ['usuario_id', 'fuente_autoridad']), polygon = row(scope.poligono, ['type', 'coordinates'])
  if (scope.id !== validarId(scopeId) || actor.usuario_id !== validarId(actorId) || scope.estado !== 'ACTIVA' || polygon.type !== 'Polygon') return fail()
  const coordinates = list(polygon.coordinates, value => {
    const ring = list(value, value => { const point = list(value, value => number(value, -180, 180), 2, 2); number(point[1], -90, 90); return [point[0], point[1]] as [number, number] }, 4, 100000)
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) return fail()
    return ring
  }, 1, 10000)
  let avancePresente: boolean | null = null
  const especies = unique(list(data.especies, value => {
    const item = row(value, ['planta_id', 'nombre', 'porcentaje_objetivo', 'cantidad_objetivo', 'saldo_elegible'], ['plantado_inicial', 'pendiente_meta', 'imagen_url'])
    const tienePlantado = Object.hasOwn(item, 'plantado_inicial')
    const tienePendiente = Object.hasOwn(item, 'pendiente_meta')
    if (tienePlantado !== tienePendiente || avancePresente !== null && avancePresente !== tienePlantado) return fail()
    avancePresente = tienePlantado
    const cantidad_objetivo = integer(item.cantidad_objetivo)
    const especie = { planta_id: validarId(item.planta_id), nombre: text(item.nombre), ...(Object.hasOwn(item, 'imagen_url') ? { imagen_url: nullableText(item.imagen_url) } : {}), porcentaje_objetivo: number(item.porcentaje_objetivo, 0, 100), cantidad_objetivo, saldo_elegible: integer(item.saldo_elegible) }
    if (!tienePlantado) return especie
    const plantado_inicial = integer(item.plantado_inicial)
    const pendiente_meta = integer(item.pendiente_meta)
    if (pendiente_meta !== Math.max(0, cantidad_objetivo - plantado_inicial)) return fail()
    return { ...especie, plantado_inicial, pendiente_meta }
  }, 1), item => item.planta_id)
  const rules = row(data.reglas, ['hoy_operativo', 'fecha_minima_ventana', 'fecha_maxima', 'zona_horaria', 'ventana_retroactiva_dias', 'fotos_min', 'fotos_max', 'exterior_permitido'])
  const hoy_operativo = validarRegistroFecha(rules.hoy_operativo), fecha_minima_ventana = validarRegistroFecha(rules.fecha_minima_ventana), fecha_maxima = validarRegistroFecha(rules.fecha_maxima)
  if (rules.zona_horaria !== 'America/La_Paz' || rules.ventana_retroactiva_dias !== 10 || rules.fotos_min !== 1 || rules.fotos_max !== 10 || rules.exterior_permitido !== true || fecha_maxima !== hoy_operativo || fecha_minima_ventana > fecha_maxima) return fail()
  const disponibilidad = choice(data.disponibilidad, ['DISPONIBLE', 'SIN_STOCK'])
  if ((disponibilidad === 'SIN_STOCK') !== especies.every(item => item.saldo_elegible === 0)) return fail()
  return { data: {
    subcampania: { id: scopeId, campania_id: validarId(scope.campania_id), nombre: text(scope.nombre), campania_nombre: text(scope.campania_nombre), estado: 'ACTIVA', plan_revision: validarRevision(scope.plan_revision), meta_total_arboles: integer(scope.meta_total_arboles, 1), poligono: { type: 'Polygon', coordinates } },
    actor: { usuario_id: actorId, fuente_autoridad: choice(actor.fuente_autoridad, ['GLOBAL', 'CONTEXTUAL']) }, disponibilidad, especies,
    reglas: { hoy_operativo, fecha_minima_ventana, fecha_maxima, zona_horaria: 'America/La_Paz', ventana_retroactiva_dias: 10, fotos_min: 1, fotos_max: 10, exterior_permitido: true },
  }, observado_en: instant(envelope.observado_en) }
}
function result(value: unknown, identity: RegistroIdentity): PlantacionResultado {
  const data = row(value, ['tipo', 'registro_plantacion_id', 'codigo_trazabilidad', 'subcampania_id', 'responsable_id', 'fecha_plantacion', 'cantidad_total_plantada', 'especies', 'gps_dentro_poligono', 'gps_distancia_a_poligono_m', 'revision_inicial'])
  const especies = species(data.especies), total = integer(data.cantidad_total_plantada, 1), fecha = validarRegistroFecha(data.fecha_plantacion)
  if (data.tipo !== 'PLANTACION_INICIAL' || data.subcampania_id !== identity.subcampania_id || data.responsable_id !== identity.actor_id || data.revision_inicial !== '0' || especies.reduce((sum, item) => sum + item.cantidad, 0) !== total) return fail()
  if (identity.payload && (fecha !== identity.payload.fecha_plantacion || JSON.stringify(especies) !== JSON.stringify(species(identity.payload.especies)))) return fail()
  return { tipo: 'PLANTACION_INICIAL', registro_plantacion_id: validarId(data.registro_plantacion_id), codigo_trazabilidad: text(data.codigo_trazabilidad), subcampania_id: identity.subcampania_id, responsable_id: identity.actor_id, fecha_plantacion: fecha, cantidad_total_plantada: total, especies, gps_dentro_poligono: bool(data.gps_dentro_poligono), gps_distancia_a_poligono_m: data.gps_distancia_a_poligono_m === null ? null : number(data.gps_distancia_a_poligono_m, 0, Number.MAX_VALUE), revision_inicial: '0' }
}
export function validarReciboRegistro(value: unknown, identityValue: RegistroIdentity): ReciboRegistro {
  const identity = validarRegistroIdentity(identityValue), receipt = row(value, ['comando_id', 'operacion', 'finalizado_en', 'estado', 'resultado', 'error'])
  if (receipt.comando_id !== identity.comando_id || receipt.operacion !== operation) return fail()
  const base = { comando_id: identity.comando_id, operacion: operation, finalizado_en: instant(receipt.finalizado_en) }
  if (receipt.estado === 'CONFIRMADO' && receipt.error === null) return { ...base, estado: 'CONFIRMADO', resultado: result(receipt.resultado, identity), error: null }
  if (receipt.estado === 'RECHAZADO' && receipt.resultado === null) {
    const error = validarErrorEstable(receipt.error)
    if (error.ambitos.some(id => id !== identity.subcampania_id)) return fail()
    return { ...base, estado: 'RECHAZADO', resultado: null, error }
  }
  return fail()
}
export function validarPreparacionRegistro(value: unknown, identity: RegistroIdentity): PreparacionRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = row(envelope.data, ['comando_id', 'operacion', 'subcampania_id', 'estado'])
  if (data.comando_id !== identity.comando_id || data.subcampania_id !== identity.subcampania_id || data.operacion !== operation || data.estado !== 'PREPARADO') return fail()
  return { data: { comando_id: identity.comando_id, operacion: operation, subcampania_id: identity.subcampania_id, estado: 'PREPARADO' }, observado_en: instant(envelope.observado_en) }
}
export function validarRegistroSinResultado(value: unknown, identity: RegistroIdentity): void {
  const data = row(value, ['comando_id', 'operacion', 'estado', 'resultado', 'error', 'finalizado_en'])
  if (data.comando_id !== identity.comando_id || data.operacion !== operation || data.estado !== 'SIN_RESULTADO' || data.resultado !== null || data.error !== null || data.finalizado_en !== null) return fail()
}
function carga(value: unknown): CargaRegistro {
  const data = row(value, ['carga_id', 'estado', 'evidencia_id', 'creado_en', 'expira_en'])
  const estado = choice(data.estado, ['RESERVADA', 'DISPONIBLE', 'VINCULADA', 'DESCARTE_PENDIENTE', 'DESCARTADA']), evidencia_id = data.evidencia_id === null ? null : validarId(data.evidencia_id)
  if ((estado === 'DISPONIBLE' || estado === 'VINCULADA') && evidencia_id === null || estado === 'VINCULADA' && data.expira_en !== null) return fail()
  return { carga_id: validarRegistroComandoId(data.carga_id), estado, evidencia_id, creado_en: instant(data.creado_en), expira_en: data.expira_en === null ? null : instant(data.expira_en) }
}
export function validarCargaRegistro(value: unknown, cargaId: string): CargaRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = carga(envelope.data)
  if (data.carga_id !== cargaId) return fail()
  return { data, observado_en: instant(envelope.observado_en) }
}
export function validarCargasRegistro(value: unknown): CargasRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = unique(list(envelope.data, carga, 0, 10), item => item.carga_id)
  const evidenceIds = data.flatMap(item => item.evidencia_id ? [item.evidencia_id] : [])
  if (new Set(evidenceIds).size !== evidenceIds.length) return fail()
  return { data, observado_en: instant(envelope.observado_en) }
}
export function validarPreviewRegistro(value: unknown): PreviewRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = row(envelope.data, ['url', 'expira_en'])
  const url = text(data.url)
  let parsed: URL
  try { parsed = new URL(url) } catch { return fail() }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return fail()
  return { data: { url, expira_en: instant(data.expira_en) }, observado_en: instant(envelope.observado_en) }
}
function participant(value: unknown): ParticipanteSnapshotRegistro {
  const data = row(value, ['usuario_id', 'nombre_snapshot', 'afiliacion_snapshot', 'afiliacion_estado', 'afiliacion_tipo', 'organizacion_id_snapshot', 'es_responsable'])
  const afiliacion_estado = choice(data.afiliacion_estado, ['DECLARADA', 'NO_DECLARADA', 'HISTORICA_NO_DISPONIBLE']), afiliacion_tipo = choice(data.afiliacion_tipo, ['ORGANIZACION_REGISTRADA', 'OTRA', null])
  const organizacion_id_snapshot = data.organizacion_id_snapshot === null ? null : validarId(data.organizacion_id_snapshot), afiliacion_snapshot = nullableText(data.afiliacion_snapshot)
  if (afiliacion_estado === 'DECLARADA' ? afiliacion_tipo === null || afiliacion_snapshot === null || (afiliacion_tipo === 'ORGANIZACION_REGISTRADA') !== (organizacion_id_snapshot !== null) : afiliacion_tipo !== null || afiliacion_snapshot !== null || organizacion_id_snapshot !== null) return fail()
  return { usuario_id: validarId(data.usuario_id), nombre_snapshot: nullableText(data.nombre_snapshot), afiliacion_snapshot, afiliacion_estado, afiliacion_tipo, organizacion_id_snapshot, es_responsable: bool(data.es_responsable) }
}
export function validarDetallePropioRegistro(value: unknown, actorId: string, registroId: string): DetallePropioRegistroLectura {
  const envelope = row(value, ['data', 'observado_en']), data = row(envelope.data, ['registro_plantacion_id', 'codigo_trazabilidad', 'subcampania_id', 'fecha_plantacion', 'revision_registro', 'relaciones', 'cantidad_total_plantada', 'especies', 'latitud', 'longitud', 'gps_dentro_poligono', 'participantes', 'evidencia_ids', 'observaciones_autor'])
  const relaciones = unique(list(data.relaciones, value => choice(value, ['AUTOR', 'PARTICIPANTE']), 1, 2), value => value)
  const participantes = unique(list(data.participantes, participant, 1, 101), item => item.usuario_id), own = participantes.find(item => item.usuario_id === actorId)
  const especies = species(data.especies), cantidad_total_plantada = integer(data.cantidad_total_plantada, 1)
  if (data.registro_plantacion_id !== registroId || !own || own.es_responsable !== relaciones.includes('AUTOR') || participantes.filter(item => item.es_responsable).length !== 1 || !relaciones.includes('AUTOR') && data.observaciones_autor !== null || especies.reduce((sum, item) => sum + item.cantidad, 0) !== cantidad_total_plantada) return fail()
  return { data: { registro_plantacion_id: validarId(registroId), codigo_trazabilidad: text(data.codigo_trazabilidad), subcampania_id: validarId(data.subcampania_id), fecha_plantacion: validarRegistroFecha(data.fecha_plantacion), revision_registro: validarRevision(data.revision_registro), relaciones, cantidad_total_plantada, especies, latitud: coordinate(data.latitud, 90), longitud: coordinate(data.longitud, 180), gps_dentro_poligono: bool(data.gps_dentro_poligono), participantes, evidencia_ids: ids(data.evidencia_ids, 0, 10), observaciones_autor: data.observaciones_autor === null ? null : freeText(data.observaciones_autor, 2000) }, observado_en: instant(envelope.observado_en) }
}
