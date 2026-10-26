import type { FeatureCollection, Polygon } from 'geojson'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'

export type ImpactoMapGroup = {
  id: string
  coordinates: [number, number]
  puntos: ImpactoPunto[]
  selected: boolean
}

export type ImpactoMapData = {
  zones: FeatureCollection<Polygon, { id: string; selected: boolean }>
  groups: ImpactoMapGroup[]
  coordinates: [number, number][]
  bounds: [[number, number], [number, number]] | null
  geometryKey: string
}

/** El contrato ya entrega GeoJSON lng/lat; conservar anillos interiores e IDs BIGINT. */
export function buildImpactoMapData(subcampanias: Pick<ImpactoSubcampania, 'id' | 'nombre' | 'poligono'>[], puntos: ImpactoPunto[], seleccion: string | null): ImpactoMapData {
  const zones: ImpactoMapData['zones'] = {
    type: 'FeatureCollection',
    features: subcampanias.flatMap(zone => zone.poligono ? [{
      type: 'Feature' as const,
      id: zone.id,
      geometry: zone.poligono,
      properties: { id: zone.id, selected: seleccion === `s:${zone.id}` },
    }] : []),
  }
  const grouped = new Map<string, ImpactoMapGroup>()
  for (const point of puntos) {
    const id = `${point.longitud},${point.latitud}`
    const group = grouped.get(id) ?? { id, coordinates: [point.longitud, point.latitud], puntos: [], selected: false }
    group.puntos.push(point)
    group.selected ||= seleccion === `r:${point.registro_id}`
    grouped.set(id, group)
  }
  const groups = [...grouped.values()]
  const coordinates: [number, number][] = [
    ...subcampanias.flatMap(zone => zone.poligono?.coordinates.flat() ?? []),
    ...groups.map(group => group.coordinates),
  ]
  let bounds: ImpactoMapData['bounds'] = null
  for (const [lng, lat] of coordinates) {
    if (!bounds) bounds = [[lng, lat], [lng, lat]]
    else {
      bounds[0][0] = Math.min(bounds[0][0], lng)
      bounds[0][1] = Math.min(bounds[0][1], lat)
      bounds[1][0] = Math.max(bounds[1][0], lng)
      bounds[1][1] = Math.max(bounds[1][1], lat)
    }
  }
  return { zones, groups, coordinates, bounds, geometryKey: JSON.stringify(coordinates) }
}

export function getImpactoGroupSelection(group: ImpactoMapGroup): string | null {
  const first = group.puntos[0]
  if (!first) return null
  if (group.puntos.length === 1) return `r:${first.registro_id}`
  return group.puntos.every(point => point.subcampania_id === first.subcampania_id) ? `s:${first.subcampania_id}` : null
}
