import type { PlanEspecieForm, PlanMetaEspeciesValue } from './planMetaEspeciesForm'

function draftKey(subcampaniaId: number, authId?: string): string | null {
  if (!Number.isSafeInteger(subcampaniaId) || subcampaniaId <= 0 || !authId?.trim()) return null
  return `r3foresta:plan-editor:${subcampaniaId}:${encodeURIComponent(authId)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFormSpecies(value: unknown): value is PlanEspecieForm {
  return isRecord(value) && typeof value.planta_id === 'number' && Number.isSafeInteger(value.planta_id) && value.planta_id > 0 &&
    typeof value.especie === 'string' && typeof value.nombre_cientifico === 'string' &&
    typeof value.cantidad === 'string' && typeof value.porcentaje === 'string' &&
    (value.nombre_comun_principal === undefined || value.nombre_comun_principal === null || typeof value.nombre_comun_principal === 'string') &&
    (value.saldo_disponible === undefined || typeof value.saldo_disponible === 'number' && Number.isFinite(value.saldo_disponible))
}

function isFormValue(value: unknown): value is PlanMetaEspeciesValue {
  return isRecord(value) && typeof value.meta === 'string' && Array.isArray(value.especies) && value.especies.every(isFormSpecies)
}

/** Conserva únicamente la propuesta de UI en esta pestaña; nunca JWT ni versión. */
export function savePlanEditorDraft(subcampaniaId: number, authId: string | undefined, value: PlanMetaEspeciesValue): boolean {
  const key = draftKey(subcampaniaId, authId)
  if (!key || !isFormValue(value)) return false
  try {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, subcampaniaId, authId, value }))
    return true
  } catch {
    return false
  }
}

/** Valida estructura, sin corregir texto ni validar como plan persistible. */
export function loadPlanEditorDraft(subcampaniaId: number, authId?: string): PlanMetaEspeciesValue | null {
  const key = draftKey(subcampaniaId, authId)
  if (!key) return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.v !== 1 || parsed.subcampaniaId !== subcampaniaId || parsed.authId !== authId || !isFormValue(parsed.value)) {
      clearPlanEditorDraft(subcampaniaId, authId)
      return null
    }
    return parsed.value
  } catch {
    clearPlanEditorDraft(subcampaniaId, authId)
    return null
  }
}

export function clearPlanEditorDraft(subcampaniaId: number, authId?: string): void {
  const key = draftKey(subcampaniaId, authId)
  if (!key) return
  try {
    sessionStorage.removeItem(key)
  } catch {
    // El editor sigue funcionando aunque el almacenamiento no esté disponible.
  }
}
