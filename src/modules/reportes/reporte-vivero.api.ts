import { ParticipacionApiError, requestPrivada } from '../participacion/api/participacion.transport'
import { ReporteConsultaError } from './reporte-plantaciones.api'
import { validarReporteMermas, validarReporteVivero, type FiltrosMermas, type FiltrosVivero } from './reporte-vivero.contract'

type Seccion = 'vivero' | 'mermas'

export class ReporteViveroConsultaError extends ReporteConsultaError {
  constructor(status: number, seccion: Seccion) {
    super(status)
    this.name = 'ReporteViveroConsultaError'
    if (![400, 401, 403, 422].includes(status)) {
      const consulta = seccion === 'vivero' ? 'el inventario de vivero' : 'las mermas de vivero'
      this.message = `No pudimos consultar ${consulta}. Intenta de nuevo.`
    }
  }
}

function agregarAmbito(query: URLSearchParams, filtros: FiltrosVivero): void {
  if (filtros.planta_id !== null) query.set('planta_id', filtros.planta_id)
  if (filtros.vivero_id !== null) query.set('vivero_id', filtros.vivero_id)
}

async function leer(seccion: Seccion, query: URLSearchParams, token: string, signal?: AbortSignal): Promise<unknown> {
  const search = query.toString()
  const path = `/reportes/${seccion}${search ? `?${search}` : ''}`
  const response = await requestPrivada(path, { signal }, token).catch((error: unknown) => {
    if (error instanceof ParticipacionApiError) throw new ReporteViveroConsultaError(error.status, seccion)
    throw error
  })
  if (response.status !== 200) throw new ReporteViveroConsultaError(response.status, seccion)
  return response.body
}

export async function consultarVivero(filtros: FiltrosVivero, token: string, signal?: AbortSignal) {
  const query = new URLSearchParams()
  agregarAmbito(query, filtros)
  return validarReporteVivero(await leer('vivero', query, token, signal), filtros)
}

export async function consultarMermas(filtros: FiltrosMermas, token: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta, pagina: String(filtros.pagina) })
  agregarAmbito(query, filtros)
  return validarReporteMermas(await leer('mermas', query, token, signal), filtros)
}
