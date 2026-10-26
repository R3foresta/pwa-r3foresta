import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, MapPin } from 'lucide-react'
import { Button, Card, Input } from '../../../../components/ui'
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
  const [showCoordinates, setShowCoordinates] = useState(false)
  const active = useRef(0)
  const started = useRef(false)
  useEffect(() => () => { active.current += 1 }, [])
  const parsedLat = parseCoordinate(lat)
  const parsedLng = parseCoordinate(lng)
  const tooPrecise = [lat, lng].some((value) => value.trim() !== '' && !COORDINATE_PATTERN.test(value.trim()))
  const valid = parsedLat !== null && parsedLng !== null && Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180
  const inside = valid ? isPointInPolygon(parsedLat, parsedLng, context.subcampania.poligono) : null

  // Si el GPS responde durante un upload, conservarlo aquí hasta que el
  // controlador pueda persistir el borrador. Nunca perder el punto por busy.
  useEffect(() => {
    if (!disabled && (parsedLat !== latitude || parsedLng !== longitude)) onChange(parsedLat, parsedLng)
  }, [disabled, parsedLat, parsedLng, latitude, longitude, onChange])

  const capture = useCallback(() => {
    started.current = true
    if (!navigator.geolocation) { setError('No pudimos obtener tu ubicación. Puedes marcarla en el mapa.'); return }
    const version = ++active.current
    setCapturing(true); setError(null)
    navigator.geolocation.getCurrentPosition((position) => {
      if (version !== active.current) return
      setLat(String(Number(position.coords.latitude.toFixed(6))))
      setLng(String(Number(position.coords.longitude.toFixed(6))))
      setPrecision(Math.round(position.coords.accuracy)); setCapturing(false)
    }, () => {
      if (version !== active.current) return
      setCapturing(false); setError('No pudimos obtener tu ubicación. Permite el acceso o marca el punto en el mapa.')
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 })
  }, [])

  useEffect(() => {
    if (disabled || started.current || latitude !== null || longitude !== null) return
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) capture() })
    return () => { cancelled = true }
  }, [disabled, latitude, longitude, capture])

  function manual(nextLat: string, nextLng: string) {
    started.current = true
    active.current += 1
    setCapturing(false); setLat(nextLat); setLng(nextLng); setPrecision(null); setError(null)
  }

  return <Card as="section" className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-brand-50 p-2 text-brand-700">{capturing ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : valid ? <Check className="h-5 w-5" aria-hidden="true" /> : <MapPin className="h-5 w-5" aria-hidden="true" />}</div>
      <div><h2 className="font-bold text-brand-800">Ubicación de la plantación</h2><p role="status" className="text-sm text-neutral-600">{capturing ? 'Obteniendo tu ubicación…' : valid ? 'Ubicación lista' : 'Necesitamos el punto donde plantaste'}</p></div>
    </div>
    {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
    {valid && inside === false && <p className="text-sm text-amber-800">El punto está fuera de la zona. Revisa si corresponde al lugar donde plantaste.</p>}
    {valid && precision !== null && precision > 50 && <p className="text-sm text-amber-800">La señal tiene poca precisión. Revisa el punto en el mapa.</p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={disabled} onClick={() => setShowMap((value) => !value)}>{showMap ? 'Cerrar mapa' : valid ? 'Corregir punto en el mapa' : 'Marcar punto en el mapa'}</Button>
      {(error || showMap) && <Button variant="ghost" disabled={disabled || capturing} onClick={capture}>Volver a obtener ubicación</Button>}
    </div>
    {showMap && <><p className="text-sm text-neutral-600">Toca el lugar donde plantaste.</p><Suspense fallback={<p role="status" className="text-sm text-neutral-600">Cargando mapa…</p>}><RegistroLocationMap polygon={context.subcampania.poligono} point={valid ? [parsedLat, parsedLng] : null} onSelect={(nextLat, nextLng) => { if (!disabled) manual(String(Number(nextLat.toFixed(6))), String(Number(nextLng.toFixed(6)))) }} /></Suspense></>}
    <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setShowCoordinates((value) => !value)}>{showCoordinates ? 'Ocultar coordenadas' : 'Editar coordenadas manualmente'}</Button>
    {showCoordinates && <fieldset disabled={disabled} className="grid grid-cols-2 gap-3"><legend className="sr-only">Coordenadas</legend><label className="space-y-1 text-sm text-neutral-600">Latitud<Input value={lat} onChange={(event) => manual(event.target.value, lng)} inputMode="decimal" /></label><label className="space-y-1 text-sm text-neutral-600">Longitud<Input value={lng} onChange={(event) => manual(lat, event.target.value)} inputMode="decimal" /></label></fieldset>}
    {tooPrecise && <p role="alert" className="text-sm text-danger-700">Usa como máximo 6 decimales en cada coordenada manual, sin notación científica.</p>}
  </Card>
}
