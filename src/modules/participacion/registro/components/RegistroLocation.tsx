import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Button, Card } from '../../../../components/ui'
import GpsStatusCard from '../../../plantacion/components/registro/GpsStatusCard'
import { isPointInPolygon } from '../../../plantacion/utils/geo'
import type { ContextoRegistro } from '../../registroTypes'

const RegistroLocationMap = lazy(() => import('./RegistroLocationMap'))
const COORDINATE_PATTERN = /^[+-]?(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/
function parseCoordinate(value: string): number | null { return COORDINATE_PATTERN.test(value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null }
type Props = { context: ContextoRegistro; latitude: number | null; longitude: number | null; disabled: boolean; onChange: (latitude: number | null, longitude: number | null) => void }

export default function RegistroLocation({ context, latitude, longitude, disabled, onChange }: Props) {
  const [lat, setLat] = useState(latitude === null ? '' : String(latitude))
  const [lng, setLng] = useState(longitude === null ? '' : String(longitude))
  const [precision, setPrecision] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const active = useRef(0)
  useEffect(() => () => { active.current += 1 }, [])
  const hasCoords = lat.trim() !== '' && lng.trim() !== ''
  const tooPrecise = [lat, lng].some((value) => value.trim() !== '' && !COORDINATE_PATTERN.test(value.trim()))
  const valid = hasCoords && !tooPrecise && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180
  const inside = valid ? isPointInPolygon(Number(lat), Number(lng), context.subcampania.poligono) : null

  function manual(nextLat: string, nextLng: string) {
    active.current += 1
    setCapturing(false); setLat(nextLat); setLng(nextLng); setPrecision(null)
    if (nextLat.trim() && nextLng.trim() && Number.isFinite(Number(nextLat)) && Number.isFinite(Number(nextLng))) {
      setError(null)
      onChange(parseCoordinate(nextLat), parseCoordinate(nextLng))
    } else onChange(parseCoordinate(nextLat), parseCoordinate(nextLng))
  }

  function capture() {
    if (disabled) return
    if (!navigator.geolocation) { setError('El dispositivo no ofrece geolocalización. Introduce las coordenadas manualmente o selecciona el punto en el mapa.'); return }
    const version = ++active.current
    setCapturing(true); setError(null)
    navigator.geolocation.getCurrentPosition((position) => {
      if (version !== active.current) return
      const nextLat = Number(position.coords.latitude.toFixed(6))
      const nextLng = Number(position.coords.longitude.toFixed(6))
      setLat(String(nextLat)); setLng(String(nextLng)); setPrecision(Math.round(position.coords.accuracy)); setCapturing(false)
      onChange(nextLat, nextLng)
    }, () => {
      if (version !== active.current) return
      setCapturing(false); setError('No se pudo capturar GPS o no se autorizó su uso. Puedes introducir coordenadas o seleccionar el punto en el mapa.')
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
  }

  return <div className="space-y-3">
    <fieldset disabled={disabled}>
      <legend className="sr-only">Ubicación de la plantación</legend>
      <GpsStatusCard latitud={lat} longitud={lng} precisionM={precision} loading={capturing} error={valid ? null : error} precisionAdvertenciaM={50} hasCoords={hasCoords} coordsInRange={valid} dentroDePoligono={inside} showValidation={hasCoords && !tooPrecise} onCapture={capture} onChangeLatitud={(value) => manual(value, lng)} onChangeLongitud={(value) => manual(lat, value)} />
    </fieldset>
    <Card className="space-y-3">
      <p className="text-xs text-neutral-600">Coordenadas con hasta 6 decimales. GPS y mapa ajustan su precisión a ese límite.</p>
      {tooPrecise && <p role="alert" className="text-sm text-danger-700">Usa como máximo 6 decimales en cada coordenada manual, sin notación científica.</p>}
      <p className="text-sm text-neutral-600">Revisa y confirma el punto antes de continuar. Una coordenada exterior está permitida; el servidor realizará la evaluación geográfica definitiva.</p>
      <Button variant="secondary" disabled={disabled} onClick={() => setShowMap((value) => !value)}>{showMap ? 'Ocultar mapa' : 'Seleccionar o corregir punto en el mapa'}</Button>
      {showMap && <Suspense fallback={<p role="status" className="text-sm text-neutral-600">Cargando mapa…</p>}><RegistroLocationMap polygon={context.subcampania.poligono} point={valid ? [Number(lat), Number(lng)] : null} onSelect={(nextLat, nextLng) => { if (!disabled) manual(String(Number(nextLat.toFixed(6))), String(Number(nextLng.toFixed(6)))) }} /></Suspense>}
    </Card>
  </div>
}
