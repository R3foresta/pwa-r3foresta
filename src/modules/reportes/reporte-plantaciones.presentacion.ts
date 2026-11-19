import type { EspeciePlantada, FiltrosReportePlantaciones, ReportePlantaciones } from './reporte-plantaciones.contract'

const LA_PAZ = 'America/La_Paz'
const decimal = new Intl.NumberFormat('es-BO')
const percent = new Intl.NumberFormat('es-BO', { style: 'percent', maximumFractionDigits: 1 })
const day = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const month = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const cutoff = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: LA_PAZ })
const localDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: LA_PAZ })

export const formatearCantidad = (value: number) => decimal.format(value)
export const formatearProporcion = (value: number) => percent.format(value)
export const formatearFecha = (value: string) => day.format(new Date(`${value}T00:00:00Z`))
export const formatearMes = (value: string) => month.format(new Date(`${value}-01T00:00:00Z`))
export const formatearCorte = (value: string) => cutoff.format(new Date(value))

export function periodoInicial(now = new Date()): FiltrosReportePlantaciones {
  const parts = localDay.formatToParts(now)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value
  return {
    desde: `${year}-01-01`,
    hasta: `${year}-${month}-${day}`,
    organizacion_id: null,
    campania_id: null,
    planta_id: null,
  }
}

export function nombreEspecie({ nombre_comun, nombre_cientifico, planta_id }: EspeciePlantada): string {
  return nombre_comun ?? nombre_cientifico ?? (planta_id ? `Especie ${planta_id}` : 'Sin desglose de especie')
}

export function filtrosAplicados({ filtros, opciones }: ReportePlantaciones) {
  const optionLabel = (options: { id: string; nombre: string }[], value: string) => options.find(option => option.id === value)?.nombre ?? `ID ${value}`
  return [
    { etiqueta: 'Período', valor: `${formatearFecha(filtros.desde)} – ${formatearFecha(filtros.hasta)}` },
    ...(filtros.organizacion_id ? [{ etiqueta: 'Empresa', valor: optionLabel(opciones.organizaciones, filtros.organizacion_id) }] : []),
    ...(filtros.campania_id ? [{ etiqueta: 'Campaña', valor: optionLabel(opciones.campanias, filtros.campania_id) }] : []),
    ...(filtros.planta_id ? [{ etiqueta: 'Especie', valor: optionLabel(opciones.especies, filtros.planta_id) }] : []),
  ]
}
