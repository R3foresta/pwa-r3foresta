import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, GeoJsonPolygon, GeoJsonPosition } from '../types/contracts'
import {
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
  type SubcampaniaBaseDraft,
  type SubcampaniaPolygonLocationDraft,
} from '../utils/subcampaniaDraft'

type SaveAction = 'draft' | 'next'

type Props = {
  campania: Campania
  draftId: string
  authId?: string
  onDraftSaved: () => void
  onBackToBase: () => void
  onNext: () => void
}

const DEFAULT_CENTER: LatLngTuple = [-16.5, -68.15]
const EARTH_RADIUS_M = 6378137
const TEST_POLYGON_RADIUS_DEGREES = 0.0012

const locationIcon = L.divIcon({
  className: 'subcampania-location-marker',
  html: `
    <span style="display:block;width:20px;height:20px;border-radius:9999px;background:#2563eb;border:4px solid #fff;box-shadow:0 6px 18px rgba(15,23,42,.35);"></span>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6))
}

function samePosition(a: GeoJsonPosition, b: GeoJsonPosition): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

function getOpenRing(poligono?: GeoJsonPolygon | null): GeoJsonPosition[] {
  const ring = poligono?.coordinates[0]
  if (!ring || ring.length === 0) return []

  const last = ring[ring.length - 1]
  const shouldDropClosingPoint = last ? samePosition(ring[0], last) : false
  return shouldDropClosingPoint ? ring.slice(0, -1) : ring
}

function closeRing(points: GeoJsonPosition[]): GeoJsonPosition[] {
  if (points.length === 0) return []
  const first = points[0]
  const last = points[points.length - 1]
  return last && samePosition(first, last) ? points : [...points, first]
}

function buildPolygon(points: GeoJsonPosition[]): GeoJsonPolygon | null {
  if (points.length < 3) return null
  return {
    type: 'Polygon',
    coordinates: [closeRing(points)],
  }
}

function toLatLngTuple([lng, lat]: GeoJsonPosition): LatLngTuple {
  return [lat, lng]
}

function getPolygonValidationError(poligono: GeoJsonPolygon | null): string | null {
  const ring = poligono?.coordinates[0]
  if (!ring || ring.length < 4) {
    return 'Marca al menos 3 vértices para formar el polígono.'
  }

  const first = ring[0]
  const last = ring[ring.length - 1]
  if (!last || !samePosition(first, last)) {
    return 'El anillo del polígono debe estar cerrado.'
  }

  const invalidPoint = ring.find(([lng, lat]) => (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90
  ))

  return invalidPoint ? 'El polígono tiene coordenadas fuera de rango.' : null
}

function calculateAreaHectareas(poligono: GeoJsonPolygon | null): number | null {
  const ring = poligono?.coordinates[0]
  if (!ring || ring.length < 4) return null

  const averageLatitude =
    ring.reduce((total, [, lat]) => total + lat, 0) / ring.length
  const latRefRad = (averageLatitude * Math.PI) / 180
  const projected = ring.map(([lng, lat]) => {
    const x = ((lng * Math.PI) / 180) * EARTH_RADIUS_M * Math.cos(latRefRad)
    const y = ((lat * Math.PI) / 180) * EARTH_RADIUS_M
    return [x, y] as const
  })

  const areaM2 = projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0)

  return Math.abs(areaM2) / 2 / 10000
}

function formatHectareas(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return 'Pendiente'
  return Number(value).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildTestPolygon(location: SubcampaniaPolygonLocationDraft): GeoJsonPosition[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 6
    const lng = location.longitud + Math.cos(angle) * TEST_POLYGON_RADIUS_DEGREES
    const lat = location.latitud + Math.sin(angle) * TEST_POLYGON_RADIUS_DEGREES
    return [roundCoordinate(lng), roundCoordinate(lat)]
  })
}

function buildDraftWithPolygon({
  campania,
  draftId,
  currentDraft,
  poligono,
  areaHectareas,
  areaHectareasEstimada,
  ubicacionPoligono,
  syncedAt,
}: {
  campania: Campania
  draftId: string
  currentDraft: SubcampaniaBaseDraft | null
  poligono: GeoJsonPolygon | null
  areaHectareas: number | null
  areaHectareasEstimada: number | null
  ubicacionPoligono: SubcampaniaPolygonLocationDraft | null
  syncedAt: string | null
}): SubcampaniaBaseDraft {
  const now = new Date().toISOString()

  return {
    draft_id: draftId,
    subcampania_id: currentDraft?.subcampania_id ?? null,
    campania_id: campania.id,
    tipo: campania.tipo,
    nombre: currentDraft?.nombre ?? '',
    comunidad: currentDraft?.comunidad ?? null,
    coordinador: currentDraft?.coordinador ?? null,
    fecha_estimada_inicio: currentDraft?.fecha_estimada_inicio ?? '',
    fecha_estimada_fin: currentDraft?.fecha_estimada_fin ?? '',
    poligono_geojson: poligono,
    area_hectareas: areaHectareas,
    area_hectareas_estimada: areaHectareasEstimada,
    ubicacion_poligono: ubicacionPoligono,
    poligono_backend_sincronizado_at: syncedAt,
    created_at: currentDraft?.created_at ?? now,
    updated_at: now,
  }
}

function requestLocation(
  fuente: SubcampaniaPolygonLocationDraft['fuente'],
  onSuccess: (location: SubcampaniaPolygonLocationDraft) => void,
  onError: (message: string) => void,
  onSettled: () => void,
) {
  if (!navigator.geolocation) {
    onError('Este dispositivo no entregó ubicación GPS.')
    onSettled()
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess({
        latitud: roundCoordinate(position.coords.latitude),
        longitud: roundCoordinate(position.coords.longitude),
        precision_m: Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null,
        fuente,
      })
      onSettled()
    },
    () => {
      onError('No se pudo tomar la ubicación actual.')
      onSettled()
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000,
    },
  )
}

function MapViewport({
  center,
  polygonPositions,
}: {
  center: LatLngTuple
  polygonPositions: LatLngTuple[]
}) {
  const map = useMap()

  useEffect(() => {
    if (polygonPositions.length > 0) {
      map.fitBounds(L.latLngBounds(polygonPositions), {
        maxZoom: 17,
        padding: [24, 24],
      })
      return
    }

    map.setView(center, 15)
  }, [center, map, polygonPositions])

  return null
}

function PolygonEditorEvents({
  onAddVertex,
}: {
  onAddVertex: (point: GeoJsonPosition) => void
}) {
  useMapEvents({
    click(event) {
      onAddVertex([
        roundCoordinate(event.latlng.lng),
        roundCoordinate(event.latlng.lat),
      ])
    },
  })

  return null
}

function SubcampaniaPolygonStep({
  campania,
  draftId,
  authId,
  onDraftSaved,
  onBackToBase,
  onNext,
}: Props) {
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadSubcampaniaBaseDraft(campania.id, draftId),
  )
  const [vertices, setVertices] = useState<GeoJsonPosition[]>(() =>
    getOpenRing(initialDraft?.poligono_geojson),
  )
  const [ubicacionPoligono, setUbicacionPoligono] =
    useState<SubcampaniaPolygonLocationDraft | null>(
      () => initialDraft?.ubicacion_poligono ?? null,
    )
  const [areaHectareas, setAreaHectareas] = useState<number | null>(
    () => initialDraft?.area_hectareas ?? null,
  )
  const [syncedAt, setSyncedAt] = useState<string | null>(
    () => initialDraft?.poligono_backend_sincronizado_at ?? null,
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [polygonError, setPolygonError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const poligono = useMemo(() => buildPolygon(vertices), [vertices])
  const areaHectareasEstimada = useMemo(() => calculateAreaHectareas(poligono), [poligono])
  const polygonPositions = useMemo(
    () => (poligono?.coordinates[0] ?? []).map(toLatLngTuple),
    [poligono],
  )
  const mapCenter = useMemo<LatLngTuple>(() => {
    if (ubicacionPoligono) {
      return [ubicacionPoligono.latitud, ubicacionPoligono.longitud]
    }
    if (vertices[0]) {
      return toLatLngTuple(vertices[0])
    }
    return DEFAULT_CENTER
  }, [ubicacionPoligono, vertices])

  const displayArea = areaHectareas ?? areaHectareasEstimada
  const areaSource = areaHectareas !== null
    ? 'Área oficial backend'
    : areaHectareasEstimada !== null
      ? 'Área estimada local'
      : 'Área pendiente'

  const markPolygonDirty = () => {
    setAreaHectareas(null)
    setSyncedAt(null)
    setStatusMessage(null)
    setSubmitError(null)
    setPolygonError(null)
  }

  const handleAddVertex = (point: GeoJsonPosition) => {
    setVertices((current) => [...current, point])
    markPolygonDirty()
  }

  const handleRemoveLastVertex = () => {
    setVertices((current) => current.slice(0, -1))
    markPolygonDirty()
  }

  const handleClearPolygon = () => {
    setVertices([])
    markPolygonDirty()
  }

  const handleUseCurrentLocation = () => {
    setLocating(true)
    setStatusMessage(null)
    setSubmitError(null)
    requestLocation(
      'GPS_MOVIL',
      (location) => setUbicacionPoligono(location),
      setSubmitError,
      () => setLocating(false),
    )
  }

  const handleGenerateTestPolygon = () => {
    const applyPolygon = (location: SubcampaniaPolygonLocationDraft) => {
      setUbicacionPoligono(location)
      setVertices(buildTestPolygon(location))
      markPolygonDirty()
    }

    if (ubicacionPoligono) {
      applyPolygon({ ...ubicacionPoligono, fuente: 'PRUEBA' })
      return
    }

    setLocating(true)
    setStatusMessage(null)
    setSubmitError(null)
    requestLocation(
      'PRUEBA',
      applyPolygon,
      () => {
        const fallbackLocation: SubcampaniaPolygonLocationDraft = {
          latitud: DEFAULT_CENTER[0],
          longitud: DEFAULT_CENTER[1],
          precision_m: null,
          fuente: 'PRUEBA',
        }
        applyPolygon(fallbackLocation)
        setStatusMessage('Polígono de prueba generado sin GPS del dispositivo.')
      },
      () => setLocating(false),
    )
  }

  const saveLocalDraft = ({
    nextAreaHectareas,
    nextSyncedAt,
  }: {
    nextAreaHectareas: number | null
    nextSyncedAt: string | null
  }) => {
    const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId)
    saveSubcampaniaBaseDraft(
      buildDraftWithPolygon({
        campania,
        draftId,
        currentDraft,
        poligono,
        areaHectareas: poligono ? nextAreaHectareas : null,
        areaHectareasEstimada: poligono ? areaHectareasEstimada : null,
        ubicacionPoligono,
        syncedAt: poligono ? nextSyncedAt : null,
      }),
    )
  }

  const handleSaveStep = async (action: SaveAction) => {
    const validationError = poligono ? getPolygonValidationError(poligono) : null

    setPolygonError(null)
    setSubmitError(null)
    setStatusMessage(null)

    if (action === 'next' && (!poligono || validationError)) {
      setPolygonError(validationError ?? 'Define el polígono antes de continuar.')
      return
    }

    if (poligono && validationError) {
      setPolygonError(validationError)
      return
    }

    const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId)
    const subcampaniaId = currentDraft?.subcampania_id ?? initialDraft?.subcampania_id ?? null
    let nextAreaHectareas = areaHectareas
    let nextSyncedAt = syncedAt

    try {
      setSubmitting(true)

      if (poligono && subcampaniaId) {
        const result = await PlantacionService.setSubcampaniaPoligono(
          subcampaniaId,
          poligono,
          authId,
        )
        nextAreaHectareas = result.area_hectareas ?? null
        nextSyncedAt = new Date().toISOString()
        setAreaHectareas(nextAreaHectareas)
        setSyncedAt(nextSyncedAt)
      } else if (poligono) {
        nextAreaHectareas = null
        nextSyncedAt = null
      }

      saveLocalDraft({ nextAreaHectareas, nextSyncedAt })

      if (action === 'draft') {
        onDraftSaved()
        return
      }

      onNext()
    } catch (saveError) {
      setSubmitError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el polígono.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!initialDraft) {
    return (
      <>
        <main className="space-y-4 px-5 pt-4">
          <section className="rounded-3xl bg-amber-50 p-4 shadow-soft ring-1 ring-amber-100">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Icon name="info" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-950">
                  Guarda primero los datos base
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
                  El polígono se guarda sobre el mismo borrador de la subcampaña.
                </p>
              </div>
            </div>
          </section>
        </main>
        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
            <button
              type="button"
              onClick={onBackToBase}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
            >
              Volver al paso anterior
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="space-y-4 px-5 pt-4">
        <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Delimitación territorial
              </p>
              <h2 className="mt-1 text-lg font-extrabold leading-tight text-brand-800">
                {initialDraft.nombre || 'Subcampaña sin nombre'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onBackToBase}
              className="shrink-0 rounded-full bg-brand-50 px-3 py-2 text-[11px] font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
            >
              Atrás
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                Vértices
              </p>
              <p className="mt-0.5 text-xl font-extrabold tabular-nums text-brand-800">
                {vertices.length}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                {areaSource}
              </p>
              <p className="mt-0.5 text-xl font-extrabold tabular-nums text-brand-800">
                {formatHectareas(displayArea)} ha
              </p>
            </div>
          </div>

          <div className="h-[330px] overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200">
            <MapContainer
              center={mapCenter}
              zoom={15}
              scrollWheelZoom
              attributionControl={false}
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
              <MapViewport center={mapCenter} polygonPositions={polygonPositions} />
              <PolygonEditorEvents onAddVertex={handleAddVertex} />

              {ubicacionPoligono && (
                <Marker
                  position={[ubicacionPoligono.latitud, ubicacionPoligono.longitud]}
                  icon={locationIcon}
                />
              )}

              {polygonPositions.length > 0 && (
                <Polygon
                  positions={polygonPositions}
                  pathOptions={{
                    color: '#166534',
                    fillColor: '#22c55e',
                    fillOpacity: 0.25,
                    weight: 3,
                  }}
                />
              )}

              {vertices.map((point, index) => (
                <CircleMarker
                  key={`${point[0]}-${point[1]}-${index}`}
                  center={toLatLngTuple(point)}
                  radius={5}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#166534',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                />
              ))}
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating || submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Icon name="pin" className="h-4 w-4" />
              {locating ? 'Obteniendo GPS…' : 'GPS actual'}
            </button>
            <button
              type="button"
              onClick={handleGenerateTestPolygon}
              disabled={locating || submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Icon name="map" className="h-4 w-4" />
              Polígono prueba
            </button>
            <button
              type="button"
              onClick={handleRemoveLastVertex}
              disabled={vertices.length === 0 || submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-extrabold text-slate-700 shadow-soft ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="x" className="h-4 w-4" />
              Quitar último
            </button>
            <button
              type="button"
              onClick={handleClearPolygon}
              disabled={vertices.length === 0 || submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-extrabold text-red-700 shadow-soft ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="trash" className="h-4 w-4" />
              Limpiar
            </button>
          </div>

          {ubicacionPoligono && (
            <div className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Ubicación de referencia
              </p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-slate-700">
                {ubicacionPoligono.latitud}, {ubicacionPoligono.longitud}
                {ubicacionPoligono.precision_m
                  ? ` · precisión ${ubicacionPoligono.precision_m} m`
                  : ''}
                {' · '}
                {ubicacionPoligono.fuente}
              </p>
            </div>
          )}

          {polygonError && (
            <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 ring-1 ring-red-100">
              {polygonError}
            </p>
          )}
        </section>
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
          {statusMessage && (
            <p className="mb-2 rounded-2xl bg-emerald-50 px-4 py-2 text-center text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              {statusMessage}
            </p>
          )}
          {submitError && (
            <p className="mb-2 rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {submitError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleSaveStep('draft')}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-4 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              <Icon name="file" className="h-4 w-4" />
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => void handleSaveStep('next')}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Guardando…' : 'Siguiente'}
              {!submitting && <Icon name="chevron-right" className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SubcampaniaPolygonStep
