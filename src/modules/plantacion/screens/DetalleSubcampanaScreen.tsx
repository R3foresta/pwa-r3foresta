import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet'
import { useNavigate, useParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import {
  TIPO_CAMPANIA_LABEL,
  type ActivarSubcampaniaData,
  type EquipoMember,
  type EstadoSubcampania,
  type GeoJsonPolygon,
  type GetPlanData,
  type Subcampania,
} from '../types/contracts'
import { formatDate, toLatLngTuple } from '../utils/subcampaniaFormatters'
import { loadSubcampaniaBaseDrafts } from '../utils/subcampaniaDraft'
import { UserAvatar } from '../components/UserAvatar'
import CancelarSubcampaniaModal from '../components/CancelarSubcampaniaModal'
import { SubcampaniaEquipoManager } from '../components/SubcampaniaEquipoManager'

// Estados en los que un ADMIN puede gestionar el equipo (agregar/quitar
// operarios) desde el detalle. La gestión de equipo va por su propio servicio y
// no la bloquea `EdicionPorEstadoPolicy`, por eso incluye ACTIVA.
const EQUIPO_EDITABLE_ESTADOS: EstadoSubcampania[] = ['BORRADOR', 'ACTIVA', 'PAUSADA']

function buildWizardUrl(
  campaniaId: number,
  subcampaniaId: number,
  step: number,
): string {
  const drafts = loadSubcampaniaBaseDrafts(campaniaId)
  const existingDraft = drafts.find((d) => d.subcampania_id === subcampaniaId)
  const params = new URLSearchParams({
    subcampaniaId: String(subcampaniaId),
    step: String(step),
  })
  if (existingDraft) params.set('draftId', existingDraft.draft_id)
  return `/app/planting/campanias/${campaniaId}/subcampanias/new?${params.toString()}`
}

type DetailTab = 'resumen' | 'equipo' | 'mapa'

function getPolygonPositions(poligono: GeoJsonPolygon | null | undefined): LatLngTuple[] {
  return (poligono?.coordinates[0] ?? []).map(toLatLngTuple)
}

// ─────────────────────────────────────────────────────────────────────────────
// Métricas derivadas del contrato (solo datos reales del backend)
// ─────────────────────────────────────────────────────────────────────────────

function getPlantados(sub: Subcampania): number {
  return sub.plantados ?? sub.total_plantado_inicial ?? 0
}

function getAvancePct(sub: Subcampania): number {
  if (sub.avance_pct != null && Number.isFinite(sub.avance_pct)) {
    return Math.round(sub.avance_pct)
  }
  if (!sub.meta_total_arboles) return 0
  return Math.round((getPlantados(sub) / sub.meta_total_arboles) * 100)
}

// Supervivencia = saldo vivo / (plantado inicial + repuesto). Solo se muestra
// cuando el backend entrega los campos; no se inventa dato.
function getSupervivenciaPct(sub: Subcampania): number | null {
  const base = (sub.total_plantado_inicial ?? 0) + (sub.total_repuesto ?? 0)
  if (base <= 0 || sub.saldo_vivo_actual == null) return null
  return Math.max(0, Math.min(100, Math.round((sub.saldo_vivo_actual / base) * 100)))
}

function formatHectareas(value?: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(value)
}

function clampPct(pct: number): number {
  return Math.max(0, Math.min(100, pct))
}

// ─────────────────────────────────────────────────────────────────────────────
// Small visual pieces
// ─────────────────────────────────────────────────────────────────────────────

function StateBadgeLight({ estado }: { estado: EstadoSubcampania }) {
  const map: Record<EstadoSubcampania, string> = {
    BORRADOR: 'bg-warning-400/20 text-warning-100 ring-warning-300/40',
    ACTIVA: 'bg-success-400/20 text-success-100 ring-success-300/40',
    COMPLETADA: 'bg-white/15 text-white ring-white/20',
    FINALIZADA_PARCIAL: 'bg-white/15 text-white ring-white/20',
    PAUSADA: 'bg-warning-400/20 text-warning-100 ring-warning-300/40',
    CANCELADA: 'bg-danger-400/20 text-danger-100 ring-danger-300/40',
  }

  const tone = map[estado] ?? map.COMPLETADA

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {estado.replace(/_/g, ' ')}
    </span>
  )
}

function FaseBadgeLight({ fase }: { fase: Subcampania['fase_mantenimiento'] }) {
  if (!fase || fase === 'NO_APLICA') return null
  const label = fase === 'MANTENIMIENTO_ACTIVO' ? 'Mantenimiento' : 'Monitoreo'
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-info-400/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-info-100 ring-1 ring-info-300/40">
      <Icon name="shield" className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function SubcampanaHeader({
  sub,
  onBack,
  onMore,
}: {
  sub: Subcampania
  onBack: () => void
  onMore: () => void
}) {
  const tipoLabel = sub.tipo ? TIPO_CAMPANIA_LABEL[sub.tipo] : null
  const plantados = getPlantados(sub)
  const pct = getAvancePct(sub)

  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={plantacionHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-brand-700/95" />
      <div className="relative px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
            aria-label="Volver"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <StateBadgeLight estado={sub.estado} />
            <FaseBadgeLight fase={sub.fase_mantenimiento} />
            <button
              type="button"
              onClick={onMore}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              aria-label="Más opciones"
            >
              <Icon name="ellipsis" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {sub.codigo_trazabilidad && (
          <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">
            {sub.codigo_trazabilidad}
          </p>
        )}
        <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          {sub.nombre}
        </h1>

        {tipoLabel && (
          <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white ring-1 ring-white/20">
            {tipoLabel}
          </span>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="date" className="h-3.5 w-3.5" />
            {formatDate(sub.fecha_estimada_inicio)} &rarr; {formatDate(sub.fecha_estimada_fin)}
          </span>
          {sub.zona_nombre && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="pin" className="h-3.5 w-3.5" />
              {sub.zona_nombre}
            </span>
          )}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
              Plantados / meta
            </p>
            <p className="mt-0.5 text-[40px] font-extrabold leading-none tracking-tight tabular-nums">
              {plantados.toLocaleString('es-BO')}
              <span className="ml-1 text-base font-extrabold text-white/65">
                / {sub.meta_total_arboles.toLocaleString('es-BO')}
              </span>
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold text-white/70">Avance</p>
            <p className="text-2xl font-extrabold tabular-nums">{pct}%</p>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-success-300"
            style={{ width: `${clampPct(pct)}%` }}
          />
        </div>

        {sub.estado === 'FINALIZADA_PARCIAL' && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-warning-400/15 px-3 py-2.5 ring-1 ring-warning-300/40">
            <Icon name="flag" className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-200" />
            <p className="text-[11.5px] font-bold leading-snug text-warning-100">
              <b className="text-white">Cerrada parcialmente:</b> finalizada antes de alcanzar la
              meta. El saldo asignado queda solo para reposición.
            </p>
          </div>
        )}
        {sub.estado === 'COMPLETADA' && sub.fase_mantenimiento === 'MANTENIMIENTO_ACTIVO' && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-info-400/15 px-3 py-2.5 ring-1 ring-info-300/40">
            <Icon name="shield" className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-200" />
            <p className="text-[11.5px] font-bold leading-snug text-info-100">
              <b className="text-white">Meta alcanzada.</b> La subcampaña está en mantenimiento
              activo.
            </p>
          </div>
        )}
      </div>
    </header>
  )
}

function LoadingHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={plantacionHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-700/85 via-brand-700/85 to-brand-700" />
      <div className="relative px-5 pb-6 pt-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
          Subcampaña
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Cargando...</h1>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'mapa', label: 'Mapa' },
  // TODO(asignaciones): agregar tab "Asignaciones" cuando exista endpoint de
  // asignaciones de lotes desde esta pantalla. La key sería 'asignaciones'.
]

function DetailTabs({
  active,
  onChange,
}: {
  active: DetailTab
  onChange: (tab: DetailTab) => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 bg-brand-50/95 px-5 pb-2 pt-3 backdrop-blur-sm">
      <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
        {DETAIL_TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex-1 rounded-full px-3 py-2 text-[12px] font-extrabold tracking-wide transition ${
                selected
                  ? 'bg-brand-600 text-white shadow-soft'
                  : 'text-brand-700 hover:bg-brand-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapa helpers
// ─────────────────────────────────────────────────────────────────────────────

function MapFitBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (positions.length > 0 && !fitted.current) {
      fitted.current = true
      map.fitBounds(L.latLngBounds(positions), { maxZoom: 17, padding: [24, 24] })
    }
  }, [map, positions])

  return null
}

// Vista previa del polígono en el Resumen. `isolate z-0` encierra los z-index
// internos de Leaflet (400+) en un stacking context propio para que el mapa no
// se dibuje encima del BottomNav (z-40).
function MiniMapPreview({
  positions,
  label,
  onClick,
}: {
  positions: LatLngTuple[]
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver mapa completo"
      className="relative isolate z-0 block h-[150px] w-full overflow-hidden rounded-3xl bg-neutral-100 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300"
    >
      <div className="pointer-events-none absolute inset-0">
        <MapContainer
          center={positions[0] ?? [-16.5, -68.15]}
          zoom={14}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <MapFitBounds positions={positions} />
          <Polygon
            positions={positions}
            pathOptions={{
              color: '#166534',
              fillColor: '#22c55e',
              fillOpacity: 0.25,
              weight: 3,
            }}
          />
        </MapContainer>
      </div>
      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-brand-800 shadow-soft backdrop-blur">
        <Icon name="pin" className="h-3.5 w-3.5 text-success-600" />
        {label}
      </span>
      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-700 shadow-soft backdrop-blur">
        Ver mapa
        <Icon name="chevron-right" className="h-3 w-3" />
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Resumen
// ─────────────────────────────────────────────────────────────────────────────

// Tarjeta "Próximo paso" para BORRADOR: hace visible la transición a ACTIVA con
// sus precondiciones sin entrar al menú de más opciones.
function ActivacionCard({
  sub,
  equipo,
  campania_id,
  localPoligonoFallback,
  onActivated,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
  campania_id: number
  localPoligonoFallback: GeoJsonPolygon | null
  onActivated: (data: ActivarSubcampaniaData) => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)

  const hasCoordinador = equipo.some((m) => m.rol === 'COORDINADOR')
  const hasPoligono = !!sub.poligono || !!localPoligonoFallback
  const hasMeta = sub.meta_total_arboles >= 1
  const canActivate = hasCoordinador && hasPoligono && hasMeta

  const precondiciones = [
    { label: 'Polígono definido', ok: hasPoligono },
    { label: 'Coordinador asignado', ok: hasCoordinador },
    { label: 'Meta de árboles ≥ 1', ok: hasMeta },
  ]
  const faltantes = precondiciones.filter((p) => !p.ok)

  const goToContinueWizard = () => {
    navigate(buildWizardUrl(campania_id, sub.id, 5))
  }

  const handleActivate = async () => {
    setActivating(true)
    setActivationError(null)
    try {
      // Si el backend aún no tiene el polígono (por ejemplo, se cargó como
      // fallback desde el draft local), lo subimos antes de activar para
      // evitar el 422 de precondición del backend.
      if (!sub.poligono && localPoligonoFallback) {
        await PlantacionService.setSubcampaniaPoligono(
          sub.id,
          localPoligonoFallback,
          user?.auth_id,
        )
      }
      const data = await PlantacionService.activarSubcampania(sub.id, user?.auth_id)
      onActivated(data)
    } catch (activateError) {
      setActivationError(
        activateError instanceof Error
          ? activateError.message
          : 'No se pudo activar la subcampaña.',
      )
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-success-50 text-success-700">
          <Icon name="leaf" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Próximo paso
          </p>
          <p className="mt-0.5 text-[15px] font-extrabold leading-tight text-brand-800">
            Activar la subcampaña
          </p>
          <p className="mt-0.5 text-[11px] font-semibold leading-snug text-neutral-500">
            Pasa de borrador a activa para que el equipo pueda registrar plantaciones.
          </p>
        </div>
      </div>

      {faltantes.length > 0 && (
        <div className="mt-3 rounded-2xl bg-warning-50 px-3 py-2 ring-1 ring-warning-100">
          <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wide text-warning-800">
            <Icon name="info" className="h-3.5 w-3.5" />
            Falta para activar
          </p>
          <p className="mt-0.5 text-[11.5px] font-bold leading-snug text-warning-900">
            {faltantes.map((p) => p.label).join(' · ')}
          </p>
        </div>
      )}

      {activationError && (
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-danger-50 px-4 py-2 text-center text-xs font-extrabold text-danger-700 ring-1 ring-danger-100">
          {activationError}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={handleActivate}
          disabled={!canActivate || activating}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
            !canActivate || activating
              ? 'cursor-not-allowed bg-neutral-300'
              : 'bg-success-600 hover:bg-success-700'
          }`}
        >
          <Icon name="check" className="h-4 w-4" />
          {activating ? 'Activando…' : 'Activar subcampaña'}
        </button>
        <button
          type="button"
          onClick={goToContinueWizard}
          disabled={activating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="users" className="h-4 w-4" />
          Completar configuración
        </button>
      </div>
    </div>
  )
}

function ResumenTab({
  sub,
  equipo,
  plan,
  localPoligonoFallback,
  onTabMapa,
  onActivated,
  onRegistrarPlantacion,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
  plan: GetPlanData | null
  localPoligonoFallback: GeoJsonPolygon | null
  onTabMapa: () => void
  onActivated: (data: ActivarSubcampaniaData) => void
  onRegistrarPlantacion: () => void
}) {
  const coordinador = equipo.find((m) => m.rol === 'COORDINADOR')
  const isBorrador = sub.estado === 'BORRADOR'
  const displayPoligono = sub.poligono ?? localPoligonoFallback
  const polygonPositions = useMemo(
    () => getPolygonPositions(displayPoligono),
    [displayPoligono],
  )

  const supervivencia = getSupervivenciaPct(sub)
  const hectareas = formatHectareas(sub.area_hectareas)
  const metasPlan = plan?.metas ?? []

  return (
    <div className="space-y-3">
      {isBorrador && (
        <ActivacionCard
          sub={sub}
          equipo={equipo}
          campania_id={sub.campania_id}
          localPoligonoFallback={localPoligonoFallback}
          onActivated={onActivated}
        />
      )}

      {/* Acción principal con la subcampaña ACTIVA. La pantalla de registro
          valida `puede_registrar` y muestra el motivo de bloqueo si aplica. */}
      {sub.estado === 'ACTIVA' && (
        <Button variant="primary" fullWidth leftIcon="leaf" onClick={onRegistrarPlantacion}>
          Registrar plantación
        </Button>
      )}

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Supervivencia
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {supervivencia != null ? `${supervivencia}%` : '—'}
          </p>
          {supervivencia != null ? (
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-success-500"
                style={{ width: `${supervivencia}%` }}
              />
            </div>
          ) : (
            <p className="mt-1 text-[10px] font-bold text-neutral-500">sin datos aún</p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Saldo vivo
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {sub.saldo_vivo_actual != null
              ? sub.saldo_vivo_actual.toLocaleString('es-BO')
              : '—'}
          </p>
          <p className="mt-1 text-[10px] font-bold text-neutral-500">plantas</p>
        </div>

        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Área
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {hectareas ?? '—'}{' '}
            {hectareas && <span className="text-sm font-extrabold text-neutral-400">ha</span>}
          </p>
          <p className="mt-1 text-[10px] font-bold text-neutral-500">
            {displayPoligono ? 'zona delimitada' : 'pendiente de definir'}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Eventos
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {sub.eventos_count != null ? sub.eventos_count.toLocaleString('es-BO') : '—'}
          </p>
          <p className="mt-1 text-[10px] font-bold text-neutral-500">registros de actividad</p>
        </div>
      </div>

      {/* Coordinador */}
      <div className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
        {coordinador ? (
          <UserAvatar
            nombre={coordinador.nombre_usuario ?? 'C'}
            fotoUrl={coordinador.foto_perfil_url}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-700"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-extrabold text-neutral-400">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Coordinador
          </p>
          <p className="truncate text-sm font-extrabold text-brand-800">
            {coordinador
              ? coordinador.nombre_usuario ?? `Usuario #${coordinador.usuario_id}`
              : 'Pendiente'}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] font-semibold text-neutral-500">
            {coordinador?.agregado_at
              ? `Desde ${formatDate(coordinador.agregado_at.slice(0, 10))}`
              : sub.zona_nombre ?? ''}
          </p>
        </div>
      </div>

      {/* Mini mapa → tab mapa */}
      {polygonPositions.length > 0 && (
        <MiniMapPreview
          positions={polygonPositions}
          label={hectareas ? `${hectareas} ha` : sub.zona_nombre ?? 'Zona delimitada'}
          onClick={onTabMapa}
        />
      )}

      {/* Equipo + lotes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Equipo
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {equipo.length}
          </p>
          {equipo.length > 0 ? (
            <div className="mt-1.5 flex -space-x-2">
              {equipo.slice(0, 5).map((m) => (
                <UserAvatar
                  key={m.id}
                  nombre={m.nombre_usuario ?? 'U'}
                  fotoUrl={m.foto_perfil_url}
                  title={m.nombre_usuario ?? undefined}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-700 ring-2 ring-white"
                />
              ))}
              {equipo.length > 5 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-extrabold text-neutral-600 ring-2 ring-white">
                  +{equipo.length - 5}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-[10px] font-bold text-neutral-500">sin miembros</p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
            Lotes
          </p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">
            {sub.lotes_count != null ? sub.lotes_count : '—'}
          </p>
          <p className="mt-1 text-[10px] font-bold text-neutral-500">asignados del vivero</p>
        </div>
      </div>

      {/* Mix de especies (plan de metas) */}
      {metasPlan.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Mix de especies planificado
          </p>
          <div className="mt-2 space-y-2.5">
            {metasPlan.map((meta) => {
              const nombre = meta.planta?.especie ?? `Planta #${meta.planta_id}`
              const pctObjetivo = clampPct(Math.round(meta.porcentaje_objetivo))
              return (
                <div key={meta.planta_id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-extrabold text-brand-800">{nombre}</p>
                    <p className="text-[11px] font-extrabold tabular-nums text-neutral-500">
                      <span className="text-brand-800">
                        {meta.cantidad_objetivo.toLocaleString('es-BO')}
                      </span>{' '}
                      · {pctObjetivo}%
                    </p>
                  </div>
                  {meta.planta?.nombre_cientifico && (
                    <p className="mb-1 text-[10.5px] italic text-neutral-500">
                      {meta.planta.nombre_cientifico}
                    </p>
                  )}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${pctObjetivo}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Descripción (solo si existe) */}
      {sub.descripcion && (
        <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Descripción
          </p>
          <p className="mt-1.5 text-[12.5px] font-semibold leading-relaxed text-neutral-700">
            {sub.descripcion}
          </p>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Equipo
// ─────────────────────────────────────────────────────────────────────────────

function EquipoTab({
  sub,
  equipo,
  isAdmin,
  authId,
  onEquipoChange,
}: {
  sub: Subcampania
  equipo: EquipoMember[]
  isAdmin: boolean
  authId?: string
  onEquipoChange: (members: EquipoMember[]) => void
}) {
  // El equipo va por su propio servicio y no lo bloquea EdicionPorEstadoPolicy,
  // así que un ADMIN puede agregar/quitar operarios incluso con la subcampaña
  // ACTIVA. El coordinador se muestra pero no se puede cambiar desde acá.
  const canManage = isAdmin && EQUIPO_EDITABLE_ESTADOS.includes(sub.estado)

  return (
    <SubcampaniaEquipoManager
      subcampania={sub}
      equipo={equipo}
      canManage={canManage}
      authId={authId}
      onEquipoChange={onEquipoChange}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Mapa
// ─────────────────────────────────────────────────────────────────────────────

function MapaTab({
  sub,
  campania_id,
  localPoligonoFallback,
}: {
  sub: Subcampania
  campania_id: number
  localPoligonoFallback: GeoJsonPolygon | null
}) {
  const navigate = useNavigate()

  const displayPoligono = sub.poligono ?? localPoligonoFallback
  const polygonPositions = useMemo(
    () => getPolygonPositions(displayPoligono),
    [displayPoligono],
  )

  const isBorrador = sub.estado === 'BORRADOR'
  const hectareas = formatHectareas(sub.area_hectareas)
  const plantados = getPlantados(sub)
  const densidad =
    sub.area_hectareas && sub.area_hectareas > 0
      ? Math.round(plantados / sub.area_hectareas)
      : null

  if (!displayPoligono || polygonPositions.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 text-neutral-400">
          <Icon name="map" className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-extrabold text-brand-800">Sin zona delimitada</p>
        <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-neutral-500">
          El polígono de la subcampaña no ha sido definido todavía.
        </p>
        {isBorrador && (
          <button
            type="button"
            onClick={() => navigate(buildWizardUrl(campania_id, sub.id, 3))}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-brand-700"
          >
            <Icon name="map" className="h-4 w-4" />
            Definir zona
          </button>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {/* `isolate z-0` crea un stacking context propio: los panes internos de
          Leaflet (z-index 400+) dejan de competir con el BottomNav (z-40). */}
      <div
        className="relative isolate z-0 overflow-hidden rounded-3xl bg-neutral-100 shadow-soft ring-1 ring-black/5"
        style={{ height: '55vh', minHeight: 300 }}
      >
        <MapContainer
          center={polygonPositions[0] ?? [-16.5, -68.15]}
          zoom={14}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapFitBounds positions={polygonPositions} />
          <Polygon
            positions={polygonPositions}
            pathOptions={{
              color: '#166534',
              fillColor: '#22c55e',
              fillOpacity: 0.25,
              weight: 3,
            }}
          />
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Cobertura
          </p>
          <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-800">
            {hectareas ? `${hectareas} ha` : '—'}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Meta
          </p>
          <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-800">
            {sub.meta_total_arboles.toLocaleString('es-BO')}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            Densidad
          </p>
          <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-800">
            {densidad != null ? `${densidad.toLocaleString('es-BO')}/ha` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet "más opciones" (⋯ del header)
// ─────────────────────────────────────────────────────────────────────────────

function MoreSheet({
  open,
  sub,
  canCancel,
  onClose,
  onGestionarEquipo,
  onContinuarWizard,
  onCancelar,
}: {
  open: boolean
  sub: Subcampania
  canCancel: boolean
  onClose: () => void
  onGestionarEquipo: () => void
  onContinuarWizard: () => void
  onCancelar: () => void
}) {
  if (!open) return null
  const isBorrador = sub.estado === 'BORRADOR'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" onClick={onClose} aria-label="Cerrar" />
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white px-5 pb-7 pt-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-200" />
        <h3 className="text-lg font-extrabold text-brand-800">Acciones de subcampaña</h3>

        <ul className="mt-3 divide-y divide-neutral-100">
          <li>
            <button
              type="button"
              onClick={onGestionarEquipo}
              className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-neutral-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="users" className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-brand-800">Gestionar equipo</p>
                <p className="text-[11px] font-medium text-neutral-500">
                  Agregar o quitar operarios de esta subcampaña
                </p>
              </div>
              <Icon name="chevron-right" className="h-4 w-4 text-neutral-400" />
            </button>
          </li>

          {isBorrador && (
            <li>
              <button
                type="button"
                onClick={onContinuarWizard}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-neutral-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
                  <Icon name="layers" className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-brand-800">Continuar configuración</p>
                  <p className="text-[11px] font-medium text-neutral-500">
                    Retomar el asistente de creación
                  </p>
                </div>
                <Icon name="chevron-right" className="h-4 w-4 text-neutral-400" />
              </button>
            </li>
          )}

          {canCancel && (
            <li>
              <button
                type="button"
                onClick={onCancelar}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-danger-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
                  <Icon name="trash" className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-danger-700">Cancelar subcampaña</p>
                  <p className="text-[11px] font-medium text-neutral-500">
                    {isBorrador
                      ? 'El registro se conserva pero deja de aparecer en los listados'
                      : 'Disponible porque aún no hay plantaciones registradas'}
                  </p>
                </div>
                <Icon name="chevron-right" className="h-4 w-4 text-neutral-400" />
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

function DetalleSubcampanaScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subcampaniaId } = useParams<{ subcampaniaId: string }>()

  const numericId = Number(subcampaniaId)
  const hasValidId = Number.isFinite(numericId) && numericId > 0

  const [sub, setSub] = useState<Subcampania | null>(null)
  const [equipo, setEquipo] = useState<EquipoMember[]>([])
  const [plan, setPlan] = useState<GetPlanData | null>(null)
  const [loading, setLoading] = useState(hasValidId)
  const [error, setError] = useState<string | null>(
    hasValidId ? null : 'ID de subcampaña inválido.',
  )
  const [activeTab, setActiveTab] = useState<DetailTab>('resumen')
  const [moreOpen, setMoreOpen] = useState(false)
  const [activationNotice, setActivationNotice] = useState<string | null>(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const authId = user?.auth_id
  const isAdmin = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const requestRef = useRef(0)

  // Fallback: si el backend no incluye `poligono` en GET /subcampanias/:id,
  // reutilizamos el `poligono_geojson` del draft local (persistido durante el
  // wizard) para que el mapa no desaparezca al entrar al detalle.
  const localPoligonoFallback = useMemo<GeoJsonPolygon | null>(() => {
    if (!sub || sub.poligono) return null
    const draft = loadSubcampaniaBaseDrafts(sub.campania_id).find(
      (d) => d.subcampania_id === sub.id,
    )
    return draft?.poligono_geojson ?? null
  }, [sub])

  const fetchSubcampaniaData = useCallback(async (requestId: number) => {
    try {
      const [subData, equipoData, planData] = await Promise.all([
        PlantacionService.getSubcampania(numericId, authId),
        PlantacionService.getSubcampaniaEquipo(numericId, authId),
        // El plan es opcional: si el endpoint falla (sin plan configurado,
        // permisos, etc.) el Resumen simplemente omite la sección de mix.
        PlantacionService.getSubcampaniaPlan(numericId, authId).catch(() => null),
      ])

      if (requestId !== requestRef.current) return

      setSub(subData)
      setEquipo(equipoData)
      setPlan(planData)
      setError(null)
    } catch (fetchError) {
      if (requestId !== requestRef.current) return

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'No se pudo cargar la subcampaña.',
      )
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [numericId, authId])

  useEffect(() => {
    if (!hasValidId) return

    const requestId = ++requestRef.current

    setLoading(true)
    setError(null)
    void fetchSubcampaniaData(requestId)
  }, [hasValidId, numericId, authId, fetchSubcampaniaData])

  const goBack = () => {
    if (sub) {
      navigate(`/app/planting/campanias/${sub.campania_id}`)
    } else {
      navigate('/app/planting')
    }
  }

  const handleRetry = () => {
    if (!hasValidId) return
    const requestId = ++requestRef.current

    setLoading(true)
    setError(null)
    void fetchSubcampaniaData(requestId)
  }

  // BORRADOR: siempre cancelable. ACTIVA: solo si no hay plantaciones registradas.
  // Si `total_plantado_inicial` no viene del backend, la ACTIVA no expone la acción
  // (comportamiento conservador; el backend igual protege con 409).
  const canCancel =
    !!sub &&
    (sub.estado === 'BORRADOR' ||
      (sub.estado === 'ACTIVA' && sub.total_plantado_inicial === 0))

  const handleRequestCancel = () => {
    setMoreOpen(false)
    setCancelError(null)
    setCancelModalOpen(true)
  }

  const handleCloseCancelModal = () => {
    if (cancelSubmitting) return
    setCancelModalOpen(false)
    setCancelError(null)
  }

  const handleConfirmCancel = async (motivo: string) => {
    if (!sub) return
    setCancelSubmitting(true)
    setCancelError(null)
    try {
      await PlantacionService.cancelarSubcampania(sub.id, motivo, authId)
      setCancelModalOpen(false)
      navigate(`/app/planting/campanias/${sub.campania_id}`)
    } catch (cancelErr) {
      setCancelError(
        cancelErr instanceof Error
          ? cancelErr.message
          : 'No se pudo cancelar la subcampaña.',
      )
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handleActivated = (data: ActivarSubcampaniaData) => {
    const cobertura = data.composicion_asignada ?? []
    const asignadoTotal = cobertura.reduce(
      (acc, item) =>
        acc + (Number.isFinite(item.saldo_asignado_disponible) ? item.saldo_asignado_disponible : 0),
      0,
    )
    const metaTotal = sub?.meta_total_arboles ?? 0
    let notice: string
    if (cobertura.length === 0 || asignadoTotal === 0) {
      notice =
        'Subcampaña activada. Aún no hay stock asignado — podés asignar (entregar) lotes de vivero cuando estén disponibles.'
    } else if (metaTotal > 0 && asignadoTotal < metaTotal) {
      const cobPct = Math.floor((asignadoTotal / metaTotal) * 100)
      notice = `Subcampaña activada. Cobertura actual del stock asignado: ${cobPct}% (${asignadoTotal.toLocaleString('es-BO')} / ${metaTotal.toLocaleString('es-BO')}). Podés seguir asignando lotes.`
    } else {
      notice = 'Subcampaña activada con stock completo asignado.'
    }
    setActivationNotice(notice)
    const requestId = ++requestRef.current
    void fetchSubcampaniaData(requestId)
  }

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {sub && !loading ? (
          <SubcampanaHeader sub={sub} onBack={goBack} onMore={() => setMoreOpen(true)} />
        ) : (
          <LoadingHeader onBack={goBack} />
        )}

        <main className="space-y-4 px-5 pt-2">
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              Cargando subcampaña...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl bg-danger-50 px-4 py-6 text-center shadow-soft ring-1 ring-danger-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600">
                <Icon name="info" className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-extrabold text-danger-700">
                No se pudo cargar la subcampaña
              </p>
              <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-danger-600">
                {error}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={goBack}>
                  Volver
                </Button>
                {hasValidId && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-xl bg-danger-100 px-4 py-2 text-xs font-bold text-danger-700 transition hover:bg-danger-200"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && sub && (
            <>
              <DetailTabs active={activeTab} onChange={setActiveTab} />

              {activationNotice && (
                <div className="flex items-start gap-3 rounded-3xl bg-success-50 p-4 shadow-soft ring-1 ring-success-100">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-success-100 text-success-700">
                    <Icon name="check" className="h-5 w-5" />
                  </div>
                  <p className="min-w-0 flex-1 text-[12px] font-bold leading-snug text-success-900">
                    {activationNotice}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivationNotice(null)}
                    aria-label="Cerrar aviso"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700 transition hover:bg-success-200"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </div>
              )}

              {activeTab === 'resumen' && (
                <ResumenTab
                  sub={sub}
                  equipo={equipo}
                  plan={plan}
                  localPoligonoFallback={localPoligonoFallback}
                  onTabMapa={() => setActiveTab('mapa')}
                  onActivated={handleActivated}
                  onRegistrarPlantacion={() =>
                    navigate(`/app/planting/subcampanias/${sub.id}/plantaciones/new`)
                  }
                />
              )}

              {activeTab === 'equipo' && (
                <EquipoTab
                  sub={sub}
                  equipo={equipo}
                  isAdmin={isAdmin}
                  authId={authId}
                  onEquipoChange={setEquipo}
                />
              )}

              {activeTab === 'mapa' && (
                <MapaTab
                  sub={sub}
                  campania_id={sub.campania_id}
                  localPoligonoFallback={localPoligonoFallback}
                />
              )}
            </>
          )}
        </main>
      </div>

      {sub && (
        <MoreSheet
          open={moreOpen}
          sub={sub}
          canCancel={canCancel}
          onClose={() => setMoreOpen(false)}
          onGestionarEquipo={() => {
            setMoreOpen(false)
            setActiveTab('equipo')
          }}
          onContinuarWizard={() => {
            setMoreOpen(false)
            navigate(buildWizardUrl(sub.campania_id, sub.id, 5))
          }}
          onCancelar={handleRequestCancel}
        />
      )}

      <CancelarSubcampaniaModal
        open={cancelModalOpen}
        subcampaniaNombre={sub?.nombre ?? ''}
        submitting={cancelSubmitting}
        error={cancelError}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}

export default DetalleSubcampanaScreen
