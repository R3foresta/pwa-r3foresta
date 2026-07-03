import { useEffect, useRef, useState } from 'react'
import { MapContainer, Polygon, TileLayer } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import type {
  ActivarSubcampaniaData,
  Campania,
  EquipoMember,
  Subcampania,
} from '../types/contracts'
import { TIPO_CAMPANIA_LABEL } from '../types/contracts'
import { loadSubcampaniaBaseDraft } from '../utils/subcampaniaDraft'
import { formatDate, toLatLngTuple } from '../utils/subcampaniaFormatters'
import SubcampaniaSuccessOverlay from './SubcampaniaSuccessOverlay'
import { UserAvatar } from './UserAvatar'

type Props = {
  campania: Campania
  draftId: string
  authId?: string
  onBackToEquipo: () => void
  onSaved: (subcampaniaId: number) => void
  onActivated: (subcampaniaId: number, data: ActivarSubcampaniaData) => void
}

function SubcampaniaResumenStep({
  campania,
  draftId,
  authId,
  onBackToEquipo,
  onSaved,
  onActivated,
}: Props) {
  const [draft] = useState(() => loadSubcampaniaBaseDraft(campania.id, draftId))
  const subcampaniaId = draft?.subcampania_id ?? null

  const [subcampania, setSubcampania] = useState<Subcampania | null>(null)
  const [equipo, setEquipo] = useState<EquipoMember[]>([])
  const [loading, setLoading] = useState(() => subcampaniaId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

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

  // Sube el polígono al backend si sólo existe en el draft local.
  // Evita perderlo cuando se limpia el borrador tras "Guardar" o "Activar".
  const ensurePolygonSynced = async (id: number): Promise<void> => {
    const backendPolygon = subcampania?.poligono ?? null
    const localPolygon = draft?.poligono_geojson ?? null
    if (backendPolygon || !localPolygon) return
    await PlantacionService.setSubcampaniaPoligono(id, localPolygon, authId)
  }

  const handleSave = async () => {
    if (!subcampaniaId || saving || activating || loading || loadError) return
    setSaving(true)
    setSaveError(null)
    try {
      await ensurePolygonSynced(subcampaniaId)
      // Mantener el draft local: sirve de fallback al detalle si el backend
      // no incluye `poligono` en GET /subcampanias/:id. El draft se auto-purga
      // por TTL (30 días) o al activar la subcampaña.
      setShowSuccessOverlay(true)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar la subcampaña.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleOverlayContinue = () => {
    if (subcampaniaId) {
      onSaved(subcampaniaId)
    }
  }

  const handleActivate = async () => {
    if (!subcampaniaId || !subcampania || activating || saving || loading) return
    setActivating(true)
    setActivateError(null)
    try {
      await ensurePolygonSynced(subcampaniaId)
      const data = await PlantacionService.activarSubcampania(subcampaniaId, authId)
      // El draft se mantiene aquí; CrearSubcampanaScreen decide cuándo purgarlo.
      onActivated(subcampaniaId, data)
    } catch (activateErr) {
      setActivateError(
        activateErr instanceof Error
          ? activateErr.message
          : 'No se pudo activar la subcampaña.',
      )
    } finally {
      setActivating(false)
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

  // Precondiciones espejo del backend para habilitar Activar (RN-PLA-08).
  // El plan por especie (SUM %=100 y SUM cantidad=meta) lo valida el backend
  // al recibir POST /activar; si falta, responde 422 con el mensaje exacto.
  const isBorrador = subcampania?.estado === 'BORRADOR'
  const hasCoordinadorBackend = !!coordinador
  const hasPoligonoBackend = !!subcampania?.poligono || !!draft.poligono_geojson
  const hasMetaBackend = (subcampania?.meta_total_arboles ?? 0) >= 1
  const canActivate =
    isBorrador && hasCoordinadorBackend && hasPoligonoBackend && hasMetaBackend
  const activationBlockedReason = !isBorrador
    ? subcampania
      ? `La subcampaña está en estado ${subcampania.estado}.`
      : 'No se pudo confirmar el estado de la subcampaña.'
    : !hasPoligonoBackend
      ? 'Falta definir el polígono (paso 3).'
      : !hasCoordinadorBackend
        ? 'Falta asignar un coordinador (paso 4).'
        : !hasMetaBackend
          ? 'La meta total debe ser mayor a 0.'
          : ''

  return (
    <div className="relative">
      {showSuccessOverlay && (
        <SubcampaniaSuccessOverlay
          phase="success"
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
                      {formatDate(fechaInicio, { fallback: '—' })}
                    </p>
                  </div>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                    <Icon name="date" className="h-4 w-4 shrink-0 text-brand-500" />
                    <p className="text-xs font-extrabold text-brand-800">
                      {formatDate(fechaFin, { fallback: '—' })}
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
                  Metas planificadas. Las reservas de stock se asignan tras activar.
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
          {(activateError || saveError) && (
            <p className="mb-2 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {activateError ?? saveError}
            </p>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToEquipo}
              disabled={saving || activating}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || activating || loading || loadError !== null}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold shadow-soft transition active:scale-[0.99] ${
                saving || activating || loading || loadError !== null
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : 'bg-white text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50'
              }`}
            >
              <Icon name="file" className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar borrador'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleActivate}
            disabled={
              activating || saving || loading || loadError !== null || !canActivate
            }
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
              activating || saving || loading || loadError !== null || !canActivate
                ? 'cursor-not-allowed bg-slate-400/70'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Icon name="check" className="h-5 w-5" />
            {activating ? 'Activando…' : 'Activar subcampaña'}
          </button>
          {!canActivate && !loading && !loadError && subcampania && (
            <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
              {activationBlockedReason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubcampaniaResumenStep
