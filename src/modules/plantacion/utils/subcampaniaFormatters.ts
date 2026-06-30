import type { LatLngTuple } from 'leaflet'
import type { GeoJsonPosition } from '../types/contracts'

export function formatDate(
  value?: string | null,
  opts?: { fallback?: string },
): string {
  const fallback = opts?.fallback ?? 'Sin definir'
  if (!value) return fallback
  const [y, m, d] = value.split('-')
  const date =
    y && m && d && value.length === 10
      ? new Date(Number(y), Number(m) - 1, Number(d))
      : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function toLatLngTuple([lng, lat]: GeoJsonPosition): LatLngTuple {
  return [lat, lng]
}
