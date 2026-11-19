import { validarId } from '../participacion/api/participacion.contract'

export type FiltrosReportePlantaciones = {
  desde: string
  hasta: string
  organizacion_id: string | null
  campania_id: string | null
  planta_id: string | null
}

export type OpcionReporte = { id: string; nombre: string }
export type MesPlantado = { mes: string; iniciales: number; reposiciones: number }
export type EspeciePlantada = {
  planta_id: string | null
  version_detalle?: string
  nombre_comun: string | null
  nombre_cientifico: string | null
  iniciales: number
  reposiciones: number
  total: number
}

export type ReportePlantaciones = {
  observado_en: string
  filtros: FiltrosReportePlantaciones
  totales: { registros: number; iniciales: number; reposiciones: number; total: number }
  meses: MesPlantado[]
  especies: EspeciePlantada[]
  opciones: { organizaciones: OpcionReporte[]; campanias: OpcionReporte[]; especies: OpcionReporte[] }
}

function fail(): never {
  throw new Error('El reporte recibido es incompleto o no corresponde a la consulta.')
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : fail()
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}

function nullableId(value: unknown): string | null {
  return value === null ? null : validarId(value)
}

function cantidad(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fail()
}

function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parse) : fail()
}

function parseOpcion(value: unknown): OpcionReporte {
  const row = object(value)
  return { id: validarId(row.id), nombre: text(row.nombre) }
}

function parseMes(value: unknown): MesPlantado {
  const row = object(value)
  const mes = text(row.mes)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return fail()
  return { mes, iniciales: cantidad(row.iniciales), reposiciones: cantidad(row.reposiciones) }
}

function parseEspecie(value: unknown): EspeciePlantada {
  const row = object(value)
  const iniciales = cantidad(row.iniciales)
  const reposiciones = cantidad(row.reposiciones)
  const total = cantidad(row.total)
  if (iniciales + reposiciones !== total) return fail()
  const version = row.version_detalle
  if (version !== undefined && (typeof version !== 'string' || !/^[0-9a-f]{64}$/.test(version))) return fail()
  return {
    planta_id: nullableId(row.planta_id),
    ...(version ? { version_detalle: version } : {}),
    nombre_comun: nullableText(row.nombre_comun),
    nombre_cientifico: nullableText(row.nombre_cientifico),
    iniciales,
    reposiciones,
    total,
  }
}

export function mismosFiltros(a: FiltrosReportePlantaciones, b: FiltrosReportePlantaciones): boolean {
  return a.desde === b.desde && a.hasta === b.hasta && a.organizacion_id === b.organizacion_id &&
    a.campania_id === b.campania_id && a.planta_id === b.planta_id
}

export function validarReporte(value: unknown, consulta: FiltrosReportePlantaciones): ReportePlantaciones {
  const response = object(value)
  if (response.success !== true) return fail()
  const data = object(response.data)
  const observado_en = text(data.observado_en)
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(observado_en) || !Number.isFinite(Date.parse(observado_en))) return fail()

  const filtros = object(data.filtros)
  const aplicados = {
    desde: text(filtros.desde),
    hasta: text(filtros.hasta),
    organizacion_id: nullableId(filtros.organizacion_id),
    campania_id: nullableId(filtros.campania_id),
    planta_id: nullableId(filtros.planta_id),
  }
  if (!mismosFiltros(aplicados, consulta)) return fail()

  const totales = object(data.totales)
  const registros = cantidad(totales.registros)
  const iniciales = cantidad(totales.iniciales)
  const reposiciones = cantidad(totales.reposiciones)
  const total = cantidad(totales.total)
  const meses = list(data.meses, parseMes)
  const especies = list(data.especies, parseEspecie)
  const [primerMes, ultimoMes] = [consulta.desde.slice(0, 7), consulta.hasta.slice(0, 7)]
  if (new Set(meses.map(row => row.mes)).size !== meses.length || meses.some(row => row.mes < primerMes || row.mes > ultimoMes)) return fail()
  if (new Set(especies.map(row => row.planta_id)).size !== especies.length || (consulta.planta_id && especies.some(row => row.planta_id !== consulta.planta_id))) return fail()
  if (iniciales + reposiciones !== total || [meses, especies].some(rows => (
    rows.reduce((sum, row) => sum + row.iniciales, 0) !== iniciales ||
    rows.reduce((sum, row) => sum + row.reposiciones, 0) !== reposiciones
  ))) return fail()

  const opciones = object(data.opciones)
  return {
    observado_en,
    filtros: aplicados,
    totales: { registros, iniciales, reposiciones, total },
    meses,
    especies,
    opciones: {
      organizaciones: list(opciones.organizaciones, parseOpcion),
      campanias: list(opciones.campanias, parseOpcion),
      especies: list(opciones.especies, parseOpcion),
    },
  }
}
