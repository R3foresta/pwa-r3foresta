import type {
  ImpactoAfiliacion, ImpactoCampania, ImpactoConsulta, ImpactoIndicadores, ImpactoPunto,
  ImpactoQuery, ImpactoRegistro, ImpactoScope, ImpactoSubcampania, MisRegistro, MisRegistros, MisRegistrosQuery,
} from '../types'

export class ImpactoContratoError extends Error {
  constructor(message = 'La respuesta de Impacto no cumple el contrato. Vuelve a consultar.') { super(message); this.name = 'ImpactoContratoError' }
}
const maxId = 9223372036854775807n
const intMax = 2147483647
function fail(): never { throw new ImpactoContratoError() }
function row(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  const item = value as Record<string, unknown>
  if (required.some(key => !Object.hasOwn(item, key)) || Object.keys(item).some(key => !required.includes(key) && !optional.includes(key))) return fail()
  return item
}
function text(value: unknown): string { if (typeof value !== 'string') return fail(); return value }
function nullableText(value: unknown): string | null { return value === null ? null : text(value) }
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return fail(); return value }
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail(); return value }
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number { const result = number(value, min, max); if (!Number.isSafeInteger(result)) return fail(); return result }
function choice<const T extends readonly (string | null)[]>(value: unknown, values: T): T[number] { if (!values.includes(value as T[number])) return fail(); return value as T[number] }
function list<T>(value: unknown, parse: (item: unknown) => T, min = 0, max = Infinity): T[] { if (!Array.isArray(value) || value.length < min || value.length > max) return fail(); return value.map(parse) }
function unique<T>(values: T[], key: (item: T) => string): T[] { if (new Set(values.map(key)).size !== values.length) return fail(); return values }
function sum<T>(values: T[], get: (item: T) => number): number { return integer(values.reduce((result, item) => result + get(item), 0)) }
export function validarImpactoId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) || BigInt(value) > maxId) return fail()
  return value
}
function nullableId(value: unknown): string | null { return value === null ? null : validarImpactoId(value) }
export function validarImpactoFecha(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return fail()
  return value
}
function instant(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return fail()
  validarImpactoFecha(value.slice(0, 10)); return value
}
function url(value: unknown, kind: 'campanias' | 'subcampanias' | 'registros' | 'imagenes', id: string): string {
  if (value !== `/api/v1/impact/${kind}/${id}`) return fail()
  return value as string
}
export function validarImpactoScope(value: unknown): ImpactoScope {
  const item = row(value, ['tipo'], ['id'])
  if (item.tipo === 'global') { row(item, ['tipo']); return { tipo: 'global' } }
  const tipo = choice(item.tipo, ['campania', 'subcampania'] as const)
  return { tipo, id: validarImpactoId(item.id) }
}
export function validarImpactoQuery(scopeValue: ImpactoScope, value: unknown = {}): ImpactoQuery {
  const scope = validarImpactoScope(scopeValue)
  const allowed = ['organizacion_id', 'planta_id', 'desde', 'hasta', 'cursor', 'limite', ...(scope.tipo === 'global' ? ['campania_id'] : []), ...(scope.tipo !== 'subcampania' ? ['subcampania_id'] : [])]
  const input = row(value, [], allowed), result: ImpactoQuery = {}
  for (const key of ['campania_id', 'subcampania_id', 'organizacion_id', 'planta_id', 'cursor'] as const) if (input[key] !== undefined) result[key] = validarImpactoId(input[key])
  for (const key of ['desde', 'hasta'] as const) if (input[key] !== undefined) result[key] = validarImpactoFecha(input[key])
  if (input.limite !== undefined) result.limite = integer(input.limite, 1, 100)
  if (result.desde && result.hasta && result.desde > result.hasta) return fail()
  return result
}
export function validarMisRegistrosQuery(value: unknown = {}): MisRegistrosQuery {
  row(value, [], ['cursor', 'limite'])
  return validarImpactoQuery({ tipo: 'global' }, value)
}
function affiliation(value: unknown): ImpactoAfiliacion {
  const item = row(value, ['estado', 'tipo', 'nombre', 'organizacion_id'])
  const result: ImpactoAfiliacion = {
    estado: choice(item.estado, ['DECLARADA', 'NO_DECLARADA', 'HISTORICA_NO_DISPONIBLE'] as const),
    tipo: choice(item.tipo, ['ORGANIZACION_REGISTRADA', 'OTRA', null] as const),
    nombre: nullableText(item.nombre), organizacion_id: nullableId(item.organizacion_id),
  }
  if (result.estado !== 'DECLARADA' && (result.tipo !== null || result.nombre !== null || result.organizacion_id !== null)) return fail()
  if (result.estado === 'DECLARADA' && (result.tipo === null || result.tipo === 'ORGANIZACION_REGISTRADA' && result.organizacion_id === null || result.tipo === 'OTRA' && result.organizacion_id !== null)) return fail()
  return result
}
function registro(value: unknown): ImpactoRegistro {
  const item = row(value, ['id', 'codigo_trazabilidad', 'campania_id', 'subcampania_id', 'campania_nombre', 'subcampania_nombre', 'fecha_plantacion', 'cantidad_total_plantada', 'es_reposicion', 'registro_plantacion_origen_id', 'latitud', 'longitud', 'gps_dentro_poligono', 'especies', 'personas', 'fotos', 'seguimiento', 'organizaciones_campania', 'url_publica'])
  const id = validarImpactoId(item.id), track = row(item.seguimiento, ['bajas_reportadas', 'reposiciones_registradas', 'bajas', 'reposiciones'])
  const result: ImpactoRegistro = {
    id, codigo_trazabilidad: text(item.codigo_trazabilidad), campania_id: validarImpactoId(item.campania_id), subcampania_id: validarImpactoId(item.subcampania_id),
    campania_nombre: text(item.campania_nombre), subcampania_nombre: text(item.subcampania_nombre), fecha_plantacion: validarImpactoFecha(item.fecha_plantacion),
    cantidad_total_plantada: integer(item.cantidad_total_plantada, 1, intMax), es_reposicion: bool(item.es_reposicion), registro_plantacion_origen_id: nullableId(item.registro_plantacion_origen_id),
    latitud: number(item.latitud, -90, 90), longitud: number(item.longitud, -180, 180), gps_dentro_poligono: bool(item.gps_dentro_poligono),
    especies: unique(list(item.especies, value => { const item = row(value, ['planta_id', 'nombre', 'cantidad']); return { planta_id: validarImpactoId(item.planta_id), nombre: nullableText(item.nombre), cantidad: integer(item.cantidad, 1, intMax) } }), item => item.planta_id),
    personas: list(item.personas, value => { const item = row(value, ['nombre', 'es_responsable', 'afiliacion']); return { nombre: nullableText(item.nombre), es_responsable: bool(item.es_responsable), afiliacion: affiliation(item.afiliacion) } }, 1, 101),
    fotos: unique(list(item.fotos, value => { const item = row(value, ['id', 'url']), id = validarImpactoId(item.id); return { id, url: url(item.url, 'imagenes', id) } }), item => item.id),
    seguimiento: {
      bajas_reportadas: integer(track.bajas_reportadas), reposiciones_registradas: integer(track.reposiciones_registradas),
      bajas: unique(list(track.bajas, value => { const item = row(value, ['evento_id', 'fecha', 'cantidad']); return { evento_id: validarImpactoId(item.evento_id), fecha: instant(item.fecha), cantidad: integer(item.cantidad, 1, intMax) } }), item => item.evento_id),
      reposiciones: unique(list(track.reposiciones, value => { const item = row(value, ['registro_id', 'fecha', 'cantidad', 'url_publica']), registro_id = validarImpactoId(item.registro_id); return { registro_id, fecha: validarImpactoFecha(item.fecha), cantidad: integer(item.cantidad, 1, intMax), url_publica: url(item.url_publica, 'registros', registro_id) } }), item => item.registro_id),
    },
    organizaciones_campania: unique(list(item.organizaciones_campania, value => { const item = row(value, ['id', 'nombre']); return { id: validarImpactoId(item.id), nombre: text(item.nombre) } }), item => item.id),
    url_publica: url(item.url_publica, 'registros', id),
  }
  if (result.personas.filter(item => item.es_responsable).length !== 1) return fail()
  if (result.es_reposicion !== (result.registro_plantacion_origen_id !== null) || result.registro_plantacion_origen_id === id) return fail()
  // El legado puede carecer de detalle histórico; no inventar ni rechazarlo por ese vacío.
  if (result.especies.length && sum(result.especies, item => item.cantidad) !== result.cantidad_total_plantada) return fail()
  if (sum(result.seguimiento.bajas, item => item.cantidad) > result.seguimiento.bajas_reportadas || sum(result.seguimiento.reposiciones, item => item.cantidad) > result.seguimiento.reposiciones_registradas) return fail()
  if (result.seguimiento.reposiciones.some(item => item.registro_id === id)) return fail()
  return result
}
function indicadores(value: unknown): ImpactoIndicadores {
  const item = row(value, ['plantacion_inicial', 'reposiciones', 'bajas_reportadas', 'registros'])
  return { plantacion_inicial: integer(item.plantacion_inicial), reposiciones: integer(item.reposiciones), bajas_reportadas: integer(item.bajas_reportadas), registros: integer(item.registros) }
}
function campania(value: unknown): ImpactoCampania {
  const item = row(value, ['id', 'nombre', 'plantacion_inicial', 'url_publica']), id = validarImpactoId(item.id)
  return { id, nombre: text(item.nombre), plantacion_inicial: integer(item.plantacion_inicial), url_publica: url(item.url_publica, 'campanias', id) }
}
function polygon(value: unknown): ImpactoSubcampania['poligono'] {
  if (value === null) return null
  const item = row(value, ['type', 'coordinates'])
  if (item.type !== 'Polygon') return fail()
  const coordinates = list(item.coordinates, value => {
    const ring = list(value, value => { const pair = list(value, value => number(value, -180, 180), 2, 2); number(pair[1], -90, 90); return pair as [number, number] }, 4)
    if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) return fail()
    return ring
  }, 1)
  return { type: 'Polygon', coordinates }
}
function subcampania(value: unknown): ImpactoSubcampania {
  const item = row(value, ['id', 'campania_id', 'nombre', 'estado', 'zona', 'poligono', 'meta_inicial', 'plantacion_inicial', 'faltantes', 'avance_porcentaje', 'reposiciones', 'bajas_reportadas', 'registros', 'url_publica']), id = validarImpactoId(item.id)
  const result: ImpactoSubcampania = {
    id, campania_id: validarImpactoId(item.campania_id), nombre: text(item.nombre), estado: choice(item.estado, ['ACTIVA', 'COMPLETADA', 'FINALIZADA_PARCIAL'] as const),
    zona: nullableText(item.zona), poligono: polygon(item.poligono), meta_inicial: integer(item.meta_inicial), plantacion_inicial: integer(item.plantacion_inicial),
    faltantes: integer(item.faltantes), avance_porcentaje: item.avance_porcentaje === null ? null : number(item.avance_porcentaje),
    reposiciones: integer(item.reposiciones), bajas_reportadas: integer(item.bajas_reportadas), registros: integer(item.registros), url_publica: url(item.url_publica, 'subcampanias', id),
  }
  if (result.faltantes !== Math.max(result.meta_inicial - result.plantacion_inicial, 0)) return fail()
  if (result.meta_inicial === 0 ? result.avance_porcentaje !== null : result.avance_porcentaje === null || Math.abs(result.avance_porcentaje - 100 * result.plantacion_inicial / result.meta_inicial) > 0.00500001) return fail()
  return result
}
function punto(value: unknown): ImpactoPunto {
  const item = row(value, ['registro_id', 'subcampania_id', 'latitud', 'longitud', 'cantidad_total_plantada', 'es_reposicion', 'url_publica']), registro_id = validarImpactoId(item.registro_id)
  return { registro_id, subcampania_id: validarImpactoId(item.subcampania_id), latitud: number(item.latitud, -90, 90), longitud: number(item.longitud, -180, 180), cantidad_total_plantada: integer(item.cantidad_total_plantada, 1, intMax), es_reposicion: bool(item.es_reposicion), url_publica: url(item.url_publica, 'registros', registro_id) }
}
function validatePage<T extends { id: string }>(records: T[], next: string | null, options: MisRegistrosQuery) {
  if (records.length > (options.limite ?? 20) || records.some((item, index) => index > 0 && BigInt(item.id) >= BigInt(records[index - 1].id) || options.cursor !== undefined && BigInt(item.id) >= BigInt(options.cursor))) return fail()
  if (next !== null && (records.length !== (options.limite ?? 20) || next !== records.at(-1)?.id)) return fail()
}
export function validarImpactoRegistro(value: unknown, expectedId?: string): { data: ImpactoRegistro } {
  const result = { data: registro(row(value, ['data']).data) }
  if (expectedId !== undefined && result.data.id !== validarImpactoId(expectedId)) return fail()
  return result
}
export function validarImpactoConsulta(value: unknown, scopeValue: ImpactoScope = { tipo: 'global' }, optionsValue: ImpactoQuery = {}): { data: ImpactoConsulta } {
  const scope = validarImpactoScope(scopeValue), options = validarImpactoQuery(scope, optionsValue)
  const item = row(row(value, ['data']).data, ['indicadores', 'campanias', 'subcampanias', 'mapa', 'registros', 'siguiente_cursor'])
  const data: ImpactoConsulta = {
    indicadores: indicadores(item.indicadores), campanias: unique(list(item.campanias, campania), item => item.id),
    subcampanias: unique(list(item.subcampanias, subcampania), item => item.id), mapa: unique(list(item.mapa, punto), item => item.registro_id),
    registros: unique(list(item.registros, registro, 0, 100), item => item.id), siguiente_cursor: nullableId(item.siguiente_cursor),
  }
  validatePage(data.registros, data.siguiente_cursor, options)
  const campaignId = scope.tipo === 'campania' ? scope.id : options.campania_id, subId = scope.tipo === 'subcampania' ? scope.id : options.subcampania_id
  const campaigns = new Map(data.campanias.map(item => [item.id, item])), subs = new Map(data.subcampanias.map(item => [item.id, item])), points = new Map(data.mapa.map(item => [item.registro_id, item]))
  if (data.campanias.some(item => campaignId !== undefined && item.id !== campaignId) || data.subcampanias.some(item => !campaigns.has(item.campania_id) || campaignId !== undefined && item.campania_id !== campaignId || subId !== undefined && item.id !== subId)) return fail()
  if (data.mapa.some(item => !subs.has(item.subcampania_id)) || data.mapa.length !== data.indicadores.registros) return fail()
  for (const key of ['plantacion_inicial', 'reposiciones', 'bajas_reportadas', 'registros'] as const) if (sum(data.subcampanias, item => item[key]) !== data.indicadores[key]) return fail()
  if (sum(data.campanias, item => item.plantacion_inicial) !== data.indicadores.plantacion_inicial) return fail()
  if (sum(data.mapa.filter(item => !item.es_reposicion), item => item.cantidad_total_plantada) !== data.indicadores.plantacion_inicial || sum(data.mapa.filter(item => item.es_reposicion), item => item.cantidad_total_plantada) !== data.indicadores.reposiciones) return fail()
  for (const camp of data.campanias) if (sum(data.subcampanias.filter(item => item.campania_id === camp.id), item => item.plantacion_inicial) !== camp.plantacion_inicial) return fail()
  for (const sub of data.subcampanias) {
    const group = data.mapa.filter(item => item.subcampania_id === sub.id)
    if (group.length !== sub.registros || sum(group.filter(item => !item.es_reposicion), item => item.cantidad_total_plantada) !== sub.plantacion_inicial || sum(group.filter(item => item.es_reposicion), item => item.cantidad_total_plantada) !== sub.reposiciones) return fail()
  }
  for (const record of data.registros) {
    const point = points.get(record.id), sub = subs.get(record.subcampania_id)
    if (!point || !sub || sub.campania_id !== record.campania_id || point.subcampania_id !== record.subcampania_id || point.latitud !== record.latitud || point.longitud !== record.longitud || point.es_reposicion !== record.es_reposicion || point.cantidad_total_plantada !== record.cantidad_total_plantada) return fail()
    if (options.desde && record.fecha_plantacion < options.desde || options.hasta && record.fecha_plantacion > options.hasta || options.planta_id && !record.especies.some(item => item.planta_id === options.planta_id) || options.organizacion_id && !record.organizaciones_campania.some(item => item.id === options.organizacion_id)) return fail()
  }
  const eligible = data.mapa.filter(item => !options.cursor || BigInt(item.registro_id) < BigInt(options.cursor)).sort((a, b) => BigInt(a.registro_id) > BigInt(b.registro_id) ? -1 : 1)
  if (data.registros.map(item => item.id).join(',') !== eligible.slice(0, options.limite ?? 20).map(item => item.registro_id).join(',') || (data.siguiente_cursor !== null) !== (eligible.length > data.registros.length)) return fail()
  return { data }
}
export function validarMisRegistros(value: unknown, optionsValue: MisRegistrosQuery = {}): { data: MisRegistros } {
  const options = validarMisRegistrosQuery(optionsValue), item = row(row(value, ['data']).data, ['registros', 'siguiente_cursor'])
  const data: MisRegistros = {
    registros: unique(list(item.registros, value => {
      const item = row(value, ['id', 'subcampania_id', 'fecha_plantacion', 'codigo_trazabilidad', 'cantidad_total_plantada', 'es_reposicion', 'relaciones', 'url_publica', 'url_detalle_propio']), id = validarImpactoId(item.id)
      if (item.url_detalle_propio !== `/api/v1/plantaciones/${id}/detalle-propio`) return fail()
      const result: MisRegistro = {
        id, subcampania_id: validarImpactoId(item.subcampania_id), fecha_plantacion: validarImpactoFecha(item.fecha_plantacion), codigo_trazabilidad: text(item.codigo_trazabilidad),
        cantidad_total_plantada: integer(item.cantidad_total_plantada, 1, intMax), es_reposicion: bool(item.es_reposicion),
        relaciones: unique(list(item.relaciones, value => choice(value, ['AUTOR', 'PARTICIPANTE'] as const), 1, 2), item => item),
        url_publica: item.url_publica === null ? null : url(item.url_publica, 'registros', id), url_detalle_propio: item.url_detalle_propio as string,
      }
      return result
    }, 0, 100), item => item.id), siguiente_cursor: nullableId(item.siguiente_cursor),
  }
  validatePage(data.registros, data.siguiente_cursor, options)
  return { data }
}
