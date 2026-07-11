import type { Campania } from '../types/contracts'

// ── Estado derivado de campaña (normalizado para UI) ─────────────────────
// El backend expone `estado_derivado` como string libre; aquí se normaliza
// a un set conocido para badges, filtros y donut. Cualquier valor no
// reconocido cae en el meta DEFAULT sin romper la UI.

export type EstadoCampaniaKey =
  | 'ACTIVA'
  | 'BORRADOR'
  | 'CREADA'
  | 'EN_MANTENIMIENTO'
  | 'MONITOREO_HISTORICO'
  | 'COMPLETADA'
  | 'FINALIZADA_PARCIAL'

export type EstadoCampaniaMeta = {
  label: string
  short: string
  tone: string
  dot: string
  /** Color plano para segmentos del donut. */
  color: string
}

export const ESTADO_CAMPANIA_META: Record<EstadoCampaniaKey, EstadoCampaniaMeta> = {
  ACTIVA: {
    label: 'ACTIVA',
    short: 'ACTIVA',
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    dot: 'bg-emerald-500',
    color: '#10b981',
  },
  BORRADOR: {
    label: 'BORRADOR',
    short: 'BORRADOR',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
    color: '#94a3b8',
  },
  CREADA: {
    label: 'CREADA',
    short: 'CREADA',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
    color: '#cbd5e1',
  },
  EN_MANTENIMIENTO: {
    label: 'EN MANTENIMIENTO',
    short: 'MANTEN.',
    tone: 'bg-cyan-50 text-cyan-800 ring-cyan-100',
    dot: 'bg-cyan-500',
    color: '#06b6d4',
  },
  MONITOREO_HISTORICO: {
    label: 'MONITOREO HISTÓRICO',
    short: 'HISTÓRICO',
    tone: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-500',
    color: '#64748b',
  },
  COMPLETADA: {
    label: 'META ALCANZADA',
    short: 'COMPLETADA',
    tone: 'bg-blue-50 text-blue-800 ring-blue-100',
    dot: 'bg-blue-500',
    color: '#3b82f6',
  },
  FINALIZADA_PARCIAL: {
    label: 'CERRADA PARCIALMENTE',
    short: 'PARCIAL',
    tone: 'bg-amber-50 text-amber-800 ring-amber-100',
    dot: 'bg-amber-500',
    color: '#f59e0b',
  },
}

export const ESTADO_CAMPANIA_DEFAULT_META: EstadoCampaniaMeta = {
  label: 'SIN ESTADO',
  short: 'SIN ESTADO',
  tone: 'bg-slate-100 text-slate-700 ring-slate-200',
  dot: 'bg-slate-400',
  color: '#e2e8f0',
}

export function estadoCampaniaMeta(estado: string): EstadoCampaniaMeta {
  return (
    ESTADO_CAMPANIA_META[estado as EstadoCampaniaKey] ?? ESTADO_CAMPANIA_DEFAULT_META
  )
}

function toCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function toFinite(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Resuelve el estado visible de una campaña priorizando señales del backend:
 * subcampañas activas → ACTIVA; luego `estado_derivado` si es conocido;
 * luego heurística por conteos.
 */
export function resolveEstadoCampania(campania: Campania): EstadoCampaniaKey {
  const activas = toCount(campania.activas_count ?? campania.subcampanias_activas_count)
  if (activas > 0) return 'ACTIVA'

  const derivado = (campania.estado_derivado ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  if (derivado && derivado in ESTADO_CAMPANIA_META) {
    return derivado as EstadoCampaniaKey
  }

  const total = toCount(campania.count_subcampanias)
  if (total === 0) return 'CREADA'
  if (toCount(campania.borradores_count) >= total) return 'BORRADOR'
  return 'CREADA'
}

// ── Totales globales del programa (agregación client-side) ───────────────
// No existe endpoint global de métricas: se suman los agregados que ya
// devuelve `GET /campanias`. Los campos que el backend no envía quedan en
// `null` y la UI los muestra como "—".

export type DashboardTotals = {
  campanias: number
  arbolesPlantados: number
  metaArboles: number
  avancePct: number | null
  hectareas: number | null
  co2Toneladas: number | null
  supervivenciaPct: number | null
  subcampanias: number
  subcampaniasActivas: number
  estados: Partial<Record<EstadoCampaniaKey, number>>
  activas: number
  enMantenimiento: number
  historicas: number
}

export function aggregateDashboard(campanias: Campania[]): DashboardTotals {
  let arbolesPlantados = 0
  let metaArboles = 0
  let hectareas: number | null = null
  let co2: number | null = null
  let supWeighted = 0
  let supWeight = 0
  let supPlain = 0
  let supPlainCount = 0
  let subcampanias = 0
  let subcampaniasActivas = 0
  const estados: Partial<Record<EstadoCampaniaKey, number>> = {}

  for (const campania of campanias) {
    arbolesPlantados += toCount(campania.arboles_plantados)
    metaArboles += toCount(campania.meta_arboles ?? campania.meta_planificada_campania)
    subcampanias += toCount(campania.count_subcampanias)
    subcampaniasActivas += toCount(
      campania.activas_count ?? campania.subcampanias_activas_count,
    )

    const ha = toFinite(campania.hectareas)
    if (ha !== null) hectareas = (hectareas ?? 0) + ha

    const co2Campania = toFinite(campania.co2_proyectado_ton)
    if (co2Campania !== null) co2 = (co2 ?? 0) + co2Campania

    const sup = toFinite(campania.supervivencia_pct)
    if (sup !== null) {
      const plantados = toCount(campania.arboles_plantados)
      if (plantados > 0) {
        supWeighted += sup * plantados
        supWeight += plantados
      }
      supPlain += sup
      supPlainCount += 1
    }

    const estado = resolveEstadoCampania(campania)
    estados[estado] = (estados[estado] ?? 0) + 1
  }

  const supervivenciaPct =
    supWeight > 0
      ? Math.round(supWeighted / supWeight)
      : supPlainCount > 0
        ? Math.round(supPlain / supPlainCount)
        : null

  return {
    campanias: campanias.length,
    arbolesPlantados,
    metaArboles,
    avancePct: metaArboles > 0 ? Math.round((arbolesPlantados / metaArboles) * 100) : null,
    hectareas: hectareas !== null ? Math.round(hectareas * 10) / 10 : null,
    co2Toneladas: co2,
    supervivenciaPct,
    subcampanias,
    subcampaniasActivas,
    estados,
    activas: estados.ACTIVA ?? 0,
    enMantenimiento: estados.EN_MANTENIMIENTO ?? 0,
    historicas: estados.MONITOREO_HISTORICO ?? 0,
  }
}

// ── Filtro por periodo (client-side) ─────────────────────────────────────
// Filtra campañas cuyo rango estimado [inicio, fin] se solape con el
// periodo elegido. Campañas sin fechas se incluyen siempre (no se puede
// juzgar su periodo). "historico" no filtra.

export type PeriodoKey = 'mes' | 'trimestre' | 'anio' | 'historico'

export const PERIODO_OPCIONES: Array<{ key: PeriodoKey; label: string }> = [
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'anio', label: 'Año' },
  { key: 'historico', label: 'Histórico' },
]

function parseIsoDate(value?: string | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

export function filterByPeriodo(
  campanias: Campania[],
  periodo: PeriodoKey,
  now: Date = new Date(),
): Campania[] {
  if (periodo === 'historico') return campanias

  let start: Date
  let end: Date
  if (periodo === 'mes') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  } else if (periodo === 'trimestre') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
    start = new Date(now.getFullYear(), quarterStartMonth, 1)
    end = new Date(now.getFullYear(), quarterStartMonth + 3, 1)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear() + 1, 0, 1)
  }

  const startMs = start.getTime()
  const endMs = end.getTime()

  return campanias.filter((campania) => {
    const inicio = parseIsoDate(campania.fecha_estimada_inicio)
    const fin = parseIsoDate(campania.fecha_estimada_fin)
    if (inicio === null && fin === null) return true
    const desde = inicio ?? Number.NEGATIVE_INFINITY
    const hasta = fin ?? Number.POSITIVE_INFINITY
    return desde < endMs && hasta >= startMs
  })
}

// ── Resúmenes textuales por campaña ──────────────────────────────────────

export function zonaResumen(campania: Campania): string {
  if (campania.zonas?.length) {
    if (campania.zonas.length === 1) return campania.zonas[0]
    if (campania.zonas.length === 2) return `${campania.zonas[0]} · ${campania.zonas[1]}`
    return `${campania.zonas[0]} +${campania.zonas.length - 1} zonas`
  }
  const zonasCount = toCount(campania.zonas_count)
  if (zonasCount > 0) return `${zonasCount} zona${zonasCount === 1 ? '' : 's'}`
  return 'Sin zona asignada'
}

export function subcampaniasResumen(campania: Campania): string {
  const total = toCount(campania.count_subcampanias)
  if (total === 0) return 'Sin sub-campañas aún'
  const piezas: string[] = []
  const activas = toCount(campania.activas_count ?? campania.subcampanias_activas_count)
  const borradores = toCount(campania.borradores_count)
  if (activas > 0) piezas.push(`${activas} activa${activas > 1 ? 's' : ''}`)
  if (borradores > 0) piezas.push(`${borradores} borrador${borradores > 1 ? 'es' : ''}`)
  const sufijo = total === 1 ? 'sub-campaña' : 'sub-campañas'
  return `${total} ${sufijo}${piezas.length ? ' · ' + piezas.join(' · ') : ''}`
}

export function avancePctDe(campania: Campania): number {
  const backendPct = toFinite(campania.avance_pct)
  if (backendPct !== null && backendPct > 0) {
    return Math.max(0, Math.min(100, Math.round(backendPct)))
  }
  const plantados = toCount(campania.arboles_plantados)
  const meta = toCount(campania.meta_arboles ?? campania.meta_planificada_campania)
  if (meta === 0) return 0
  return Math.max(0, Math.min(100, Math.round((plantados / meta) * 100)))
}

export function formatEntero(value: number): string {
  return value.toLocaleString('es-BO')
}
