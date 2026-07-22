import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import plantacionHero from '../../../assets/home/plantacion.jpg'
import ConfirmDialog from '../../../components/ConfirmDialog'
import Icon from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import { formatRelativeTime } from '../../../utils/datetime'
import {
  TIPO_CAMPANIA_LABEL,
  TIPO_ORGANIZACION_LABEL,
  type CampaniaActivityItem,
  type CampaniaActivityTipo,
  type CampaniaMetrics,
  type CampaniaMetricsUltimaActividad,
  type Campania,
  type EstadoSubcampania,
  type Organizacion,
  type Subcampania,
} from '../types/contracts'
import {
  createSubcampaniaDraftId,
  loadSubcampaniaBaseDrafts,
  type SubcampaniaBaseDraft,
} from '../utils/subcampaniaDraft'
import { formatDate as formatFullDate } from '../utils/subcampaniaFormatters'

type LocationState = {
  campania?: Campania
}

type DashboardTab = 'resumen' | 'equipo' | 'lotes' | 'mapa'

const DASHBOARD_TABS: Array<{ key: DashboardTab; label: string }> = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'lotes', label: 'Lotes' },
  { key: 'mapa', label: 'Mapa' },
]

type SubcampaniaFilter = 'todas' | 'activa' | 'borrador'

// ================= Utilidades =================

function formatDate(value?: string | null): string {
  return formatFullDate(value, { fallback: 'Sin fecha' })
}

function formatNumber(value?: number | null): string {
  if (!Number.isFinite(value)) return 'Pendiente'
  return Number(value).toLocaleString('es-BO')
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getTotalSubcampanias(campania: Campania, subcampanias: Subcampania[]): number {
  if (subcampanias.length > 0) return subcampanias.length
  return Math.max(0, campania.count_subcampanias ?? 0)
}

function countByEstado(subcampanias: Subcampania[], estado: EstadoSubcampania): number {
  return subcampanias.filter((s) => s.estado === estado).length
}

function getVisibleStatus(
  campania: Campania,
  totalCount: number,
  activasCount: number,
): string {
  if (activasCount > 0) return 'Activa'
  if (totalCount === 0) return 'Creada'
  return campania.estado_derivado?.replace(/_/g, ' ') || 'Creada'
}

function getZoneLabel(campania: Campania, subcampanias: Subcampania[]): string {
  if (campania.zonas?.length) {
    if (campania.zonas.length === 1) return campania.zonas[0]
    return `${campania.zonas[0]} +${campania.zonas.length - 1} zonas`
  }
  if (Number.isFinite(campania.zonas_count) && Number(campania.zonas_count) > 0) {
    const zonas = Number(campania.zonas_count)
    return `${zonas} zona${zonas === 1 ? '' : 's'}`
  }
  if (subcampanias.length > 0) {
    const primera = subcampanias[0].nombre
    if (subcampanias.length === 1) return primera
    return `${primera} +${subcampanias.length - 1} zonas`
  }
  return 'Por definir'
}

// ================= Backend accessors =================

type SubcampaniaActivaData = {
  coordinadorNombre: string
  coordinadorIniciales: string
  areaHectareas: number | null
  plantados: number | null
  meta: number | null
  avancePct: number | null
  personas: number
  lotes: number
  eventos: number
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getSubcampaniaActivaData(subcampania: Subcampania): SubcampaniaActivaData {
  const coordinadorNombre =
    subcampania.coordinador?.nombre ||
    subcampania.equipo?.find((m) => m.rol === 'COORDINADOR')?.nombre_usuario ||
    'Sin coordinador'
  const meta = toNullableNumber(subcampania.meta_total_arboles)
  const plantados = toNullableNumber(
    subcampania.plantados ?? subcampania.total_plantado_inicial,
  )
  const backendAvance = toNullableNumber(subcampania.avance_pct)
  const avancePct =
    backendAvance !== null
      ? Math.max(0, Math.min(100, backendAvance))
      : meta && meta > 0 && plantados !== null
        ? Math.max(0, Math.min(100, Math.round((plantados / meta) * 100)))
        : null
  const areaHectareas = toNullableNumber(subcampania.area_hectareas)
  const personas = Number(subcampania.personas_count ?? subcampania.equipo?.length ?? 0)
  const lotes = Number(subcampania.lotes_count ?? 0)
  const eventos = Number(subcampania.eventos_count ?? 0)
  return {
    coordinadorNombre,
    coordinadorIniciales: getInitials(coordinadorNombre),
    areaHectareas,
    plantados,
    meta,
    avancePct,
    personas,
    lotes,
    eventos,
  }
}

function getSubcampaniaFaltantes(subcampania: Subcampania): string[] {
  const faltantes: string[] = []
  const equipo = subcampania.equipo ?? []
  const hasCoordinador = Boolean(
    subcampania.coordinador?.id ?? equipo.some((m) => m.rol === 'COORDINADOR'),
  )
  if (!hasCoordinador) faltantes.push('coordinador')
  if (!subcampania.fecha_estimada_inicio || !subcampania.fecha_estimada_fin) {
    faltantes.push('fechas')
  }
  if (!subcampania.poligono) faltantes.push('cobertura')
  if (subcampania.has_plan_especies === false) faltantes.push('mix de especies')
  return faltantes
}

function getSubcampaniaUbicacion(
  campania: Campania,
  subcampania: Subcampania,
): string {
  if (subcampania.zona_nombre) return subcampania.zona_nombre
  if (campania.zonas?.length) return campania.zonas[0]
  return ''
}

type CampaniaAggregatedTotals = {
  planted: number
  target: number
  progress: number
}

// El endpoint de campaña no expone totales agregados de árboles: los derivamos
// de las subcampañas activas y completadas (BORRADOR queda fuera porque su meta
// aún no es un compromiso).
function getCampaniaAggregatedTotals(
  campania: Campania,
  subcampanias: Subcampania[],
): CampaniaAggregatedTotals {
  const relevant = subcampanias.filter(
    (s) => s.estado === 'ACTIVA' || s.estado === 'COMPLETADA',
  )
  const derivedPlanted = relevant.reduce(
    (acc, s) => acc + Number(s.plantados ?? s.total_plantado_inicial ?? 0),
    0,
  )
  const derivedTarget = relevant.reduce(
    (acc, s) => acc + Number(s.meta_total_arboles ?? 0),
    0,
  )

  const backendPlanted = Number(campania.arboles_plantados ?? 0)
  const backendTarget = Number(campania.meta_arboles ?? 0)
  const planted = backendPlanted > 0 ? backendPlanted : derivedPlanted
  const target = backendTarget > 0 ? backendTarget : derivedTarget

  const backendProgress = Number(campania.avance_pct)
  const progress = Number.isFinite(backendProgress) && backendProgress > 0
    ? Math.max(0, Math.min(100, backendProgress))
    : target > 0
      ? Math.max(0, Math.min(100, Math.round((planted / target) * 100)))
      : 0

  return { planted, target, progress }
}

function formatMetricNumber(value?: number | null, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return Number(value).toLocaleString('es-BO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatUltimaActividadHint(item: CampaniaMetricsUltimaActividad | null): string {
  if (!item) return 'Sin eventos aún'
  const parts = [formatRelativeTime(item.timestamp), item.autor, item.detalle].filter(
    (p) => p && p.trim().length > 0,
  )
  return parts.join(' · ')
}

// ================= Draft utils =================

function getDraftMunicipio(draft: SubcampaniaBaseDraft): string {
  const comunidad = draft.comunidad
  if (!comunidad) return ''
  return (
    comunidad.nivel3?.nombre ||
    comunidad.nivel2?.nombre ||
    comunidad.nivel1?.nombre ||
    comunidad.nombre
  )
}

function getDraftFaltantes(draft: SubcampaniaBaseDraft): string[] {
  const faltantes: string[] = []
  if (!draft.coordinador) faltantes.push('coordinador')
  if (!draft.fecha_estimada_inicio || !draft.fecha_estimada_fin) faltantes.push('fechas')
  if (!draft.poligono_geojson) faltantes.push('cobertura')
  if (!draft.especies || draft.especies.length === 0) faltantes.push('mix de especies')
  return faltantes
}

// ================= UI atoms =================

function Progress({
  pct,
  tone = 'light',
}: {
  pct: number
  tone?: 'light' | 'brand' | 'emerald'
}) {
  const track =
    tone === 'brand'
      ? 'bg-brand-50'
      : tone === 'emerald'
        ? 'bg-success-50'
        : 'bg-white/15'
  const bar =
    tone === 'brand'
      ? 'bg-brand-600'
      : tone === 'emerald'
        ? 'bg-success-500'
        : 'bg-success-300'
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
      <div
        className={`h-full rounded-full ${bar}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

function StateBadge({ label, light = false }: { label: string; light?: boolean }) {
  const normalized = label.toUpperCase()
  const isActiva = normalized.includes('ACTIVA')
  const tone = isActiva
    ? light
      ? 'bg-success-300/25 text-success-100 ring-success-200/40'
      : 'bg-success-50 text-success-700 ring-success-100'
    : normalized === 'CREADA'
      ? light
        ? 'bg-white/15 text-white ring-white/25'
        : 'bg-brand-50 text-brand-700 ring-brand-100'
      : light
        ? 'bg-white/15 text-white ring-white/20'
        : 'bg-neutral-50 text-neutral-600 ring-neutral-200'
  const dot = isActiva ? 'bg-success-400' : 'bg-current'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

function TipoSubBadge({ tipo }: { tipo: Campania['tipo'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-50 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-warning-800 ring-1 ring-warning-100">
      <Icon name="file" className="h-3 w-3" />
      {TIPO_CAMPANIA_LABEL[tipo]}
    </span>
  )
}

function SubcampanaBadge({ estado }: { estado: EstadoSubcampania }) {
  const isActiva = estado === 'ACTIVA'
  const isBorrador = estado === 'BORRADOR'
  const tone = isActiva
    ? 'bg-success-50 text-success-700 ring-success-100'
    : isBorrador
      ? 'bg-neutral-100 text-neutral-600 ring-neutral-200'
      : estado === 'PAUSADA'
        ? 'bg-warning-50 text-warning-700 ring-warning-100'
        : estado === 'CANCELADA'
          ? 'bg-danger-50 text-danger-700 ring-danger-100'
          : 'bg-neutral-50 text-neutral-700 ring-neutral-200'
  const dot = isActiva ? 'bg-success-500' : isBorrador ? 'bg-neutral-500' : 'bg-current'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] ring-1 ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {estado.replace(/_/g, ' ')}
    </span>
  )
}

function OrganizationChip({ organization }: { organization: Organizacion }) {
  const tipoLabel = TIPO_ORGANIZACION_LABEL[organization.tipo]
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/12 py-1.5 pl-1.5 pr-2.5 text-[11.5px] font-extrabold text-white ring-1 ring-white/15 backdrop-blur-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/70 text-[9px] font-extrabold text-white ring-1 ring-white/30">
        {organization.logo_url ? (
          <img src={organization.logo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(organization.nombre)
        )}
      </span>
      <span className="truncate">{organization.nombre}</span>
      <span className="ml-0.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/85">
        {tipoLabel}
      </span>
    </span>
  )
}

function OrganizationInlineList({ organizations }: { organizations: Organizacion[] }) {
  if (organizations.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold text-white ring-1 ring-white/20">
        <Icon name="shield" className="h-3 w-3" />
        Sin organizaciones visibles
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {organizations.map((org) => (
        <OrganizationChip key={org.id} organization={org} />
      ))}
    </div>
  )
}

// ================= Kebab menu =================

function KebabMenu({
  onEditar,
  onDesactivar,
  desactivarDisabled = false,
  desactivarDisabledReason,
  canManage,
}: {
  onEditar: () => void
  onDesactivar: () => void
  desactivarDisabled?: boolean
  desactivarDisabledReason?: string
  canManage: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!canManage) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        aria-label="Más acciones"
        aria-expanded={open}
      >
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-2xl bg-white text-brand-700 shadow-soft ring-1 ring-black/10">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEditar()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-bold hover:bg-brand-50"
          >
            <Icon name="file" className="h-4 w-4 text-brand-600" />
            Editar campaña
          </button>
          <button
            type="button"
            onClick={() => {
              if (desactivarDisabled) return
              setOpen(false)
              onDesactivar()
            }}
            disabled={desactivarDisabled}
            title={desactivarDisabled ? desactivarDisabledReason : undefined}
            className={`flex w-full items-start gap-2.5 border-t border-neutral-100 px-4 py-3 text-left text-sm font-bold ${
              desactivarDisabled
                ? 'cursor-not-allowed text-neutral-400'
                : 'text-danger-700 hover:bg-danger-50'
            }`}
          >
            <Icon name="trash" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Desactivar campaña
              {desactivarDisabled && desactivarDisabledReason && (
                <span className="mt-0.5 block text-[11px] font-semibold text-neutral-500">
                  {desactivarDisabledReason}
                </span>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// ================= Header =================

function CampaniaHeader({
  campania,
  subcampanias,
  onBack,
  onEditar,
  onDesactivar,
  desactivarDisabled,
  desactivarDisabledReason,
  canManage,
}: {
  campania: Campania
  subcampanias: Subcampania[]
  onBack: () => void
  onEditar: () => void
  onDesactivar: () => void
  desactivarDisabled: boolean
  desactivarDisabledReason?: string
  canManage: boolean
}) {
  const totalSub = getTotalSubcampanias(campania, subcampanias)
  const activasCount = countByEstado(subcampanias, 'ACTIVA')
  const borradoresCount = countByEstado(subcampanias, 'BORRADOR')
  const status = getVisibleStatus(campania, totalSub, activasCount)
  const { planted, target, progress } = getCampaniaAggregatedTotals(
    campania,
    subcampanias,
  )
  const showTargetPlaceholder = target === 0

  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={plantacionHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-brand-700/95" />
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
          <div className="flex items-center gap-2">
            <StateBadge label={status} light />
            <KebabMenu
              onEditar={onEditar}
              onDesactivar={onDesactivar}
              desactivarDisabled={desactivarDisabled}
              desactivarDisabledReason={desactivarDisabledReason}
              canManage={canManage}
            />
          </div>
        </div>

        <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">
          Campaña paraguas · {campania.codigo_trazabilidad}
        </p>
        <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          {campania.nombre}
        </h1>

        <div className="mt-3">
          <OrganizationInlineList organizations={campania.organizaciones ?? []} />
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-white/85">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="date" className="h-3.5 w-3.5" />
            {formatDate(campania.fecha_estimada_inicio)} → {formatDate(campania.fecha_estimada_fin)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="pin" className="h-3.5 w-3.5" />
            {getZoneLabel(campania, subcampanias)}
          </span>
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/80">
              Plantados agregados
            </p>
            <p className="mt-0.5 text-[38px] font-extrabold leading-none tracking-tight tabular-nums">
              {formatNumber(planted)}
              {showTargetPlaceholder ? (
                <span className="ml-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/60">
                  Sin meta activa
                </span>
              ) : (
                <span className="ml-1 text-base font-extrabold text-white/60">
                  / {formatNumber(target)}
                </span>
              )}
            </p>
          </div>
          {!showTargetPlaceholder && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold text-white/70">Avance</p>
              <p className="text-2xl font-extrabold tabular-nums">{progress}%</p>
            </div>
          )}
        </div>
        {!showTargetPlaceholder && (
          <div className="mt-2">
            <Progress pct={progress} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-extrabold tracking-wide ring-1 ring-white/20">
            <Icon name="planting" className="h-3 w-3" />
            {totalSub} sub-campañas
          </span>
          {borradoresCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              {borradoresCount} borrador
            </span>
          )}
          {activasCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
              {activasCount} activa
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

// ================= Tabs =================

function DCTabs({
  active,
  onChange,
}: {
  active: DashboardTab
  onChange: (tab: DashboardTab) => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-5 bg-brand-50/95 px-5 pb-2 pt-3 backdrop-blur-sm">
      <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
        {DASHBOARD_TABS.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex-1 rounded-full px-3 py-2 text-[12px] font-extrabold tracking-wide transition ${
                selected
                  ? 'bg-brand-700 text-white shadow-soft'
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

// ================= Métricas =================

function MetricCard({
  label,
  value,
  unit,
  children,
}: {
  label: string
  value: string
  unit?: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
        {label}
      </p>
      <p className="mt-2 text-[30px] font-extrabold leading-none tracking-tight text-brand-900 tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-base font-extrabold text-neutral-400">{unit}</span>
        )}
      </p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

function MetricsGrid({ metrics }: { metrics: CampaniaMetrics | null }) {
  const supervivencia = metrics ? Math.max(0, Math.min(100, metrics.supervivencia_pct)) : 0
  const comunidades = metrics?.comunidades_count ?? 0
  return (
    <section className="grid grid-cols-2 gap-3">
      <MetricCard
        label="Supervivencia pond."
        value={metrics ? `${formatMetricNumber(metrics.supervivencia_pct, 1)}%` : '—'}
      >
        <Progress pct={supervivencia} tone="emerald" />
      </MetricCard>
      <MetricCard
        label="CO₂ proyectado"
        value={formatMetricNumber(metrics?.co2_proyectado_ton, 1)}
        unit="T"
      >
        <p className="text-[11px] font-semibold leading-tight text-neutral-500">
          Agregado (estimado)
        </p>
      </MetricCard>
      <MetricCard
        label="Hectáreas"
        value={formatMetricNumber(metrics?.hectareas, 2)}
        unit="ha"
      >
        <p className="text-[11px] font-semibold leading-tight text-neutral-500">
          {metrics ? (
            <>
              {comunidades} comunidad{comunidades === 1 ? '' : 'es'}
            </>
          ) : (
            '—'
          )}
        </p>
      </MetricCard>
      <MetricCard label="Eventos" value={formatMetricNumber(metrics?.eventos_count)}>
        <p className="truncate text-[11px] font-semibold leading-tight text-neutral-500">
          {formatUltimaActividadHint(metrics?.ultima_actividad ?? null)}
        </p>
      </MetricCard>
    </section>
  )
}

// ================= Alerta sin coordinador =================

function NoCoordinadorAlert({ count }: { count: number }) {
  if (count === 0) return null
  const plural = count === 1 ? 'sub-campaña' : 'sub-campañas'
  const puedenPlural = count === 1 ? 'puede activarse' : 'pueden activarse'
  return (
    <section className="flex items-start gap-3 rounded-2xl bg-warning-50 px-4 py-3 ring-1 ring-warning-100">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-100 text-warning-800">
        <Icon name="info" className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-extrabold leading-tight text-warning-950">
          {count} {plural} sin coordinador
        </p>
        <p className="mt-0.5 text-[12px] font-semibold text-warning-900">
          No {puedenPlural} hasta asignar uno.
        </p>
      </div>
    </section>
  )
}

// ================= Preview del mapa de cobertura =================

function CoverageMapPreview({
  hectareas,
  activeCount,
  draftCount,
  onOpen,
}: {
  hectareas: number
  activeCount: number
  draftCount: number
  onOpen: () => void
}) {
  const totalMarkers = Math.max(0, activeCount + draftCount)
  const positions = useMemo(() => {
    const base: Array<{ x: number; y: number; active: boolean }> = [
      { x: 30, y: 42, active: true },
      { x: 55, y: 30, active: true },
      { x: 68, y: 55, active: true },
      { x: 22, y: 60, active: false },
      { x: 48, y: 68, active: false },
      { x: 76, y: 38, active: false },
    ]
    let a = activeCount
    let d = draftCount
    const out: Array<{ x: number; y: number; active: boolean }> = []
    for (const pos of base) {
      if (pos.active && a > 0) {
        a -= 1
        out.push(pos)
      } else if (!pos.active && d > 0) {
        d -= 1
        out.push(pos)
      }
    }
    return out
  }, [activeCount, draftCount])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-full overflow-hidden rounded-3xl bg-brand-50 p-4 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-200"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-brand-100"
        aria-hidden
      >
        <defs>
          <pattern id="mapDots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#mapDots)" opacity="0.6" />
        <path
          d="M0 60 Q 25 45 50 55 T 100 50"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="0.6"
          fill="none"
        />
        <path
          d="M0 78 Q 30 65 55 72 T 100 70"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="0.5"
          fill="none"
        />
        {positions.map((pos, idx) => (
          <g key={idx} transform={`translate(${pos.x} ${pos.y})`}>
            {pos.active ? (
              <>
                <circle r="3.6" fill="#10b981" fillOpacity="0.16" />
                <circle r="1.9" fill="#10b981" />
              </>
            ) : (
              <>
                <circle
                  r="3.6"
                  fill="none"
                  stroke="#94a3b8"
                  strokeDasharray="1 1"
                  strokeWidth="0.5"
                />
                <circle r="1.6" fill="#cbd5e1" />
              </>
            )}
          </g>
        ))}
      </svg>

      <div className="relative flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-brand-700 shadow-soft ring-1 ring-black/5">
          <Icon name="pin" className="h-3 w-3" />
          Cobertura agregada · {hectareas} ha
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-brand-700 shadow-soft ring-1 ring-black/5">
          Tap para ver detalle
          <Icon name="chevron-right" className="h-3 w-3" />
        </span>
      </div>
      <div className="relative h-32" />
      {totalMarkers === 0 && (
        <p className="relative mt-2 text-center text-[11px] font-semibold text-neutral-500">
          Sin polígonos definidos aún
        </p>
      )}
    </button>
  )
}

// ================= Sub-campañas =================

type SubcampaniaItem =
  | { kind: 'draft'; draft: SubcampaniaBaseDraft }
  | { kind: 'backend'; subcampania: Subcampania }

function isBorradorItem(item: SubcampaniaItem): boolean {
  if (item.kind === 'draft') return true
  return item.subcampania.estado === 'BORRADOR'
}

function isActivaItem(item: SubcampaniaItem): boolean {
  if (item.kind === 'draft') return false
  return item.subcampania.estado === 'ACTIVA'
}

function SubcampaniaFilterTabs({
  active,
  onChange,
  totales,
}: {
  active: SubcampaniaFilter
  onChange: (filter: SubcampaniaFilter) => void
  totales: { todas: number; activa: number; borrador: number }
}) {
  const tabs: Array<{ key: SubcampaniaFilter; label: string; count: number }> = [
    { key: 'todas', label: 'Todas', count: totales.todas },
    { key: 'activa', label: 'Activa', count: totales.activa },
    { key: 'borrador', label: 'Borrador', count: totales.borrador },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const selected = active === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.14em] ring-1 transition ${
              selected
                ? 'bg-brand-700 text-white ring-brand-700'
                : 'bg-white text-brand-700 ring-black/5 hover:bg-brand-50'
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex min-w-[18px] items-center justify-center rounded-full text-[10.5px] font-extrabold ${
                selected ? 'bg-white/20 text-white' : 'text-neutral-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SubcampaniaCardHeader({
  tipo,
  estado,
  nombre,
  ubicacion,
}: {
  tipo: Campania['tipo']
  estado: EstadoSubcampania
  nombre: string
  ubicacion: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TipoSubBadge tipo={tipo} />
          <SubcampanaBadge estado={estado} />
        </div>
        <p className="mt-1.5 truncate text-[16px] font-extrabold leading-tight text-brand-900">
          {nombre}
        </p>
        {ubicacion && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] font-semibold text-neutral-500">
            <Icon name="pin" className="h-3.5 w-3.5 text-neutral-400" />
            {ubicacion}
          </p>
        )}
      </div>
      <Icon name="chevron-right" className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
    </div>
  )
}

function SubcampaniaCardBorradorCompleto({
  onTap,
  header,
}: {
  onTap: () => void
  header: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300">
      <button type="button" onClick={onTap} className="block w-full text-left">
        {header}
      </button>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-success-50 px-3 py-2 ring-1 ring-success-100">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
          <Icon name="check" className="h-3.5 w-3.5" />
        </span>
        <p className="flex-1 text-[12px] font-bold leading-tight text-success-900">
          Configuración completa · lista para activar.
        </p>
        <button
          type="button"
          onClick={onTap}
          className="inline-flex items-center gap-1 rounded-full bg-success-600 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-soft transition hover:bg-success-700"
        >
          <Icon name="chevron-right" className="h-3 w-3" />
          Abrir
        </button>
      </div>
    </div>
  )
}

function SubcampaniaCardBorradorPendiente({
  faltantes,
  onTap,
  header,
}: {
  faltantes: string[]
  onTap: () => void
  header: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full rounded-3xl bg-white p-4 text-left shadow-soft ring-1 ring-success-100/70 transition hover:ring-success-200"
    >
      {header}
      <div className="mt-3 rounded-2xl bg-warning-50 px-3 py-2.5 ring-1 ring-warning-100">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-warning-800">
          <Icon name="info" className="h-3.5 w-3.5" />
          Falta para activar
        </p>
        <p className="mt-0.5 text-[12px] font-bold leading-snug text-warning-900">
          {faltantes.join(' · ')}
        </p>
      </div>
    </button>
  )
}

function SubcampaniaCardActiva({
  onTap,
  header,
  coordinadorNombre,
  coordinadorIniciales,
  areaHectareas,
  plantados,
  meta,
  avancePct,
  personas,
  lotes,
  eventos,
}: {
  onTap: () => void
  header: React.ReactNode
  coordinadorNombre: string
  coordinadorIniciales: string
  areaHectareas: number | null
  plantados: number | null
  meta: number | null
  avancePct: number | null
  personas: number
  lotes: number
  eventos: number
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full rounded-3xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.995]"
    >
      {header}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-100 text-[11px] font-extrabold text-success-800">
          {coordinadorIniciales}
        </span>
        <p className="flex-1 truncate text-[12.5px] font-bold text-brand-800">
          {coordinadorNombre}
        </p>
        <p className="whitespace-nowrap text-[11.5px] font-bold text-neutral-400">
          {areaHectareas === null ? 'Sin cobertura' : `${areaHectareas} ha`}
        </p>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Avance
        </p>
        <p className="text-[12.5px] font-extrabold tabular-nums text-brand-900">
          <span>{formatMetricNumber(plantados)}</span>
          <span className="mx-1 text-neutral-400"> / {formatMetricNumber(meta)}</span>
          {avancePct !== null && (
            <span className="ml-1 text-success-700">{avancePct}%</span>
          )}
        </p>
      </div>
      <div className="mt-2">
        <Progress pct={avancePct ?? 0} tone="brand" />
      </div>
      <p className="mt-3 text-[11.5px] font-semibold text-neutral-500">
        {personas} pers · {lotes} lote{lotes === 1 ? '' : 's'} · {eventos} eventos
      </p>
    </button>
  )
}

function AgregarSubcampaniaOutlined({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={!canCreate}
      className={`flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-4 py-4 text-sm font-extrabold transition ${
        canCreate
          ? 'border-brand-300 bg-white text-brand-700 hover:border-brand-500 hover:bg-brand-50'
          : 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400'
      }`}
    >
      <Icon name="plus" className="h-5 w-5" />
      {canCreate ? 'Agregar sub-campaña' : 'Solo ADMIN puede agregar sub-campañas'}
    </button>
  )
}

function SubcampaniasSection({
  campania,
  items,
  filter,
  onFilterChange,
  totales,
  onSubcampaniaTap,
  onDraftTap,
  canCreate,
  onCreate,
}: {
  campania: Campania
  items: SubcampaniaItem[]
  filter: SubcampaniaFilter
  onFilterChange: (filter: SubcampaniaFilter) => void
  totales: { todas: number; activa: number; borrador: number }
  onSubcampaniaTap: (sub: Subcampania) => void
  onDraftTap: (draft: SubcampaniaBaseDraft) => void
  canCreate: boolean
  onCreate: () => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand-500">
          Sub-campañas
        </p>
        <p className="text-[11px] font-bold text-neutral-400">
          {items.length} de {totales.todas}
        </p>
      </div>

      <SubcampaniaFilterTabs
        active={filter}
        onChange={onFilterChange}
        totales={totales}
      />

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Icon name="planting" className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-extrabold text-brand-800">
            Sin sub-campañas en este filtro
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            if (item.kind === 'draft') {
              const draft = item.draft
              const faltantes = getDraftFaltantes(draft)
              const header = (
                <SubcampaniaCardHeader
                  tipo={draft.tipo}
                  estado="BORRADOR"
                  nombre={draft.nombre || 'Sub-campaña sin nombre'}
                  ubicacion={getDraftMunicipio(draft)}
                />
              )
              const onTap = () => onDraftTap(draft)
              if (faltantes.length === 0) {
                return (
                  <SubcampaniaCardBorradorCompleto
                    key={`draft-${draft.draft_id}`}
                    onTap={onTap}
                    header={header}
                  />
                )
              }
              return (
                <SubcampaniaCardBorradorPendiente
                  key={`draft-${draft.draft_id}`}
                  faltantes={faltantes}
                  onTap={onTap}
                  header={header}
                />
              )
            }

            const sub = item.subcampania
            const tipo = sub.tipo ?? campania.tipo
            const ubicacion = getSubcampaniaUbicacion(campania, sub)
            const header = (
              <SubcampaniaCardHeader
                tipo={tipo}
                estado={sub.estado}
                nombre={sub.nombre}
                ubicacion={ubicacion}
              />
            )
            const onTap = () => onSubcampaniaTap(sub)

            if (sub.estado === 'ACTIVA') {
              const activaData = getSubcampaniaActivaData(sub)
              return (
                <SubcampaniaCardActiva
                  key={`sub-${sub.id}`}
                  onTap={onTap}
                  header={header}
                  coordinadorNombre={activaData.coordinadorNombre}
                  coordinadorIniciales={activaData.coordinadorIniciales}
                  areaHectareas={activaData.areaHectareas}
                  plantados={activaData.plantados}
                  meta={activaData.meta}
                  avancePct={activaData.avancePct}
                  personas={activaData.personas}
                  lotes={activaData.lotes}
                  eventos={activaData.eventos}
                />
              )
            }

            if (sub.estado === 'BORRADOR') {
              const faltantes = getSubcampaniaFaltantes(sub)
              if (faltantes.length === 0) {
                return (
                  <SubcampaniaCardBorradorCompleto
                    key={`sub-${sub.id}`}
                    onTap={onTap}
                    header={header}
                  />
                )
              }
              return (
                <SubcampaniaCardBorradorPendiente
                  key={`sub-${sub.id}`}
                  faltantes={faltantes}
                  onTap={onTap}
                  header={header}
                />
              )
            }

            return (
              <button
                key={`sub-${sub.id}`}
                type="button"
                onClick={onTap}
                className="block w-full rounded-3xl bg-white p-4 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300"
              >
                {header}
              </button>
            )
          })}
        </div>
      )}

      <AgregarSubcampaniaOutlined canCreate={canCreate} onCreate={onCreate} />
    </section>
  )
}

// ================= Actividad reciente =================

const ACTIVITY_ICON_BY_TIPO: Record<CampaniaActivityTipo, {
  iconName: 'planting' | 'plus' | 'check' | 'trash' | 'user'
  tone: 'emerald' | 'brand' | 'amber' | 'red' | 'slate'
}> = {
  plantacion: { iconName: 'planting', tone: 'emerald' },
  nueva_subcampana: { iconName: 'plus', tone: 'brand' },
  activacion: { iconName: 'check', tone: 'emerald' },
  cancelacion: { iconName: 'trash', tone: 'red' },
  cambio_coordinador: { iconName: 'user', tone: 'amber' },
}

const ACTIVITY_TONE_CLASSES: Record<
  'emerald' | 'brand' | 'amber' | 'red' | 'slate',
  string
> = {
  emerald: 'bg-success-50 text-success-700',
  brand: 'bg-brand-50 text-brand-700',
  amber: 'bg-warning-50 text-warning-700',
  red: 'bg-danger-50 text-danger-700',
  slate: 'bg-neutral-50 text-neutral-600',
}

function ActivityFeed({ items }: { items: CampaniaActivityItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand-500">
        Actividad reciente
      </p>
      <ul className="mt-3 divide-y divide-neutral-100">
        {items.map((item) => {
          const meta =
            ACTIVITY_ICON_BY_TIPO[item.tipo] ?? {
              iconName: 'info',
              tone: 'slate' as const,
            }
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 py-2.5 first:pt-1 last:pb-1"
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  ACTIVITY_TONE_CLASSES[meta.tone]
                }`}
              >
                <Icon name={meta.iconName} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-brand-900">
                  {item.autor}
                  {item.detalle && (
                    <span className="text-brand-800"> · {item.detalle}</span>
                  )}
                </p>
                {item.ubicacion && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] font-semibold text-neutral-500">
                    <Icon name="chevron-right" className="h-3 w-3 text-neutral-400" />
                    {item.ubicacion}
                  </p>
                )}
              </div>
              <p className="whitespace-nowrap text-[11px] font-bold text-neutral-400">
                {formatRelativeTime(item.timestamp)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ================= FAB =================

function AgregarSubcampaniaFab({
  canCreate,
  onCreate,
}: {
  canCreate: boolean
  onCreate: () => void
}) {
  if (!canCreate) return null
  return (
    <button
      type="button"
      onClick={onCreate}
      className="fixed bottom-24 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg ring-4 ring-white transition hover:bg-brand-600"
      aria-label="Crear sub-campaña"
    >
      <Icon name="plus" className="h-5 w-5" />
      Sub-campaña
    </button>
  )
}

// ================= Placeholder tab panel =================

function PendingTabPanel({ tab }: { tab: DashboardTab }) {
  const titleByTab: Record<DashboardTab, string> = {
    resumen: 'Resumen',
    equipo: 'Equipo agregado',
    lotes: 'Lotes comprometidos',
    mapa: 'Cobertura geográfica',
  }
  const copyByTab: Record<DashboardTab, string> = {
    resumen: 'El resumen aparece cuando existan sub-campañas.',
    equipo: 'La asignación de responsables vive en cada sub-campaña.',
    lotes: 'Los lotes se asignan a sub-campañas individuales.',
    mapa: 'La zona se define por sub-campaña y luego se agrega aquí.',
  }
  return (
    <section className="rounded-3xl bg-white p-5 text-center shadow-soft ring-1 ring-black/5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 text-neutral-500">
        <Icon
          name={tab === 'mapa' ? 'map' : tab === 'lotes' ? 'package' : 'info'}
          className="h-6 w-6"
        />
      </div>
      <p className="mt-3 text-base font-extrabold text-brand-800">{titleByTab[tab]}</p>
      <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-500">
        {copyByTab[tab]}
      </p>
    </section>
  )
}

// ================= Loading header =================

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
          Dashboard de campaña
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Cargando campaña</h1>
      </div>
    </header>
  )
}

// ================= Screen =================

function CampaniaAdminDashboardScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { campaniaId } = useParams()
  const state = location.state as LocationState | null
  const numericCampaniaId = Number(campaniaId)
  const hasValidCampaniaId = Number.isFinite(numericCampaniaId) && numericCampaniaId > 0
  const [campania, setCampania] = useState<Campania | null>(state?.campania ?? null)
  const [subcampanias, setSubcampanias] = useState<Subcampania[]>([])
  const [metrics, setMetrics] = useState<CampaniaMetrics | null>(null)
  const [activityFeed, setActivityFeed] = useState<CampaniaActivityItem[]>([])
  const [loading, setLoading] = useState(hasValidCampaniaId)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen')
  const [subcampaniaFilter, setSubcampaniaFilter] = useState<SubcampaniaFilter>('todas')
  const [localDrafts] = useState<SubcampaniaBaseDraft[]>(() =>
    hasValidCampaniaId ? loadSubcampaniaBaseDrafts(numericCampaniaId) : [],
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCampania, setDeletingCampania] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const visibleLocalDrafts = localDrafts.filter((draft) => !draft.subcampania_id)
  const canCreateSubcampania = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const isAdmin = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const visibleError = error ?? (!hasValidCampaniaId ? 'ID de campaña inválido.' : null)

  const requestIdRef = useRef(0)

  const refetchDashboard = useCallback(async () => {
    if (!hasValidCampaniaId) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const [campaniaResult, subsResult, metricsResult, activityResult] = await Promise.all([
        PlantacionService.getCampania(numericCampaniaId),
        PlantacionService.listSubcampaniasByCampania(numericCampaniaId),
        PlantacionService.getCampaniaMetrics(numericCampaniaId).catch(() => null),
        PlantacionService.getCampaniaActivity(numericCampaniaId, 5).catch(
          () => [] as CampaniaActivityItem[],
        ),
      ])
      if (requestId !== requestIdRef.current) return
      setCampania(campaniaResult)
      setSubcampanias(subsResult)
      setMetrics(metricsResult)
      setActivityFeed(activityResult)
      setError(null)
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return
      setSubcampanias([])
      setMetrics(null)
      setActivityFeed([])
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la campaña.',
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [hasValidCampaniaId, numericCampaniaId])

  useEffect(() => {
    void refetchDashboard()
  }, [refetchDashboard])

  const goBack = () => navigate('/app/planting')

  const goToNewSubcampania = () => {
    if (!campania) return
    const draftId = createSubcampaniaDraftId()
    navigate(
      `/app/planting/campanias/${campania.id}/subcampanias/new?draftId=${encodeURIComponent(
        draftId,
      )}&step=1`,
      { state: { campania, draftId } },
    )
  }

  const goToDraftSubcampania = (draft: SubcampaniaBaseDraft) => {
    if (!campania) return
    navigate(
      `/app/planting/campanias/${campania.id}/subcampanias/new?draftId=${encodeURIComponent(
        draft.draft_id,
      )}&step=1`,
      { state: { campania, draftId: draft.draft_id } },
    )
  }

  const goToSubcampania = (subcampania: Subcampania) => {
    navigate(`/app/planting/subcampanias/${subcampania.id}`)
  }

  const onEditarCampania = () => {
    if (!campania) return
    navigate(`/app/planting/campanias/${campania.id}/edit`, {
      state: { campania },
    })
  }

  const onDesactivarCampania = () => {
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  const confirmDesactivarCampania = async () => {
    if (!campania) return
    try {
      setDeletingCampania(true)
      setDeleteError(null)
      await PlantacionService.deleteCampania(campania.id, user?.auth_id)
      setDeleteDialogOpen(false)
      navigate('/app/planting', { replace: true })
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'No se pudo desactivar la campaña.',
      )
    } finally {
      setDeletingCampania(false)
    }
  }

  const allItems: SubcampaniaItem[] = useMemo(() => {
    const backendItems: SubcampaniaItem[] = subcampanias.map((subcampania) => ({
      kind: 'backend',
      subcampania,
    }))
    const draftItems: SubcampaniaItem[] = visibleLocalDrafts.map((draft) => ({
      kind: 'draft',
      draft,
    }))
    const borradores = [
      ...backendItems.filter((i) => isBorradorItem(i)),
      ...draftItems,
    ]
    const activas = backendItems.filter((i) => isActivaItem(i))
    const otros = backendItems.filter((i) => !isBorradorItem(i) && !isActivaItem(i))
    return [...borradores, ...activas, ...otros]
  }, [subcampanias, visibleLocalDrafts])

  const totales = useMemo(() => {
    const activa = allItems.filter(isActivaItem).length
    const borrador = allItems.filter(isBorradorItem).length
    return { todas: allItems.length, activa, borrador }
  }, [allItems])

  const filteredItems = useMemo(() => {
    if (subcampaniaFilter === 'activa') return allItems.filter(isActivaItem)
    if (subcampaniaFilter === 'borrador') return allItems.filter(isBorradorItem)
    return allItems
  }, [allItems, subcampaniaFilter])

  const sinCoordinadorCount = useMemo(() => {
    return subcampanias.filter((s) => {
      if (s.estado === 'CANCELADA' || s.estado === 'COMPLETADA') return false
      if (s.coordinador?.id) return false
      const equipo = s.equipo ?? []
      return !equipo.some((m) => m.rol === 'COORDINADOR')
    }).length
  }, [subcampanias])

  // Pre-check UX: el listado del backend excluye CANCELADA (ver plantacion.api),
  // así que si vemos cualquier subcampaña, hay un bloqueo. El 422 del DELETE cubre
  // el resto de reglas (COMPLETADA/PAUSADA/FINALIZADA_PARCIAL) si el cliente se
  // desincroniza.
  const canDeactivateCampania = subcampanias.length === 0

  const activeSubCount = countByEstado(subcampanias, 'ACTIVA')
  const draftBackendCount = countByEstado(subcampanias, 'BORRADOR')

  return (
    <div className="relative min-h-screen bg-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {campania && !loading ? (
          <CampaniaHeader
            campania={campania}
            subcampanias={subcampanias}
            onBack={goBack}
            onEditar={onEditarCampania}
            onDesactivar={onDesactivarCampania}
            desactivarDisabled={!canDeactivateCampania}
            desactivarDisabledReason={
              canDeactivateCampania
                ? undefined
                : 'Cancela primero las sub-campañas activas para poder desactivar.'
            }
            canManage={isAdmin}
          />
        ) : (
          <LoadingHeader onBack={goBack} />
        )}

        <main className="space-y-4 px-5 pt-2">
          {loading && (
            <div className="rounded-3xl bg-white px-4 py-6 text-center text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              Cargando campaña...
            </div>
          )}

          {visibleError && !loading && (
            <div className="rounded-3xl bg-danger-50 px-4 py-6 text-center text-sm font-semibold text-danger-700 shadow-soft ring-1 ring-danger-200">
              <p>{visibleError}</p>
              {hasValidCampaniaId && (
                <button
                  type="button"
                  onClick={() => void refetchDashboard()}
                  className="mt-3 rounded-xl bg-danger-100 px-4 py-2 text-xs font-bold text-danger-700 transition hover:bg-danger-200"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          {campania && !loading && !visibleError && (
            <>
              <DCTabs active={activeTab} onChange={setActiveTab} />

              {activeTab === 'resumen' && (
                <>
                  <MetricsGrid metrics={metrics} />
                  <NoCoordinadorAlert count={sinCoordinadorCount} />
                  <CoverageMapPreview
                    hectareas={metrics?.hectareas ?? 0}
                    activeCount={activeSubCount}
                    draftCount={draftBackendCount + visibleLocalDrafts.length}
                    onOpen={() => setActiveTab('mapa')}
                  />
                  <SubcampaniasSection
                    campania={campania}
                    items={filteredItems}
                    filter={subcampaniaFilter}
                    onFilterChange={setSubcampaniaFilter}
                    totales={totales}
                    onSubcampaniaTap={goToSubcampania}
                    onDraftTap={goToDraftSubcampania}
                    canCreate={canCreateSubcampania}
                    onCreate={goToNewSubcampania}
                  />
                  <ActivityFeed items={activityFeed} />
                </>
              )}

              {activeTab !== 'resumen' && <PendingTabPanel tab={activeTab} />}
            </>
          )}
        </main>
      </div>

      {campania && !loading && !visibleError && (
        <AgregarSubcampaniaFab
          canCreate={canCreateSubcampania}
          onCreate={goToNewSubcampania}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Desactivar campaña"
        description="Esta acción se puede revertir contactando al administrador. La campaña dejará de estar visible en el listado."
        confirmLabel={deleteError ? 'Reintentar' : 'Desactivar campaña'}
        cancelLabel="Cancelar"
        variant="danger"
        iconName="trash"
        loading={deletingCampania}
        errorMessage={deleteError}
        onConfirm={() => void confirmDesactivarCampania()}
        onCancel={() => {
          if (deletingCampania) return
          setDeleteDialogOpen(false)
          setDeleteError(null)
        }}
      />
    </div>
  )
}

export default CampaniaAdminDashboardScreen
