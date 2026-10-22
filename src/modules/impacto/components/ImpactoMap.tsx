import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import { Button } from '../../../components/ui'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'
import 'leaflet/dist/leaflet.css'

type Props = {
  subcampanias: ImpactoSubcampania[]
  puntos: ImpactoPunto[]
  seleccion: string | null
  onSelect: (value: string) => void
}

function FitArea({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap()
  const serialized = JSON.stringify(coordinates)
  useEffect(() => {
    const points = JSON.parse(serialized) as [number, number][]
    const fit = () => {
      map.invalidateSize({ pan: false })
      if (points.length) map.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: false })
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, serialized])
  return null
}

export default function ImpactoMap({ subcampanias, puntos, seleccion, onSelect }: Props) {
  const polygons = subcampanias.filter((scope) => scope.poligono).map((scope) => ({
    scope,
    positions: scope.poligono!.coordinates.map((ring) => ring.map(([lng, lat]): [number, number] => [lat, lng])),
  }))
  const coordinates: [number, number][] = [...polygons.flatMap((polygon) => polygon.positions.flat()), ...puntos.map((point): [number, number] => [point.latitud, point.longitud])]
  const groups = new Map<string, ImpactoPunto[]>()
  puntos.forEach((point) => {
    const key = `${point.latitud},${point.longitud}`
    groups.set(key, [...(groups.get(key) ?? []), point])
  })
  if (!coordinates.length) return <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">No hay ubicaciones públicas para representar en este alcance.</p>
  return <div className="relative isolate h-[280px] overflow-hidden rounded-3xl ring-1 ring-brand-200 sm:h-[360px] [&_.leaflet-tile-pane]:saturate-50" role="region" aria-label="Mapa público de zonas y registros grupales">
    <MapContainer center={coordinates[0]} zoom={12} className="h-full w-full" scrollWheelZoom={false} zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ZoomControl position="bottomright" />
      <FitArea coordinates={coordinates} />
      {polygons.map(({ scope, positions }) => <Polygon key={scope.id} positions={positions} pathOptions={{ color: seleccion === `s:${scope.id}` ? '#b45309' : '#166534', fillOpacity: seleccion === `s:${scope.id}` ? 0.3 : 0.08 }} eventHandlers={{ click: () => onSelect(`s:${scope.id}`) }}><Popup><p className="font-bold">{scope.nombre}</p><p>Zona de trabajo</p><Button size="sm" variant="secondary" onClick={() => onSelect(`s:${scope.id}`)}>Ver resumen de la zona</Button></Popup></Polygon>)}
      {[...groups].map(([key, points]) => <CircleMarker key={key} center={[points[0].latitud, points[0].longitud]} radius={points.length > 1 ? 10 : 7} pathOptions={{ color: '#ffffff', fillColor: points.some((point) => seleccion === `r:${point.registro_id}`) ? '#b45309' : '#166534', fillOpacity: 1 }} eventHandlers={{ click: () => { if (points.length === 1) onSelect(`r:${points[0].registro_id}`) } }}><Popup><div className="space-y-2"><p className="font-bold">{points.length === 1 ? 'Registro grupal' : `${points.length} registros en esta ubicación`}</p>{points.map((point) => <Button key={point.registro_id} size="sm" variant="secondary" onClick={() => onSelect(`r:${point.registro_id}`)}>Registro {point.registro_id}: {point.cantidad_total_plantada} {point.es_reposicion ? 'reposiciones' : 'iniciales'}</Button>)}</div></Popup></CircleMarker>)}
    </MapContainer>
  </div>
}
