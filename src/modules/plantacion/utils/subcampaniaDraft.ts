import { clearDraft, loadDraft, saveDraft } from '../../../utils/formDraft'
import type { ComunidadCard } from '../../../tipos/comunidades'
import type { UsuarioResumen } from '../../../types/users'
import type { Campania, GeoJsonPolygon, GeoJsonPosition } from '../types/contracts'

export type SubcampaniaPolygonLocationDraft = {
  latitud: number
  longitud: number
  precision_m?: number | null
  fuente: 'GPS_MOVIL' | 'PRUEBA'
}

export type SubcampaniaEspecieDraft = {
  planta_id: number
  especie: string
  nombre_cientifico: string
  nombre_comun_principal?: string | null
  saldo_disponible: number
  pct: number
}

export type SubcampaniaBaseDraft = {
  draft_id: string
  subcampania_id?: number | null
  campania_id: number
  tipo: Campania['tipo']
  nombre: string
  comunidad: ComunidadCard | null
  coordinador: UsuarioResumen | null
  fecha_estimada_inicio: string
  fecha_estimada_fin: string
  poligono_geojson?: GeoJsonPolygon | null
  area_hectareas?: number | null
  area_hectareas_estimada?: number | null
  ubicacion_poligono?: SubcampaniaPolygonLocationDraft | null
  poligono_backend_sincronizado_at?: string | null
  meta_total_arboles?: number | null
  especies?: SubcampaniaEspecieDraft[]
  equipo_operarios?: UsuarioResumen[]
  created_at: string
  updated_at: string
}

function getLegacySubcampaniaBaseDraftKey(campaniaId: number): string {
  return `r3foresta:subcampania-wizard:${campaniaId}:base`
}

function getSubcampaniaBaseDraftsKey(campaniaId: number): string {
  return `r3foresta:subcampania-wizard:${campaniaId}:base:drafts`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTipoCampania(value: unknown): value is Campania['tipo'] {
  return value === 'REFORESTACION' || value === 'ARBORIZACION' || value === 'FORESTACION'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeNullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null
  return isFiniteNumber(value) ? value : undefined
}

function isGeoJsonPosition(value: unknown): value is GeoJsonPosition {
  if (!Array.isArray(value) || value.length < 2) return false
  const [lng, lat] = value
  return isFiniteNumber(lng) && isFiniteNumber(lat)
}

function normalizeGeoJsonPolygon(value: unknown): GeoJsonPolygon | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  if (value.type !== 'Polygon') return undefined
  if (!Array.isArray(value.coordinates)) return undefined

  const coordinates: GeoJsonPosition[][] = []
  for (const ring of value.coordinates) {
    if (!Array.isArray(ring)) return undefined
    const normalizedRing: GeoJsonPosition[] = []
    for (const point of ring) {
      if (!isGeoJsonPosition(point)) return undefined
      normalizedRing.push([point[0], point[1]])
    }
    coordinates.push(normalizedRing)
  }

  return {
    type: 'Polygon',
    coordinates,
  }
}

function normalizePolygonLocation(value: unknown): SubcampaniaPolygonLocationDraft | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined

  const rawLatitud = value.latitud
  const rawLongitud = value.longitud
  const rawPrecision = value.precision_m
  const rawFuente = value.fuente

  if (!isFiniteNumber(rawLatitud) || !isFiniteNumber(rawLongitud)) return undefined
  if (rawFuente !== 'GPS_MOVIL' && rawFuente !== 'PRUEBA') return undefined

  return {
    latitud: rawLatitud,
    longitud: rawLongitud,
    precision_m: rawPrecision === null || isFiniteNumber(rawPrecision) ? rawPrecision : null,
    fuente: rawFuente,
  }
}

function normalizeEquipoOperariosDraft(value: unknown): UsuarioResumen[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((raw) => {
    if (!isRecord(raw)) return []
    const id = Number(raw.id)
    if (!Number.isFinite(id) || id <= 0) return []
    return [
      {
        id,
        nombre: typeof raw.nombre === 'string' ? raw.nombre : '',
        rol: typeof raw.rol === 'string' ? raw.rol : 'OPERARIO',
        apellido: typeof raw.apellido === 'string' ? raw.apellido : null,
        username: typeof raw.username === 'string' ? raw.username : null,
        correo: typeof raw.correo === 'string' ? raw.correo : null,
        auth_id: typeof raw.auth_id === 'string' ? raw.auth_id : null,
      },
    ]
  })
}

function normalizeEspeciesDraft(value: unknown): SubcampaniaEspecieDraft[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((raw) => {
    if (!isRecord(raw)) return []
    const plantaId = Number(raw.planta_id)
    const pct = Number(raw.pct)
    const saldo = Number(raw.saldo_disponible)
    if (!Number.isFinite(plantaId) || plantaId <= 0) return []
    if (!Number.isFinite(pct)) return []
    return [
      {
        planta_id: plantaId,
        especie: typeof raw.especie === 'string' ? raw.especie : '',
        nombre_cientifico:
          typeof raw.nombre_cientifico === 'string' ? raw.nombre_cientifico : '',
        nombre_comun_principal:
          typeof raw.nombre_comun_principal === 'string' ? raw.nombre_comun_principal : null,
        saldo_disponible: Number.isFinite(saldo) ? saldo : 0,
        pct: Math.max(0, Math.min(100, Math.round(pct))),
      },
    ]
  })
}

function normalizeSubcampaniaBaseDraft(
  value: unknown,
  campaniaId: number,
  fallbackDraftId: string,
): SubcampaniaBaseDraft | null {
  if (!isRecord(value)) return null

  const rawCampaniaId = value.campania_id
  const rawTipo = value.tipo

  if (typeof rawCampaniaId !== 'number' || rawCampaniaId !== campaniaId) return null
  if (!isTipoCampania(rawTipo)) return null

  const now = new Date().toISOString()
  const rawDraftId = value.draft_id
  const rawCreatedAt = value.created_at
  const rawUpdatedAt = value.updated_at
  const rawNombre = value.nombre
  const rawFechaInicio = value.fecha_estimada_inicio
  const rawFechaFin = value.fecha_estimada_fin
  const rawComunidad = value.comunidad
  const rawCoordinador = value.coordinador
  const rawSubcampaniaId = value.subcampania_id
  const rawPoligono = normalizeGeoJsonPolygon(value.poligono_geojson)
  const rawAreaHectareas = normalizeNullableNumber(value.area_hectareas)
  const rawAreaHectareasEstimada = normalizeNullableNumber(value.area_hectareas_estimada)
  const rawUbicacionPoligono = normalizePolygonLocation(value.ubicacion_poligono)
  const rawPoligonoBackendSincronizadoAt = value.poligono_backend_sincronizado_at
  const rawMetaTotalArboles = normalizeNullableNumber(value.meta_total_arboles)
  const rawEspecies = normalizeEspeciesDraft(value.especies)
  const rawEquipoOperarios = normalizeEquipoOperariosDraft(value.equipo_operarios)

  return {
    draft_id:
      typeof rawDraftId === 'string' && rawDraftId.trim()
        ? rawDraftId.trim()
        : fallbackDraftId,
    subcampania_id:
      rawSubcampaniaId === null || isFiniteNumber(rawSubcampaniaId) ? rawSubcampaniaId : undefined,
    campania_id: rawCampaniaId,
    tipo: rawTipo,
    nombre: typeof rawNombre === 'string' ? rawNombre : '',
    comunidad:
      rawComunidad === null || isRecord(rawComunidad)
        ? (rawComunidad as ComunidadCard | null)
        : null,
    coordinador:
      rawCoordinador === null || isRecord(rawCoordinador)
        ? (rawCoordinador as UsuarioResumen | null)
        : null,
    fecha_estimada_inicio: typeof rawFechaInicio === 'string' ? rawFechaInicio : '',
    fecha_estimada_fin: typeof rawFechaFin === 'string' ? rawFechaFin : '',
    poligono_geojson: rawPoligono,
    area_hectareas: rawAreaHectareas,
    area_hectareas_estimada: rawAreaHectareasEstimada,
    ubicacion_poligono: rawUbicacionPoligono,
    poligono_backend_sincronizado_at:
      rawPoligonoBackendSincronizadoAt === null ||
      typeof rawPoligonoBackendSincronizadoAt === 'string'
        ? rawPoligonoBackendSincronizadoAt
        : undefined,
    meta_total_arboles: rawMetaTotalArboles,
    especies: rawEspecies,
    equipo_operarios: rawEquipoOperarios,
    created_at: typeof rawCreatedAt === 'string' ? rawCreatedAt : now,
    updated_at: typeof rawUpdatedAt === 'string' ? rawUpdatedAt : now,
  }
}

function sortDrafts(drafts: SubcampaniaBaseDraft[]): SubcampaniaBaseDraft[] {
  return [...drafts].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function createSubcampaniaDraftId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadSubcampaniaBaseDrafts(campaniaId: number): SubcampaniaBaseDraft[] {
  const storedDrafts = loadDraft<unknown>(getSubcampaniaBaseDraftsKey(campaniaId))
  const normalizedDrafts = Array.isArray(storedDrafts)
    ? storedDrafts
        .map((draft, index) =>
          normalizeSubcampaniaBaseDraft(draft, campaniaId, `draft-${campaniaId}-${index}`),
        )
        .filter((draft): draft is SubcampaniaBaseDraft => draft !== null)
    : []

  if (normalizedDrafts.length > 0) {
    return sortDrafts(normalizedDrafts)
  }

  const legacyDraft = normalizeSubcampaniaBaseDraft(
    loadDraft<unknown>(getLegacySubcampaniaBaseDraftKey(campaniaId)),
    campaniaId,
    `legacy-${campaniaId}`,
  )

  if (!legacyDraft) return []

  saveDraft(getSubcampaniaBaseDraftsKey(campaniaId), [legacyDraft])
  clearDraft(getLegacySubcampaniaBaseDraftKey(campaniaId))
  return [legacyDraft]
}

export function loadSubcampaniaBaseDraft(
  campaniaId: number,
  draftId: string,
): SubcampaniaBaseDraft | null {
  return loadSubcampaniaBaseDrafts(campaniaId).find((draft) => draft.draft_id === draftId) ?? null
}

export function saveSubcampaniaBaseDraft(draft: SubcampaniaBaseDraft): void {
  const currentDrafts = loadSubcampaniaBaseDrafts(draft.campania_id)
  const existingDraft = currentDrafts.find((current) => current.draft_id === draft.draft_id)
  const now = new Date().toISOString()
  const nextDraft: SubcampaniaBaseDraft = {
    ...(existingDraft ?? {}),
    ...draft,
    created_at: existingDraft?.created_at ?? draft.created_at,
    updated_at: now,
  }
  const nextDrafts = [
    nextDraft,
    ...currentDrafts.filter((current) => current.draft_id !== draft.draft_id),
  ]

  saveDraft<SubcampaniaBaseDraft[]>(
    getSubcampaniaBaseDraftsKey(draft.campania_id),
    sortDrafts(nextDrafts),
  )
}

export function clearSubcampaniaBaseDraft(campaniaId: number, draftId: string): void {
  const currentDrafts = loadSubcampaniaBaseDrafts(campaniaId)
  const remainingDrafts = currentDrafts.filter((draft) => draft.draft_id !== draftId)

  if (remainingDrafts.length === currentDrafts.length) return

  if (remainingDrafts.length === 0) {
    clearDraft(getSubcampaniaBaseDraftsKey(campaniaId))
    return
  }

  saveDraft<SubcampaniaBaseDraft[]>(
    getSubcampaniaBaseDraftsKey(campaniaId),
    sortDrafts(remainingDrafts),
  )
}
