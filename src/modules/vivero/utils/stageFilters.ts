import type { ListLotesViveroQuery, LoteViveroItem } from '../types/contracts'

export type StageFilter = 'TODOS' | 'INICIO' | 'EMBOLSADO' | 'ADAPTABILIDAD' | 'FINALIZADOS'

export const STAGE_FILTERS: { key: StageFilter; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'INICIO', label: 'Inicio' },
  { key: 'EMBOLSADO', label: 'Embolsado' },
  { key: 'ADAPTABILIDAD', label: 'Adaptabilidad' },
  { key: 'FINALIZADOS', label: 'Finalizados' },
]

export function buildBackendQueryForStageFilter(
  stageFilter: StageFilter,
): Pick<ListLotesViveroQuery, 'estado_lote'> {
  if (stageFilter === 'FINALIZADOS') {
    return { estado_lote: 'FINALIZADO' }
  }

  if (stageFilter === 'TODOS') {
    return {}
  }

  // Inicio/Embolsado/Adaptabilidad pertenecen a lotes activos.
  return { estado_lote: 'ACTIVO' }
}

export function matchesStageFilter(lot: LoteViveroItem, filter: StageFilter): boolean {
  if (filter === 'TODOS') return true
  if (filter === 'FINALIZADOS') return lot.estado_lote === 'FINALIZADO'

  const isActivo = lot.estado_lote === 'ACTIVO'
  if (!isActivo) return false

  if (filter === 'INICIO') {
    return lot.plantas_vivas_iniciales === null && lot.subetapa_actual === null
  }

  if (filter === 'EMBOLSADO') {
    return lot.plantas_vivas_iniciales !== null && lot.subetapa_actual === null
  }

  if (filter === 'ADAPTABILIDAD') {
    return lot.subetapa_actual !== null
  }

  return true
}
