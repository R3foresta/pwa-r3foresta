import { ParticipacionApiError, requestPrivada } from '../participacion/api/participacion.transport'
import { ReporteConsultaError } from './reporte-plantaciones.api'
import { validarMovimientosSemillas, validarSaldoSemillas } from './reporte-semillas.contract'
import type { FiltrosMermas, FiltrosVivero } from './reporte-vivero.contract'

class ReporteSemillasConsultaError extends ReporteConsultaError {
  constructor(status: number, lectura: string) {
    super(status)
    if (![400, 401, 403, 422].includes(status)) this.message = `No pudimos consultar ${lectura}. Intenta de nuevo.`
  }
}

function parametros(filtros: FiltrosVivero): URLSearchParams {
  const query = new URLSearchParams()
  if (filtros.planta_id !== null) query.set('planta_id', filtros.planta_id)
  if (filtros.vivero_id !== null) query.set('vivero_id', filtros.vivero_id)
  return query
}

async function leer(path: string, query: URLSearchParams, token: string, lectura: string, signal?: AbortSignal): Promise<unknown> {
  const search = query.toString()
  const response = await requestPrivada(`/reportes/semillas${path}${search ? `?${search}` : ''}`, { signal }, token).catch((error: unknown) => {
    if (error instanceof ParticipacionApiError) throw new ReporteSemillasConsultaError(error.status, lectura)
    throw error
  })
  if (response.status !== 200) throw new ReporteSemillasConsultaError(response.status, lectura)
  return response.body
}

export async function consultarSaldoSemillas(filtros: FiltrosVivero, token: string, signal?: AbortSignal) {
  return validarSaldoSemillas(await leer('', parametros(filtros), token, 'el saldo de semillas', signal), filtros)
}

function parametrosMovimientos(filtros: FiltrosMermas): URLSearchParams {
  const query = parametros(filtros)
  query.set('desde', filtros.desde)
  query.set('hasta', filtros.hasta)
  query.set('pagina', String(filtros.pagina))
  return query
}

export async function consultarMovimientosSemillas(filtros: FiltrosMermas, token: string, signal?: AbortSignal) {
  const query = parametrosMovimientos(filtros)
  return validarMovimientosSemillas(await leer('/movimientos', query, token, 'los movimientos de semillas', signal), filtros)
}

export async function consultarMovimientosSemillasParaExportar(filtros: FiltrosMermas, token: string, signal: AbortSignal) {
  const consulta = { ...filtros, pagina: 1 }
  const query = parametrosMovimientos(consulta)
  query.set('exportar', '1')
  const data = await leer('/movimientos', query, token, 'el historial completo de semillas', signal)
  return validarMovimientosSemillas(data, consulta, true)
}
