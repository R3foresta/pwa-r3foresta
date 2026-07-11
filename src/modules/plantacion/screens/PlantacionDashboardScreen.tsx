import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { type IconName } from '../../../components/Icon'
import { useAuth } from '../../../contexts/AuthContext'
import { PlantacionService } from '../../../services/plantacion.service'
import heroCanopy from '../../../assets/home/hero-canopy.jpg'
import {
  TIPO_CAMPANIA_LABEL,
  type Campania,
  type TipoCampania,
} from '../types/contracts'
import { formatDate as formatFullDate } from '../utils/subcampaniaFormatters'
import {
  aggregateDashboard,
  avancePctDe,
  estadoCampaniaMeta,
  filterByPeriodo,
  formatEntero,
  PERIODO_OPCIONES,
  resolveEstadoCampania,
  subcampaniasResumen,
  zonaResumen,
  type EstadoCampaniaKey,
  type PeriodoKey,
} from '../utils/dashboardAggregates'

// ── Actividad reciente (DEMO) ─────────────────────────────────────────────
// TODO(backend): no existe endpoint global de actividad (solo
// GET /campanias/:id/activity). Estos items son demostrativos para el MVP;
// reemplazar cuando exista `GET /campanias/activity` o equivalente.
type ActividadDemoItem = {
  id: string
  kind: 'PLANTACION' | 'CAMPANA' | 'EQUIPO' | 'PAUSA'
  label: string
  contexto: string
  tiempo: string
}

const ACTIVIDAD_DEMO: ActividadDemoItem[] = [
  {
    id: 'demo-1',
    kind: 'PLANTACION',
    label: 'Registro de plantación · 12 árboles',
    contexto: 'Arborización La Paz › Achocalla',
    tiempo: 'hace 2 h',
  },
  {
    id: 'demo-2',
    kind: 'PLANTACION',
    label: 'Registro de plantación · 45 árboles',
    contexto: 'Reforestación Hampaturi › Hampaturi Alto',
    tiempo: 'hace 6 h',
  },
  {
    id: 'demo-3',
    kind: 'CAMPANA',
    label: 'Nueva sub-campaña en borrador',
    contexto: 'Arborización La Paz › Mallasa',
    tiempo: 'hace 1 día',
  },
  {
    id: 'demo-4',
    kind: 'EQUIPO',
    label: 'Operario asignado al equipo',
    contexto: 'Reforestación Hampaturi › Hampaturi Bajo',
    tiempo: 'hace 2 días',
  },
]

// ── Átomos de UI ──────────────────────────────────────────────────────────

type ProgressTone = 'brand' | 'emerald' | 'amber' | 'blue'

function Progress({
  pct,
  tone = 'brand',
  height = 6,
}: {
  pct: number
  tone?: ProgressTone
  height?: number
}) {
  const tones: Record<ProgressTone, string> = {
    brand: 'bg-brand-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  }
  return (
    <div
      className="relative w-full overflow-hidden rounded-full bg-slate-100"
      style={{ height }}
    >
      <div
        className={`h-full rounded-full ${tones[tone]} transition-[width]`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

type DonutSlice = { key: string; value: number; color: string }

function StatesDonut({
  data,
  size = 92,
  stroke = 14,
}: {
  data: DonutSlice[]
  size?: number
  stroke?: number
}) {
  const total = data.reduce((acc, slice) => acc + slice.value, 0) || 1
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const segments = data.reduce<Array<DonutSlice & { length: number; offset: number }>>(
    (acc, slice) => {
      const previous = acc.length > 0 ? acc[acc.length - 1] : null
      acc.push({
        ...slice,
        length: (slice.value / total) * circumference,
        offset: previous ? previous.offset + previous.length : 0,
      })
      return acc
    },
    [],
  )
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#eef2ed"
        strokeWidth={stroke}
      />
      {segments.map((segment) => (
        <circle
          key={segment.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={segment.color}
          strokeWidth={stroke}
          strokeDasharray={`${segment.length} ${circumference - segment.length}`}
          strokeDashoffset={-segment.offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
    </svg>
  )
}

function EstadoCampaniaBadge({ estado }: { estado: EstadoCampaniaKey }) {
  const meta = estadoCampaniaMeta(estado)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${meta.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.short}
    </span>
  )
}

function getTipoTone(tipo: TipoCampania): string {
  if (tipo === 'ARBORIZACION') return 'bg-sky-50 text-sky-800 ring-sky-100'
  if (tipo === 'FORESTACION') return 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  return 'bg-brand-50 text-brand-700 ring-brand-100'
}

function TipoCampaniaBadge({ tipo }: { tipo: TipoCampania }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${getTipoTone(tipo)}`}
    >
      {TIPO_CAMPANIA_LABEL[tipo]}
    </span>
  )
}

// ── Header ────────────────────────────────────────────────────────────────

function initialsDe(nombre?: string, apellido?: string, fallback?: string): string {
  const first = nombre?.trim()?.[0] ?? ''
  const second = apellido?.trim()?.[0] ?? nombre?.trim()?.split(/\s+/)[1]?.[0] ?? ''
  const joined = `${first}${second}`.toUpperCase()
  if (joined) return joined
  return (fallback ?? 'R3').slice(0, 2).toUpperCase()
}

function DashboardHeader({
  saludo,
  rol,
  iniciales,
  hayAlertas,
  onBack,
  onAlertas,
}: {
  saludo: string
  rol: string
  iniciales: string
  hayAlertas: boolean
  onBack: () => void
  onAlertas: () => void
}) {
  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
      <img
        src={heroCanopy}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-700/85 via-brand-700/85 to-brand-700" />
      <div className="relative px-5 pb-5 pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
            >
              <Icon name="arrow-left" className="h-5 w-5" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xs font-extrabold tracking-wide text-white ring-1 ring-white/25">
              {iniciales}
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
                {saludo}
              </p>
              <p className="text-sm font-extrabold leading-tight">{rol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAlertas}
            aria-label="Actividad reciente"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
          >
            <Icon name="bell" className="h-5 w-5" />
            {hayAlertas && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-300 ring-2 ring-brand-700" />
            )}
          </button>
        </div>

        <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">
          Programa de plantación · {new Date().getFullYear()}
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          Resumen general
        </h1>
        <p className="mt-1 text-[13px] font-medium leading-snug text-white/80">
          Métricas del programa, campañas en curso y actividad reciente del equipo.
        </p>
      </div>
    </header>
  )
}

function PeriodoTabs({
  value,
  onChange,
}: {
  value: PeriodoKey
  onChange: (periodo: PeriodoKey) => void
}) {
  return (
    <div className="flex rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
      {PERIODO_OPCIONES.map((opcion) => {
        const isOn = opcion.key === value
        return (
          <button
            key={opcion.key}
            type="button"
            onClick={() => onChange(opcion.key)}
            className={`flex-1 rounded-full px-2 py-2 text-[11.5px] font-extrabold tracking-wide transition ${
              isOn
                ? 'bg-brand-600 text-white shadow-soft'
                : 'text-brand-700 hover:bg-brand-50'
            }`}
          >
            {opcion.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Hero CO₂ en vivo + árboles ────────────────────────────────────────────
// El contador parte del CO₂ proyectado real (suma de campañas) y avanza con
// una tasa visual constante para transmitir "captura en curso". La tasa es
// ilustrativa; el valor base sí es dato real del backend.

function CO2LiveHero({
  baseToneladas,
  arbolesPlantados,
  metaArboles,
  avancePct,
}: {
  baseToneladas: number | null
  arbolesPlantados: number
  metaArboles: number
  avancePct: number | null
}) {
  const RATE_TON_PER_SECOND = 0.0000008
  const [value, setValue] = useState(baseToneladas ?? 0)

  useEffect(() => {
    if (baseToneladas === null) return

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const start = performance.now()
    let raf = 0
    // La sincronización con `baseToneladas` ocurre en el primer frame del
    // RAF (callback externo), evitando setState síncrono dentro del efecto.
    const tick = (now: number) => {
      setValue(baseToneladas + ((now - start) / 1000) * RATE_TON_PER_SECOND)
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [baseToneladas])

  const hasCo2 = baseToneladas !== null
  const shown = hasCo2 ? value : 0
  const intPart = Math.floor(shown)
  const decPart = (shown - intPart).toFixed(8).slice(2)
  const kgPorHora = (RATE_TON_PER_SECOND * 3600 * 1000).toFixed(2).replace('.', ',')
  const kgPorArbol =
    hasCo2 && arbolesPlantados > 0 ? (shown * 1000) / arbolesPlantados : null
  const pctArboles = avancePct !== null ? Math.min(100, avancePct) : null

  return (
    // El gradiente va inline (no como clases from/via/to) para garantizar el
    // fondo oscuro aunque el dev server tenga una versión vieja del config de
    // Tailwind (brand-800/900 son recientes). Colores = emerald-800 → brand-800
    // → brand-900 del mock.
    <div
      className="relative overflow-hidden rounded-3xl p-4 text-white shadow-soft ring-1 ring-emerald-400/15"
      style={{
        backgroundImage: 'linear-gradient(to bottom right, #065f46, #0c2e1c 55%, #08140f)',
      }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative">
        {/* Bloque 1 — CO₂ proyectado */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 ring-1 ring-emerald-300/25">
              {hasCo2 && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                </span>
              )}
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-emerald-100">
                {hasCo2 ? 'Captura en vivo' : 'Captura estimada'}
              </p>
            </div>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200/90">
              CO₂ proyectado · acumulado del programa
            </p>
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/30">
            <Icon name="drop" className="h-6 w-6 text-emerald-200" />
          </div>
        </div>

        {hasCo2 ? (
          <>
            <p className="mt-2.5 font-extrabold leading-none tracking-tight tabular-nums">
              <span className="text-[44px]">{formatEntero(intPart)}</span>
              <span className="text-[20px] text-emerald-200/85">,{decPart}</span>
              <span className="ml-2 text-base font-extrabold text-emerald-200/80">T</span>
            </p>
            <p className="mt-1.5 text-[11px] font-bold text-emerald-100/80">
              midiendo ~{kgPorHora} kg / h en tiempo real
            </p>
          </>
        ) : (
          <div className="mt-2.5 rounded-2xl bg-emerald-400/10 px-3 py-2.5 ring-1 ring-emerald-300/20">
            <p className="text-[12px] font-bold leading-snug text-emerald-100/90">
              La captura se proyectará a medida que se registren plantaciones en las
              sub-campañas.
            </p>
          </div>
        )}

        {/* Divisor sutil */}
        <div className="my-3.5 h-px w-full bg-gradient-to-r from-transparent via-emerald-300/25 to-transparent" />

        {/* Bloque 2 — Árboles plantados (la causa del CO₂) */}
        <div className="flex items-stretch gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/25">
              <Icon name="trees" className="h-5 w-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-emerald-200/80">
                Árboles plantados
              </p>
              <p className="text-[20px] font-extrabold leading-none tabular-nums text-white">
                {formatEntero(arbolesPlantados)}
              </p>
              {metaArboles > 0 && pctArboles !== null ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-200/85">
                  <Icon name="trending-up" className="h-3 w-3" />
                  {pctArboles}% de la meta · {formatEntero(metaArboles)}
                </p>
              ) : (
                <p className="mt-1 text-[10.5px] font-bold text-emerald-200/80">
                  sin meta agregada aún
                </p>
              )}
            </div>
          </div>
          <div className="w-px self-stretch bg-emerald-300/15" />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-emerald-200/80">
              Captura / árbol
            </p>
            <p className="text-[20px] font-extrabold leading-none tabular-nums text-white">
              {kgPorArbol !== null ? (
                <>
                  {kgPorArbol.toFixed(2).replace('.', ',')}
                  <span className="ml-1 text-[13px] font-extrabold text-emerald-200/80">
                    kg
                  </span>
                </>
              ) : (
                <span className="text-emerald-100/70">—</span>
              )}
            </p>
            <p className="mt-1 text-[10.5px] font-bold text-emerald-200/80">
              promedio proyectado
            </p>
          </div>
        </div>

        {metaArboles > 0 && pctArboles !== null && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-[11px] font-extrabold">
              <span className="text-emerald-100/80">
                Meta {formatEntero(metaArboles)} árboles
              </span>
              <span className="tabular-nums text-emerald-200">{pctArboles}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-200 shadow-[0_0_10px_rgba(110,231,183,0.55)]"
                style={{ width: `${pctArboles}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Métricas secundarias ──────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  pct,
  icon,
  tone = 'brand',
  footer,
}: {
  label: string
  value: string
  unit?: string
  pct?: number
  icon?: IconName
  tone?: ProgressTone
  footer?: string
}) {
  const toneText: Record<ProgressTone, string> = {
    brand: 'text-brand-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
  }
  return (
    <div className="rounded-3xl bg-white p-3.5 shadow-soft ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
          {label}
        </p>
        {icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <p
        className={`mt-1.5 text-[24px] font-extrabold leading-none tracking-tight tabular-nums ${toneText[tone]}`}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-extrabold text-slate-400">{unit}</span>}
      </p>
      {pct !== undefined && (
        <div className="mt-2">
          <Progress pct={pct} tone={tone} />
        </div>
      )}
      {footer && <p className="mt-2 text-[11px] font-medium text-slate-500">{footer}</p>}
    </div>
  )
}

// ── Estado de campañas (donut + leyenda) ──────────────────────────────────

const ESTADOS_ORDEN: EstadoCampaniaKey[] = [
  'ACTIVA',
  'BORRADOR',
  'CREADA',
  'EN_MANTENIMIENTO',
  'COMPLETADA',
  'FINALIZADA_PARCIAL',
  'MONITOREO_HISTORICO',
]

function EstadosBreakdown({
  estados,
  total,
  onSelect,
}: {
  estados: Partial<Record<EstadoCampaniaKey, number>>
  total: number
  onSelect: (estado: EstadoCampaniaKey) => void
}) {
  const items = ESTADOS_ORDEN.map((key) => ({
    key,
    meta: estadoCampaniaMeta(key),
    value: estados[key] ?? 0,
  })).filter((item) => item.value > 0)

  if (!items.length) return null

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-baseline justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Estado de campañas
        </p>
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          {total} total
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <StatesDonut
            data={items.map((item) => ({
              key: item.key,
              value: item.value,
              color: item.meta.color,
            }))}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[20px] font-extrabold leading-none tabular-nums text-brand-800">
              {total}
            </p>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
              campañas
            </p>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-brand-50"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: item.meta.color }}
                />
                <span className="flex-1 truncate text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-700">
                  {item.meta.short}
                </span>
                <span className="text-sm font-extrabold tabular-nums text-brand-800">
                  {item.value}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ── Fila de campaña ───────────────────────────────────────────────────────

function orgIniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function OrgPile({ campania }: { campania: Campania }) {
  const organizaciones = campania.organizaciones ?? []
  const shown = organizaciones.slice(0, 4)
  const rest = organizaciones.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((org, index) => (
        <span
          key={org.id}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5"
          style={{ marginLeft: index === 0 ? 0 : -10 }}
        >
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.nombre} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-extrabold text-brand-700">
              {orgIniciales(org.nombre)}
            </span>
          )}
        </span>
      ))}
      {rest > 0 && (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-[10px] font-extrabold text-slate-600 ring-2 ring-white"
          style={{ marginLeft: -10 }}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}

function formatDate(value?: string | null): string {
  return formatFullDate(value, { fallback: 'Sin fecha' })
}

function CampaniaRow({
  campania,
  onTap,
}: {
  campania: Campania
  onTap: () => void
}) {
  const estado = resolveEstadoCampania(campania)
  const pct = avancePctDe(campania)
  const plantados = Number(campania.arboles_plantados) || 0
  const meta = Number(campania.meta_arboles ?? campania.meta_planificada_campania) || 0
  const hectareas = Number(campania.hectareas)
  const organizaciones = campania.organizaciones ?? []
  const progressTone: ProgressTone =
    estado === 'EN_MANTENIMIENTO' || estado === 'COMPLETADA'
      ? 'blue'
      : estado === 'MONITOREO_HISTORICO' || estado === 'FINALIZADA_PARCIAL'
        ? 'amber'
        : 'brand'

  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full rounded-2xl bg-white p-3.5 text-left shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300 active:scale-[0.995]"
    >
      <div className="flex items-start gap-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name="trees" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <EstadoCampaniaBadge estado={estado} />
            <TipoCampaniaBadge tipo={campania.tipo} />
          </div>
          <p className="mt-1 truncate text-[14px] font-extrabold leading-tight text-brand-800">
            {campania.nombre}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500">
            <Icon name="pin" className="h-3 w-3 text-slate-400" />
            {zonaResumen(campania)}
          </p>
        </div>
        <Icon name="chevron-right" className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
      </div>

      {/* Resumen jerárquico: conteo de sub-campañas por estado */}
      <p className="mt-2 text-[11px] font-extrabold text-brand-700">
        <Icon name="trees" className="-mt-0.5 mr-1 inline h-3 w-3 text-brand-500" />
        {subcampaniasResumen(campania)}
      </p>

      {organizaciones.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbf7] px-3 py-2.5 ring-1 ring-brand-100">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
              Organizaciones asociadas
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
              {organizaciones.map((org) => org.nombre).join(' · ')}
            </p>
          </div>
          <OrgPile campania={campania} />
        </div>
      )}

      {meta > 0 && (
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
              Avance agregado
            </p>
            <p className="text-[11px] font-extrabold tabular-nums text-brand-800">
              {formatEntero(plantados)}
              <span className="text-slate-400"> / {formatEntero(meta)}</span>
              <span className="ml-1.5 text-brand-500">{pct}%</span>
            </p>
          </div>
          <div className="mt-1">
            <Progress pct={pct} tone={progressTone} />
          </div>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[10.5px] font-bold text-slate-500">
          <Icon name="date" className="h-3 w-3 text-slate-400" />
          {formatDate(campania.fecha_estimada_inicio)} → {formatDate(campania.fecha_estimada_fin)}
        </p>
        {Number.isFinite(hectareas) && hectareas > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand-700 ring-1 ring-brand-100">
            {String(hectareas).replace('.', ',')} ha
          </span>
        )}
      </div>
    </button>
  )
}

// ── Actividad reciente ────────────────────────────────────────────────────

function ActividadRow({ item }: { item: ActividadDemoItem }) {
  const kindMeta: Record<ActividadDemoItem['kind'], { icon: IconName; tone: string }> = {
    PLANTACION: { icon: 'planting', tone: 'bg-emerald-50 text-emerald-700' },
    CAMPANA: { icon: 'plus-circle', tone: 'bg-brand-50 text-brand-700' },
    EQUIPO: { icon: 'users', tone: 'bg-blue-50 text-blue-700' },
    PAUSA: { icon: 'pause', tone: 'bg-amber-50 text-amber-800' },
  }
  const meta = kindMeta[item.kind]
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
      >
        <Icon name={meta.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold leading-tight text-brand-800">{item.label}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
          {item.contexto}
        </p>
      </div>
      <p className="whitespace-nowrap pt-0.5 text-[10.5px] font-bold text-slate-400">
        {item.tiempo}
      </p>
    </li>
  )
}

// ── Skeleton de carga ─────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-11 rounded-full bg-white shadow-soft ring-1 ring-black/5" />
      <div className="h-64 rounded-3xl bg-brand-100/70" />
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 rounded-3xl bg-white shadow-soft ring-1 ring-black/5" />
        ))}
      </div>
      <div className="h-36 rounded-3xl bg-white shadow-soft ring-1 ring-black/5" />
      <div className="h-44 rounded-2xl bg-white shadow-soft ring-1 ring-black/5" />
    </div>
  )
}

// ── Pantalla ──────────────────────────────────────────────────────────────

type FiltroEstado = 'TODAS' | EstadoCampaniaKey

function PlantacionDashboardScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [campanias, setCampanias] = useState<Campania[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoKey>('historico')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODAS')
  const actividadRef = useRef<HTMLElement | null>(null)
  const campaniasSectionRef = useRef<HTMLElement | null>(null)

  const canCreate = (user?.rol ?? '').toUpperCase() === 'ADMIN'

  const loadCampanias = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await PlantacionService.listCampanias()
      setCampanias(data)
    } catch (loadError) {
      setCampanias([])
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudieron cargar campañas.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCampanias()
  }, [])

  const campaniasPeriodo = useMemo(
    () => filterByPeriodo(campanias, periodo),
    [campanias, periodo],
  )

  const totals = useMemo(() => aggregateDashboard(campaniasPeriodo), [campaniasPeriodo])

  const filtros = useMemo<Array<{ key: FiltroEstado; label: string }>>(() => {
    const presentes = ESTADOS_ORDEN.filter((key) => (totals.estados[key] ?? 0) > 0)
    return [
      { key: 'TODAS' as const, label: 'TODAS' },
      ...presentes.map((key) => ({ key, label: estadoCampaniaMeta(key).short })),
    ]
  }, [totals.estados])

  const campaniasVisibles = useMemo(() => {
    if (filtroEstado === 'TODAS') return campaniasPeriodo
    return campaniasPeriodo.filter(
      (campania) => resolveEstadoCampania(campania) === filtroEstado,
    )
  }, [campaniasPeriodo, filtroEstado])

  // Si el filtro activo deja de existir al cambiar de periodo, se resetea.
  useEffect(() => {
    if (filtroEstado !== 'TODAS' && (totals.estados[filtroEstado] ?? 0) === 0) {
      setFiltroEstado('TODAS')
    }
  }, [totals.estados, filtroEstado])

  const saludo = `Hola, ${user?.nombre?.split(/\s+/)[0] ?? user?.username ?? 'equipo'}`
  const rolLabel = user?.rol
    ? `${user.rol.charAt(0).toUpperCase()}${user.rol.slice(1).toLowerCase()} · Plantación`
    : 'Plantación'
  const iniciales = initialsDe(user?.nombre, user?.apellido, user?.username)

  const handleSelectEstado = (estado: EstadoCampaniaKey) => {
    setFiltroEstado(estado)
    campaniasSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <DashboardHeader
          saludo={saludo}
          rol={rolLabel}
          iniciales={iniciales}
          hayAlertas={ACTIVIDAD_DEMO.length > 0}
          onBack={() => navigate('/app/home')}
          onAlertas={() =>
            actividadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        />

        <div className="space-y-4 px-5 pt-4">
          {loading && <DashboardSkeleton />}

          {error && !loading && (
            <div className="rounded-3xl bg-red-50 px-4 py-6 text-center text-sm font-semibold text-red-700 shadow-soft ring-1 ring-red-200">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadCampanias()}
                className="mt-3 rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && campanias.length === 0 && (
            <div className="rounded-3xl border border-dashed border-brand-100 bg-white px-4 py-8 text-center shadow-soft">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon name="planting" className="h-7 w-7" />
              </div>
              <p className="mt-3 text-base font-extrabold text-brand-800">
                Aún no hay campañas
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                {canCreate
                  ? 'Crea una campaña para luego agregar sub-campañas operativas.'
                  : 'Cuando existan campañas verás aquí el resumen del programa.'}
              </p>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => navigate('/app/planting/campanias/new')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-700"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Nueva campaña
                </button>
              )}
            </div>
          )}

          {!loading && !error && campanias.length > 0 && (
            <>
              <PeriodoTabs value={periodo} onChange={setPeriodo} />

              <CO2LiveHero
                baseToneladas={totals.co2Toneladas}
                arbolesPlantados={totals.arbolesPlantados}
                metaArboles={totals.metaArboles}
                avancePct={totals.avancePct}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <MetricCard
                  label="Supervivencia"
                  value={
                    totals.supervivenciaPct !== null ? String(totals.supervivenciaPct) : '—'
                  }
                  unit="%"
                  pct={totals.supervivenciaPct ?? undefined}
                  icon="shield"
                  tone="brand"
                  footer={
                    totals.supervivenciaPct !== null
                      ? 'Ponderada por árboles plantados'
                      : 'Sin registros de supervivencia'
                  }
                />
                <MetricCard
                  label="Hectáreas"
                  value={
                    totals.hectareas !== null
                      ? String(totals.hectareas).replace('.', ',')
                      : '—'
                  }
                  unit="ha"
                  icon="area"
                  tone="amber"
                  footer="Cobertura registrada"
                />
                <MetricCard
                  label="Sub-campañas"
                  value={formatEntero(totals.subcampanias)}
                  icon="layers"
                  tone="emerald"
                  footer={
                    totals.subcampaniasActivas > 0
                      ? `${formatEntero(totals.subcampaniasActivas)} en ejecución`
                      : 'Ninguna en ejecución aún'
                  }
                />
                <MetricCard
                  label="Campañas activas"
                  value={formatEntero(totals.activas)}
                  icon="planting"
                  tone="brand"
                  footer={
                    [
                      totals.enMantenimiento > 0
                        ? `${totals.enMantenimiento} en mantenimiento`
                        : null,
                      totals.historicas > 0 ? `${totals.historicas} históricas` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || `De ${formatEntero(totals.campanias)} en total`
                  }
                />
              </div>

              <EstadosBreakdown
                estados={totals.estados}
                total={totals.campanias}
                onSelect={handleSelectEstado}
              />

              {/* Campañas */}
              <section ref={campaniasSectionRef} className="scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                    Campañas{' '}
                    <span className="text-slate-400">
                      · {campaniasVisibles.length} de {campaniasPeriodo.length}
                    </span>
                  </p>
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => navigate('/app/planting/campanias/new')}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.97]"
                    >
                      <Icon name="plus" className="h-3.5 w-3.5" />
                      Nueva
                    </button>
                  )}
                </div>
                <div
                  className="-mx-5 mt-2 overflow-x-auto px-5"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <div className="flex gap-1.5 pb-1.5 pr-2">
                    {filtros.map((filtro) => {
                      const isOn = filtro.key === filtroEstado
                      return (
                        <button
                          key={filtro.key}
                          type="button"
                          onClick={() => setFiltroEstado(filtro.key)}
                          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ring-1 transition ${
                            isOn
                              ? 'bg-brand-600 text-white ring-brand-700'
                              : 'bg-white text-brand-700 ring-brand-100 hover:ring-brand-300'
                          }`}
                        >
                          {filtro.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-1 space-y-2">
                  {campaniasVisibles.length === 0 ? (
                    <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
                      <Icon name="planting" className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-extrabold text-brand-800">
                        Sin campañas en este estado
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Cambia el filtro o el periodo.
                      </p>
                    </div>
                  ) : (
                    campaniasVisibles.map((campania) => (
                      <CampaniaRow
                        key={campania.id}
                        campania={campania}
                        onTap={() =>
                          navigate(`/app/planting/campanias/${campania.id}`, {
                            state: { campania },
                          })
                        }
                      />
                    ))
                  )}
                </div>
              </section>

              {/* Actividad reciente (demo hasta tener endpoint global) */}
              <section
                ref={actividadRef}
                className="scroll-mt-4 rounded-3xl bg-white shadow-soft ring-1 ring-black/5"
              >
                <header className="flex items-center justify-between px-4 pb-2 pt-3.5">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
                    Actividad reciente
                  </p>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-100">
                    Vista previa
                  </span>
                </header>
                <ul className="divide-y divide-slate-100 pb-1.5">
                  {ACTIVIDAD_DEMO.map((item) => (
                    <ActividadRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

export default PlantacionDashboardScreen
