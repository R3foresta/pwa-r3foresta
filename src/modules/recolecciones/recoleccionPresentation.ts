import type { Recoleccion } from '../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay } from '../../utils/recoleccionUnidad'

export function formatRecoleccionDate(value: string | null | undefined, month: '2-digit' | 'long' = '2-digit') {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No disponible'
  // Las fechas operativas representan un día, no la zona horaria del dispositivo.
  return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month, year: 'numeric', timeZone: 'UTC' })
}

export function formatRecoleccionDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No disponible'
  return new Date(value).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' })
}

export function formatRecoleccionCantidad(value: number | null | undefined, unidad: Recoleccion['unidad_canonica']) {
  if (value == null || !Number.isFinite(value) || unidad == null) return 'No disponible'
  const cantidad = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 6 }).format(value)
  return `${cantidad} ${formatUnidadCanonicaDisplay(unidad, value)}`
}
