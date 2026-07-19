import type { GeoJsonPolygon } from '../types/contracts'

// Advertencia UX de GPS fuera del polígono (PLT-FE-003). Es solo orientativa:
// la evaluación final (con tolerancia y distancia) la hace backend al guardar
// y nunca bloquea el registro (`gps_fuera_poligono_bloquea = false`).
//
// Ray casting even-odd sobre todos los anillos del polígono GeoJSON
// (anillo exterior + agujeros). Coordenadas GeoJSON: [lng, lat].
export function isPointInPolygon(
  latitud: number,
  longitud: number,
  poligono: GeoJsonPolygon | null | undefined,
): boolean | null {
  const rings = poligono?.coordinates
  if (!rings || rings.length === 0 || (rings[0]?.length ?? 0) < 4) {
    return null // Polígono no evaluable: no se puede advertir.
  }

  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const intersects =
        yi > latitud !== yj > latitud &&
        longitud < ((xj - xi) * (latitud - yi)) / (yj - yi) + xi
      if (intersects) inside = !inside
    }
  }
  return inside
}
