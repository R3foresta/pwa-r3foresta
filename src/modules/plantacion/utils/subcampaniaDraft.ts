import { loadDraft, saveDraft } from '../../../utils/formDraft'
import type { ComunidadCard } from '../../../tipos/comunidades'
import type { UsuarioResumen } from '../../../types/users'
import type { Campania } from '../types/contracts'

export type SubcampaniaBaseDraft = {
  campania_id: number
  tipo: Campania['tipo']
  nombre: string
  comunidad: ComunidadCard | null
  coordinador: UsuarioResumen | null
  fecha_estimada_inicio: string
  fecha_estimada_fin: string
}

export function getSubcampaniaBaseDraftKey(campaniaId: number): string {
  return `r3foresta:subcampania-wizard:${campaniaId}:base`
}

export function loadSubcampaniaBaseDraft(campaniaId: number): SubcampaniaBaseDraft | null {
  return loadDraft<SubcampaniaBaseDraft>(getSubcampaniaBaseDraftKey(campaniaId))
}

export function saveSubcampaniaBaseDraft(draft: SubcampaniaBaseDraft): void {
  saveDraft<SubcampaniaBaseDraft>(getSubcampaniaBaseDraftKey(draft.campania_id), draft)
}
