import { validarId } from '../participacion/api/participacion.contract'
import { validarRegistroFecha } from '../participacion/api/registro.contract'
import {
  cantidad, coincideAmbito, leerFiltros, leerReporte, list, object,
  reporteIncompleto as fail, text, type FiltrosVivero, type OpcionesVivero,
} from './reporte-consulta.contract'
import type { FiltrosMermas } from './reporte-vivero.contract'

export type UnidadSemilla = 'G' | 'UNIDAD'
export type TipoMovimientoSemilla = 'RECEPCION_CONFORME' | 'CONSUMO_A_VIVERO' | 'DESECHO'

type AlcanceSemilla = { planta_id: string; especie: string; vivero_id: string | null; vivero: string | null }
type SaldoSemilla = AlcanceSemilla & { vivero_id: string; vivero: string; unidad: UnidadSemilla; saldo: string }
type MovimientoSemilla = AlcanceSemilla & {
  id: string; tipo: TipoMovimientoSemilla; fecha: string
  recoleccion_id: string; codigo_recoleccion: string | null
  vivero_destino: string | null; unidad: UnidadSemilla | null; cantidad: string | null
}

type ReporteSemillas<F> = { observado_en: string; filtros: F; opciones: OpcionesVivero }
export type ReporteSaldoSemillas = ReporteSemillas<FiltrosVivero> & {
  totales: Record<UnidadSemilla, string>
  filas: SaldoSemilla[]
}

type TotalesMovimientos = { recibido: string; consumido: string; descartado: string }
export type ReporteMovimientosSemillas = ReporteSemillas<FiltrosMermas> & {
  totales: Record<UnidadSemilla, TotalesMovimientos> & { eventos: number; eventos_sin_cantidad: number }
  detalle: MovimientoSemilla[]
  tamano_pagina: 25
}

function leerUnidad(value: unknown): UnidadSemilla {
  return value === 'G' || value === 'UNIDAD' ? value : fail()
}

function leerTipo(value: unknown): TipoMovimientoSemilla {
  return value === 'RECEPCION_CONFORME' || value === 'CONSUMO_A_VIVERO' || value === 'DESECHO' ? value : fail()
}

function leerDecimal(value: unknown, unidad: UnidadSemilla): string {
  const formato = unidad === 'G' ? /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/ : /^(?:0|[1-9]\d*)$/
  return typeof value === 'string' && formato.test(value) ? value : fail()
}

export function unidadesExactas(decimal: string): bigint {
  const [entera, fraccion = ''] = decimal.split('.')
  return BigInt(entera + fraccion.padEnd(6, '0'))
}

function textoOpcional(value: unknown): string | null {
  return value === null ? null : text(value)
}

function alcance(row: Record<string, unknown>, consulta: FiltrosVivero): AlcanceSemilla {
  const ambito = {
    planta_id: validarId(row.planta_id), especie: text(row.especie),
    vivero_id: row.vivero_id === null ? null : validarId(row.vivero_id),
    vivero: textoOpcional(row.vivero),
  }
  return coincideAmbito(ambito, consulta) ? ambito : fail()
}

export function validarSaldoSemillas(value: unknown, consulta: FiltrosVivero): ReporteSaldoSemillas {
  const { data, observado_en, opciones } = leerReporte(value)
  const filtros = leerFiltros(object(data.filtros), consulta)
  const resumen = object(data.totales)
  const totales = { G: leerDecimal(resumen.G, 'G'), UNIDAD: leerDecimal(resumen.UNIDAD, 'UNIDAD') }
  const filas = list(data.filas, item => {
    const row = object(item)
    const ambito = alcance(row, consulta)
    const unidad = leerUnidad(row.unidad)
    const saldo = leerDecimal(row.saldo, unidad)
    if (ambito.vivero_id === null || ambito.vivero === null || unidadesExactas(saldo) === 0n) return fail()
    return { ...ambito, vivero_id: ambito.vivero_id, vivero: ambito.vivero, unidad, saldo }
  }, row => `${row.planta_id}:${row.vivero_id}:${row.unidad}`)

  const suma = { G: 0n, UNIDAD: 0n }
  for (const fila of filas) suma[fila.unidad] += unidadesExactas(fila.saldo)
  if (suma.G !== unidadesExactas(totales.G) || suma.UNIDAD !== unidadesExactas(totales.UNIDAD)) return fail()
  return { observado_en, filtros, opciones, totales, filas }
}

function leerTotales(value: unknown, unidad: UnidadSemilla): TotalesMovimientos {
  const row = object(value)
  return {
    recibido: leerDecimal(row.recibido, unidad), consumido: leerDecimal(row.consumido, unidad),
    descartado: leerDecimal(row.descartado, unidad),
  }
}

export function validarMovimientosSemillas(value: unknown, consulta: FiltrosMermas): ReporteMovimientosSemillas {
  const { data, observado_en, opciones } = leerReporte(value)
  const row = object(data.filtros)
  const filtros = {
    ...leerFiltros(row, consulta),
    desde: validarRegistroFecha(row.desde), hasta: validarRegistroFecha(row.hasta), pagina: cantidad(row.pagina, 1),
  }
  if (filtros.desde !== consulta.desde || filtros.hasta !== consulta.hasta || filtros.desde > filtros.hasta ||
      filtros.pagina !== consulta.pagina || data.tamano_pagina !== 25) return fail()

  const resumen = object(data.totales)
  const totales = {
    G: leerTotales(resumen.G, 'G'), UNIDAD: leerTotales(resumen.UNIDAD, 'UNIDAD'), eventos: cantidad(resumen.eventos),
    eventos_sin_cantidad: cantidad(resumen.eventos_sin_cantidad),
  }
  const detalle = list(data.detalle, item => {
    const event = object(item)
    const fecha = validarRegistroFecha(event.fecha)
    if (fecha < filtros.desde || fecha > filtros.hasta) return fail()
    const unidad = event.unidad === null ? null : leerUnidad(event.unidad)
    const monto = event.cantidad === null ? null : unidad ? leerDecimal(event.cantidad, unidad) : fail()
    if (monto !== null && unidadesExactas(monto) === 0n) return fail()
    return {
      ...alcance(event, consulta), id: validarId(event.id), tipo: leerTipo(event.tipo),
      fecha, recoleccion_id: validarId(event.recoleccion_id), codigo_recoleccion: textoOpcional(event.codigo_recoleccion),
      vivero_destino: textoOpcional(event.vivero_destino), unidad, cantidad: monto,
    }
  }, event => `${event.tipo}:${event.id}`)
  const tamano_pagina = data.tamano_pagina
  if (detalle.length !== Math.min(tamano_pagina, Math.max(0, totales.eventos - (filtros.pagina - 1) * tamano_pagina)) ||
      totales.eventos_sin_cantidad > totales.eventos ||
      detalle.filter(event => event.cantidad === null).length > totales.eventos_sin_cantidad) return fail()
  return { observado_en, filtros, opciones, totales, detalle, tamano_pagina }
}
