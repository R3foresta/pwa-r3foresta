import { useEffect, useRef, useState } from 'react'
import { MapContainer, Polygon, TileLayer } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, EquipoMember, GeoJsonPosition, Subcampania } from '../types/contracts'
import { TIPO_CAMPANIA_LABEL } from '../types/contracts'
import {
  clearSubcampaniaBaseDraft,
  loadSubcampaniaBaseDraft,
} from '../utils/subcampaniaDraft'
import SubcampaniaSuccessOverlay from './SubcampaniaSuccessOverlay'
import { UserAvatar } from './UserAvatar'

type Props = {
  campania: Campania
  draftId: string
  authId?: string
  onDraftSaved: () => void
  onBackToEquipo: () => void
  onPublished: (subcampaniaId: number) => void
}

type OverlayPhase = 'saving' | 'success'

function toLatLngTuple([lng, lat]: GeoJsonPosition): LatLngTuple {
  return [lat, lng]
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


function SubcampaniaResumenStep({
  campania,
  draftId,
  authId,
  onDraftSaved,
  onBackToEquipo,
  onPublished,
}: Props) {
  const draft = loadSubcampaniaBaseDraft(campania.id, draftId)
  const subcampaniaId = draft?.subcampania_id ?? null

  const [subcampania, setSubcampania] = useState<Subcampania | null>(null)
  const [equipo, setEquipo] = useState<EquipoMember[]>([])
  const [loading, setLoading] = useState(() => subcampaniaId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase | null>(null)

  const requestRef = useRef(0)

  useEffect(() => {
    if (!subcampaniaId) return

    const requestId = ++requestRef.current

    Promise.all([
      PlantacionService.getSubcampania(subcampaniaId, authId),
      PlantacionService.getSubcampaniaEquipo(subcampaniaId, authId),
    ])
      .then(([sub, members]) => {
        if (requestId !== requestRef.current) return
        setSubcampania(sub)
        setEquipo(members)
      })
      .catch((err) => {
        if (requestId !== requestRef.current) return
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar el resumen.',
        )
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false)
      })
  }, [subcampaniaId, authId])

  const handleDraftSaved = () => {
    clearSubcampaniaBaseDraft(campania.id, draftId)
    onDraftSaved()
  }

  const handlePublish = async () => {
    if (!subcampaniaId || publishing || loading) return
    setPublishError(null)
    setPublishing(true)
    setOverlayPhase('saving')

    try {
      await PlantacionService.activarSubcampania(subcampaniaId, authId)
      setOverlayPhase('success')
    } catch (err) {
      setPublishing(false)
      setOverlayPhase(null)
      setPublishError(err instanceof Error ? err.message : 'No se pudo publicar la subcampaña.')
    }
  }

  const handleOverlayContinue = () => {
    clearSubcampaniaBaseDraft(campania.id, draftId)
    if (subcampaniaId) {
      onPublished(subcampaniaId)
    }
  }

  // Sin draft o sin subcampania_id
  if (!draft || !subcampaniaId) {
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
                  La subcampaña aún no fue creada
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
                  Completa los pasos anteriores antes de revisar el resumen.
                </p>
              </div>
            </div>
          </section>
        </main>
        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
            <button
              type="button"
              onClick={onBackToEquipo}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
            >
              Volver al paso anterior
            </button>
          </div>
        </div>
      </>
    )
  }

  // Datos derivados
  const nombreSubcampania = subcampania?.nombre ?? draft.nombre
  const poligono = subcampania?.poligono ?? draft.poligono_geojson ?? null
  const polygonPositions: LatLngTuple[] =
    poligono?.coordinates[0]?.map(toLatLngTuple) ?? []
  const mapCenter: LatLngTuple = polygonPositions[0] ?? [-16.5, -68.15]

  const areaHectareas =
    subcampania?.saldo_vivo_actual !== undefined
      ? null // saldo_vivo_actual no es ha, no usamos eso
      : draft.area_hectareas ?? null

  const areaDisplay = draft.area_hectareas ?? null

  const metaTotal = subcampania?.meta_total_arboles ?? draft.meta_total_arboles ?? null
  const fechaInicio = subcampania?.fecha_estimada_inicio ?? draft.fecha_estimada_inicio
  const fechaFin = subcampania?.fecha_estimada_fin ?? draft.fecha_estimada_fin
  const descripcion = subcampania?.descripcion ?? null

  const coordinador = equipo.find((m) => m.rol === 'COORDINADOR') ?? null
  const operarios = equipo.filter((m) => m.rol === 'OPERARIO')
  const allMembers = coordinador ? [coordinador, ...operarios] : operarios

  const especies = draft.especies ?? []
  const especiesLabel = especies
    .map(
      (e) =>
        `${e.pct}% ${e.nombre_comun_principal || e.especie}`,
    )
    .join(' · ')

  const comunidadRuta = draft.comunidad
    ? [
        draft.comunidad.pais?.nombre,
        draft.comunidad.nivel1?.nombre,
        draft.comunidad.nivel2?.nombre,
        draft.comunidad.nivel3?.nombre,
        draft.comunidad.nivel4?.nombre || draft.comunidad.nombre,
      ]
        .filter(Boolean)
        .join(' / ')
    : null

  // Evitar variable no usada de TypeScript
  void areaHectareas

  return (
    <div className="relative">
      {/* Overlay de publicación */}
      {overlayPhase && (
        <SubcampaniaSuccessOverlay
          phase={overlayPhase}
          nombre={nombreSubcampania}
          onContinue={handleOverlayContinue}
        />
      )}

      <main className="space-y-4 px-5 pt-4">

        {/* Header con nombre y estado */}
        <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
                {TIPO_CAMPANIA_LABEL[campania.tipo]}
              </p>
              <h2 className="mt-1 truncate text-xl font-extrabold leading-tight text-white">
                {nombreSubcampania}
              </h2>
            </div>
            <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white ring-1 ring-white/25">
              <Icon name="file" className="h-3 w-3" />
              BORRADOR
            </span>
          </div>
        </section>

        {/* Skeleton de carga */}
        {loading && (
          <section className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </section>
        )}

        {loadError && (
          <p className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
            {loadError}
          </p>
        )}

        {!loading && (
          <>
            {/* Stats grid */}
            <section className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                  Meta total
                </p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums leading-none text-brand-800">
                  {metaTotal != null ? metaTotal.toLocaleString('es-BO') : '—'}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">árboles</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                  Equipo
                </p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums leading-none text-brand-800">
                  {allMembers.length}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">
                  {allMembers.length === 1 ? 'miembro' : 'miembros'}
                </p>
              </div>
              {areaDisplay != null && (
                <div className="col-span-2 rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
                    Área
                  </p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums leading-none text-brand-800">
                    {Number(areaDisplay).toLocaleString('es-BO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ha
                  </p>
                </div>
              )}
            </section>

            {/* Mapa */}
            <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
              <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                Polígono
              </p>
              {polygonPositions.length > 0 ? (
                <div className="h-40 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    attributionControl={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                    />
                    <Polygon
                      positions={polygonPositions}
                      pathOptions={{
                        color: '#166534',
                        fillColor: '#22c55e',
                        fillOpacity: 0.25,
                        weight: 2,
                      }}
                    />
                  </MapContainer>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <Icon name="info" className="h-5 w-5 shrink-0 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500">
                    Aún no se definió el polígono.
                  </p>
                </div>
              )}
            </section>

            {/* Calendario */}
            {(fechaInicio || fechaFin) && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Calendario estimado
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                    <Icon name="date" className="h-4 w-4 shrink-0 text-brand-500" />
                    <p className="text-xs font-extrabold text-brand-800">
                      {formatDate(fechaInicio)}
                    </p>
                  </div>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                    <Icon name="date" className="h-4 w-4 shrink-0 text-brand-500" />
                    <p className="text-xs font-extrabold text-brand-800">
                      {formatDate(fechaFin)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Comunidad / zona */}
            {comunidadRuta && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Comunidad / Zona
                </p>
                <div className="rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                  <p className="text-xs font-semibold leading-relaxed text-brand-700">
                    {comunidadRuta}
                  </p>
                </div>
              </section>
            )}

            {/* Organizaciones */}
            {campania.organizaciones && campania.organizaciones.length > 0 && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Organizaciones
                </p>
                <div className="flex flex-wrap gap-2">
                  {campania.organizaciones.map((org) => (
                    <span
                      key={org.id}
                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700 ring-1 ring-brand-100"
                    >
                      {org.nombre}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Descripción */}
            {descripcion && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Descripción
                </p>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">
                  {descripcion}
                </p>
              </section>
            )}

            {/* Especies planificadas */}
            {especies.length > 0 && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Especies planificadas
                </p>
                <p className="text-sm font-extrabold leading-relaxed text-brand-800">
                  {especiesLabel}
                </p>
                <p className="mt-1.5 text-[10.5px] font-semibold italic text-slate-400">
                  Planificación local — aún no reservada en vivero.
                </p>
              </section>
            )}

            {/* Equipo */}
            {allMembers.length > 0 && (
              <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                  Equipo
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {allMembers.slice(0, 5).map((m) => (
                      <UserAvatar
                        key={m.usuario_id}
                        nombre={m.nombre_usuario ?? '?'}
                        fotoUrl={m.foto_perfil_url}
                        title={m.nombre_usuario ?? String(m.usuario_id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800 ring-2 ring-white"
                      />
                    ))}
                    {allMembers.length > 5 && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-700 ring-2 ring-white">
                        +{allMembers.length - 5}
                      </span>
                    )}
                  </div>
                  <p className="min-w-0 text-xs font-semibold leading-snug text-slate-600">
                    {allMembers
                      .slice(0, 3)
                      .map((m) => m.nombre_usuario ?? `Usuario ${m.usuario_id}`)
                      .join(', ')}
                    {allMembers.length > 3 ? ` y ${allMembers.length - 3} más` : ''}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
          {publishError && (
            <p className="mb-2 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {publishError}
            </p>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToEquipo}
              disabled={publishing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="button"
              onClick={handleDraftSaved}
              disabled={publishing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="file" className="h-4 w-4" />
              Guardar borrador
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={publishing || loading || loadError !== null}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
              publishing || loading || loadError !== null
                ? 'cursor-not-allowed bg-slate-400/70'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {publishing ? (
              'Publicando…'
            ) : (
              <>
                <Icon name="check" className="h-5 w-5" />
                Publicar subcampaña
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubcampaniaResumenStep
