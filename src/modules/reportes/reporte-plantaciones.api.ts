import { ParticipacionApiError, requestPrivada } from '../participacion/api/participacion.transport'
import { validarReporte, type EspeciePlantada, type FiltrosReportePlantaciones } from './reporte-plantaciones.contract'
import { validarRegistrosPlantados } from './reporte-plantaciones-registros.contract'

export class ReporteConsultaError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 401 ? 'Tu sesión venció. Vuelve a ingresar para consultar los reportes.'
      : status === 403 ? 'Tu cuenta no tiene acceso a los reportes administrativos.'
        : status === 409 ? 'Los registros cambiaron desde el corte consultado. Actualiza el reporte para ver el detalle vigente.'
        : (status === 400 || status === 422) ? 'Revisa las fechas y los filtros elegidos.'
          : 'No pudimos consultar las plantaciones. Intenta de nuevo.')
    this.status = status
  }
}

function parametrosPlantaciones(filtros: FiltrosReportePlantaciones) {
  const query = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta })
  for (const key of ['organizacion_id', 'campania_id', 'planta_id'] as const) {
    const value = filtros[key]
    if (value) query.set(key, value)
  }
  return query
}

export async function consultarPlantaciones(filtros: FiltrosReportePlantaciones, token: string, signal?: AbortSignal) {
  const response = await requestPrivada(`/reportes/plantaciones?${parametrosPlantaciones(filtros)}`, { signal }, token)
  if (response.status !== 200) throw new ReporteConsultaError(response.status)
  return validarReporte(response.body, filtros)
}

export async function consultarRegistrosPlantados(
  filtros: FiltrosReportePlantaciones, especie: EspeciePlantada, pagina: number, token: string, signal: AbortSignal,
) {
  if (!especie.version_detalle) throw new Error('Actualiza el reporte para consultar sus registros.')
  const query = parametrosPlantaciones(filtros)
  query.set('especie', especie.planta_id ?? 'sin_desglose')
  query.set('version_detalle', especie.version_detalle)
  query.set('pagina', String(pagina))
  const response = await requestPrivada(`/reportes/plantaciones/registros?${query}`, { signal }, token).catch((error: unknown) => {
    if (error instanceof ParticipacionApiError) throw new ReporteConsultaError(error.status)
    throw error
  })
  if (response.status !== 200) throw new ReporteConsultaError(response.status)
  return validarRegistrosPlantados(response.body, filtros, especie, pagina)
}

export async function verificarPermisoExportacion(token: string, signal: AbortSignal): Promise<void> {
  const response = await requestPrivada('/reportes/plantaciones/permiso-exportacion', { signal }, token)
  if (response.status !== 204) throw new ReporteConsultaError(response.status)
}
