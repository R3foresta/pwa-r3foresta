import { validarId } from '../participacion/api/participacion.contract'
import { validarRegistroFecha } from '../participacion/api/registro.contract'
import type { OpcionReporte } from './reporte-plantaciones.contract'

export type FiltrosVivero = { planta_id: string | null; vivero_id: string | null }
export type FiltrosMermas = FiltrosVivero & { desde: string; hasta: string; pagina: number }

export type OpcionesVivero = { viveros: OpcionReporte[]; especies: OpcionReporte[] }
type AmbitoVivero = { vivero_id: string; vivero: string }
type AmbitoEspecie = { planta_id: string; especie: string }
type SaldoVivero = AmbitoVivero & { plantas: number }
export type FilaVivero = SaldoVivero & AmbitoEspecie
export type DetalleMerma = AmbitoVivero & AmbitoEspecie & {
  id: string
  fecha: string
  lote_id: string
  codigo_lote: string
  causa: string | null
  cantidad: number | null
}

export type ReporteVivero = {
  observado_en: string
  filtros: FiltrosVivero
  totales: { plantas: number; especies: number; viveros: number }
  filas: FilaVivero[]
  por_vivero: SaldoVivero[]
  opciones: OpcionesVivero
}

export type ReporteMermas = {
  observado_en: string
  filtros: FiltrosMermas
  totales: { plantas: number; eventos: number; eventos_sin_cantidad: number }
  por_causa: { causa: string | null; plantas: number; eventos: number }[]
  meses: { mes: string; plantas: number }[]
  tamano_pagina: 25
  detalle: DetalleMerma[]
  opciones: OpcionesVivero
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

function cantidad(value: unknown, minimo = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimo ? value : fail()
}

function list<T, Key>(value: unknown, parse: (item: unknown) => T, key: (item: T) => Key): T[] {
  if (!Array.isArray(value)) return fail()
  const result = value.map(parse)
  if (new Set(result.map(key)).size !== result.length) return fail()
  return result
}

function leerReporte(value: unknown) {
  const response = object(value)
  if (response.success !== true) return fail()
  const data = object(response.data)
  const observado_en = text(data.observado_en)
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(observado_en) ||
    !Number.isFinite(Date.parse(observado_en))) return fail()
  validarRegistroFecha(observado_en.slice(0, 10))

  const opciones = object(data.opciones)
  const parseOpcion = (option: unknown): OpcionReporte => {
    const row = object(option)
    return { id: validarId(row.id), nombre: text(row.nombre) }
  }
  return {
    data, observado_en,
    opciones: {
      viveros: list(opciones.viveros, parseOpcion, row => row.id),
      especies: list(opciones.especies, parseOpcion, row => row.id),
    },
  }
}

function coincideAmbito(ambito: FiltrosVivero, consulta: FiltrosVivero): boolean {
  return (consulta.planta_id === null || ambito.planta_id === consulta.planta_id) &&
    (consulta.vivero_id === null || ambito.vivero_id === consulta.vivero_id)
}

function leerFiltros(row: Record<string, unknown>, consulta: FiltrosVivero): FiltrosVivero {
  const planta_id = row.planta_id === null ? null : validarId(row.planta_id)
  const vivero_id = row.vivero_id === null ? null : validarId(row.vivero_id)
  if (planta_id !== consulta.planta_id || vivero_id !== consulta.vivero_id) return fail()
  return { planta_id, vivero_id }
}

function ambito(row: Record<string, unknown>): AmbitoEspecie & AmbitoVivero {
  return {
    planta_id: validarId(row.planta_id), especie: text(row.especie),
    vivero_id: validarId(row.vivero_id), vivero: text(row.vivero),
  }
}

export function validarReporteVivero(value: unknown, consulta: FiltrosVivero): ReporteVivero {
  const { data, observado_en, opciones } = leerReporte(value)
  const filtros = leerFiltros(object(data.filtros), consulta)
  const resumen = object(data.totales)
  const totales = { plantas: cantidad(resumen.plantas), especies: cantidad(resumen.especies), viveros: cantidad(resumen.viveros) }
  const filas = list(data.filas, item => {
    const row = object(item)
    const identificacion = ambito(row)
    if (!coincideAmbito(identificacion, consulta)) return fail()
    return { ...identificacion, plantas: cantidad(row.plantas, 1) }
  }, row => `${row.planta_id}:${row.vivero_id}`)
  const por_vivero = list(data.por_vivero, item => {
    const row = object(item)
    return { vivero_id: validarId(row.vivero_id), vivero: text(row.vivero), plantas: cantidad(row.plantas, 1) }
  }, row => row.vivero_id)

  const saldos = new Map<string, number>()
  for (const fila of filas) saldos.set(fila.vivero_id, (saldos.get(fila.vivero_id) ?? 0) + fila.plantas)
  if (totales.plantas !== filas.reduce((suma, fila) => suma + fila.plantas, 0) ||
    totales.especies !== new Set(filas.map(fila => fila.planta_id)).size ||
    totales.viveros !== saldos.size || por_vivero.length !== saldos.size ||
    por_vivero.some(row => saldos.get(row.vivero_id) !== row.plantas)) return fail()

  return { observado_en, filtros, totales, filas, por_vivero, opciones }
}

export function validarReporteMermas(value: unknown, consulta: FiltrosMermas, exportacionCompleta = false): ReporteMermas {
  const { data, observado_en, opciones } = leerReporte(value)
  const filtrosRow = object(data.filtros)
  const filtros = {
    ...leerFiltros(filtrosRow, consulta),
    desde: validarRegistroFecha(filtrosRow.desde), hasta: validarRegistroFecha(filtrosRow.hasta),
    pagina: cantidad(filtrosRow.pagina, 1),
  }
  if (filtros.desde !== consulta.desde || filtros.hasta !== consulta.hasta || filtros.desde > filtros.hasta ||
    filtros.pagina !== consulta.pagina || filtros.pagina > 1000000 || data.tamano_pagina !== 25) return fail()

  const resumen = object(data.totales)
  const totales = {
    plantas: cantidad(resumen.plantas), eventos: cantidad(resumen.eventos),
    eventos_sin_cantidad: cantidad(resumen.eventos_sin_cantidad),
  }
  const por_causa = list(data.por_causa, item => {
    const row = object(item)
    return { causa: row.causa === null ? null : text(row.causa), plantas: cantidad(row.plantas), eventos: cantidad(row.eventos, 1) }
  }, row => row.causa)
  const meses = list(data.meses, item => {
    const row = object(item)
    const mes = text(row.mes)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || mes < filtros.desde.slice(0, 7) || mes > filtros.hasta.slice(0, 7)) return fail()
    return { mes, plantas: cantidad(row.plantas) }
  }, row => row.mes)
  const detalle = list(data.detalle, item => {
    const row = object(item)
    const identificacion = ambito(row)
    const fecha = validarRegistroFecha(row.fecha)
    if (!coincideAmbito(identificacion, consulta) || fecha < filtros.desde || fecha > filtros.hasta) return fail()
    return {
      ...identificacion, id: validarId(row.id), fecha,
      lote_id: validarId(row.lote_id), codigo_lote: text(row.codigo_lote),
      causa: row.causa === null ? null : text(row.causa),
      cantidad: row.cantidad === null ? null : cantidad(row.cantidad, 1),
    }
  }, row => row.id)

  const tamano_pagina = data.tamano_pagina
  const eventosRestantes = Math.max(0, totales.eventos - (filtros.pagina - 1) * tamano_pagina)
  const eventosSinCantidad = detalle.filter(row => row.cantidad === null).length
  const detalleIncompleto = exportacionCompleta
    ? detalle.length !== totales.eventos || eventosSinCantidad !== totales.eventos_sin_cantidad ||
      detalle.reduce((suma, row) => suma + (row.cantidad ?? 0), 0) !== totales.plantas
    : detalle.length !== Math.min(tamano_pagina, eventosRestantes) || eventosSinCantidad > totales.eventos_sin_cantidad
  if (totales.eventos_sin_cantidad > totales.eventos || detalleIncompleto ||
    totales.eventos !== por_causa.reduce((suma, row) => suma + row.eventos, 0) ||
    totales.plantas !== por_causa.reduce((suma, row) => suma + row.plantas, 0) ||
    totales.plantas !== meses.reduce((suma, row) => suma + row.plantas, 0)) return fail()

  return { observado_en, filtros, totales, por_causa, meses, tamano_pagina, detalle, opciones }
}
