import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import type { Polygon as GeoJsonPolygon } from 'geojson'
import { MapContainer, Polygon, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../Icon'
import OpenFreeMapBaseLayer from './OpenFreeMapBaseLayer'

export type PolygonMapPreviewProps = {
  polygons: { id: string; poligono: GeoJsonPolygon }[]
  label: string
  onClick: () => void
}

function MapFitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { maxZoom: 17, padding: [24, 24] })
    }
  }, [map, positions])

  return null
}

/** Vista pasiva: conserva los anillos interiores y abre el mapa al pulsarla. */
export default function PolygonMapPreview({ polygons, label, onClick }: PolygonMapPreviewProps) {
  const shapes = useMemo(() => polygons.map(polygon => ({
    id: polygon.id,
    rings: polygon.poligono.coordinates.map(ring => ring.map(([lng, lat]): LatLngTuple => [lat, lng])),
  })), [polygons])
  const positions = useMemo(() => shapes.flatMap(shape => shape.rings.flat()), [shapes])

  return (
    <div
      className="relative isolate z-0 block h-[150px] w-full overflow-hidden rounded-3xl bg-neutral-100 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300"
    >
      {/* El botón precede a los créditos en el orden de Tab. Los controles de
          Leaflet (z-1000) quedan sobre esta superficie y conservan sus enlaces. */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Ver mapa completo"
        className="absolute inset-0 z-[700] w-full rounded-3xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700"
      >
        <span className="absolute bottom-7 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-brand-800 shadow-soft backdrop-blur">
          <Icon name="pin" className="h-3.5 w-3.5 text-success-600" />
          {label}
        </span>
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-700 shadow-soft backdrop-blur">
          Ver mapa
          <Icon name="chevron-right" className="h-3 w-3" />
        </span>
      </button>
      <div className="pointer-events-none absolute inset-0">
        {positions.length > 0 ? <MapContainer
          center={positions[0]}
          zoom={14}
          maxZoom={19}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          zoomControl={false}
          className="h-full w-full"
        >
          <OpenFreeMapBaseLayer allowRetry={false} />
          <MapFitBounds positions={positions} />
          {shapes.map(shape => <Polygon
            key={shape.id}
            positions={shape.rings}
            interactive={false}
            pathOptions={{ color: '#166534', fillColor: '#22c55e', fillOpacity: 0.25, weight: 3 }}
          />)}
        </MapContainer> : <p className="flex h-full items-center justify-center px-4 text-sm text-neutral-500">Sin polígonos disponibles</p>}
      </div>
    </div>
  )
}
