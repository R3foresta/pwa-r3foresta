import { requestPrivada } from '../participacion/api/participacion.transport'
import { validarReporte, type FiltrosReportePlantaciones } from './reporte-plantaciones.contract'

export class ReporteConsultaError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 401 ? 'Tu sesión venció. Vuelve a ingresar para consultar los reportes.'
      : status === 403 ? 'Tu cuenta no tiene acceso a los reportes administrativos.'
        : (status === 400 || status === 422) ? 'Revisa las fechas y los filtros elegidos.'
          : 'No pudimos consultar las plantaciones. Intenta de nuevo.')
    this.status = status
  }
}

export async function consultarPlantaciones(filtros: FiltrosReportePlantaciones, token: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta })
  for (const key of ['organizacion_id', 'campania_id', 'planta_id'] as const) {
    const value = filtros[key]
    if (value) query.set(key, value)
  }
  const response = await requestPrivada(`/reportes/plantaciones?${query}`, { signal }, token)
  if (response.status !== 200) throw new ReporteConsultaError(response.status)
  return validarReporte(response.body, filtros)
}

export async function verificarPermisoExportacion(token: string, signal: AbortSignal): Promise<void> {
  const response = await requestPrivada('/reportes/plantaciones/permiso-exportacion', { signal }, token)
  if (response.status !== 204) throw new ReporteConsultaError(response.status)
}
