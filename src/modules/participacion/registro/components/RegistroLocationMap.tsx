import { CircleMarker, MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet'
import type { ContextoRegistro } from '../../registroTypes'
import 'leaflet/dist/leaflet.css'

type Props = { polygon: ContextoRegistro['subcampania']['poligono']; point: [number, number] | null; onSelect: (lat: number, lng: number) => void }
function SelectPoint({ onSelect }: Pick<Props, 'onSelect'>) {
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) })
  return null
}
export default function RegistroLocationMap({ polygon, point, onSelect }: Props) {
  const positions = polygon.coordinates.map((ring) => ring.map(([lng, lat]): [number, number] => [lat, lng]))
  const center = point ?? positions[0]?.[0]
  if (!center) return <p className="text-sm text-neutral-600">El mapa no puede representar el polígono. Usa las coordenadas manuales.</p>
  return <div className="h-72 overflow-hidden rounded-3xl ring-1 ring-neutral-200" aria-label="Mapa para elegir ubicación de la plantación">
    <MapContainer key={center.join(',')} center={center} zoom={15} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polygon positions={positions} pathOptions={{ color: '#166534', fillOpacity: 0.15 }} />
      <SelectPoint onSelect={onSelect} />
      {point && <CircleMarker center={point} radius={8} pathOptions={{ color: '#ffffff', fillColor: '#166534', fillOpacity: 1 }} />}
    </MapContainer>
  </div>
}
