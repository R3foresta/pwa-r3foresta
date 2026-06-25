import { clearDraft, loadDraft, saveDraft } from '../../../utils/formDraft'
import type { ComunidadCard } from '../../../tipos/comunidades'
import type { UsuarioResumen } from '../../../types/users'
import type { Campania } from '../types/contracts'

export type SubcampaniaBaseDraft = {
  draft_id: string
  campania_id: number
  tipo: Campania['tipo']
  nombre: string
  comunidad: ComunidadCard | null
  coordinador: UsuarioResumen | null
  fecha_estimada_inicio: string
  fecha_estimada_fin: string
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

  return {
    draft_id:
      typeof rawDraftId === 'string' && rawDraftId.trim()
        ? rawDraftId.trim()
        : fallbackDraftId,
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
