import type { UbicacionApi } from '../types/ubicacion'

export function getUbicacionTitulo(ubicacion?: UbicacionApi | null): string {
  if (!ubicacion) return ''
  return [ubicacion.nombre, ubicacion.referencia].filter(Boolean).join(' - ')
}

export function getUbicacionDivision(ubicacion?: UbicacionApi | null): string {
  if (!ubicacion?.division?.ruta?.length) return ''
  return ubicacion.division.ruta.map((item) => item.nombre).join(', ')
}

export function getUbicacionCoords(
  ubicacion?: UbicacionApi | null,
  digits = 6,
): string {
  const lat = ubicacion?.coordenadas?.lat
  const lon = ubicacion?.coordenadas?.lon
  if (lat === null || lon === null || lat === undefined || lon === undefined) {
    return ''
  }
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`
}

export function getUbicacionDisplay(ubicacion?: UbicacionApi | null): string {
  const titulo = getUbicacionTitulo(ubicacion)
  if (titulo) return titulo

  const division = getUbicacionDivision(ubicacion)
  if (division) return division

  const coords = getUbicacionCoords(ubicacion)
  if (coords) return coords

  return 'Sin ubicación'
}
