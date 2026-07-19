import type { ViveroLotCardData, ViveroLotDetailView } from '../types/view-models'

export type DispatchFlowStatus =
  | 'LOTE_EN_VIVERO'
  | 'LISTO_PARA_DESPACHO'
  | 'ASIGNADO_A_DESTINO'

type FlowSource = Pick<
  ViveroLotDetailView | ViveroLotCardData,
  | 'estadoLote'
  | 'plantasVivasIniciales'
  | 'saldoAsignadoSubcampanias'
  | 'cantidadAsignacionesActivas'
> & {
  saldoVivoActual?: number | null
  cantidadActual?: number | null
}

export const DISPATCH_FLOW_LABEL: Record<DispatchFlowStatus, string> = {
  LOTE_EN_VIVERO: 'Lote en vivero',
  LISTO_PARA_DESPACHO: 'Disponible para entregar',
  ASIGNADO_A_DESTINO: 'Entregado a subcampanias',
}

export const DISPATCH_FLOW_DESCRIPTION: Record<DispatchFlowStatus, string> = {
  LOTE_EN_VIVERO: 'El lote sigue en proceso operativo dentro del vivero.',
  LISTO_PARA_DESPACHO:
    'Hay plantas vivas en el vivero listas para entregar a una subcampania.',
  ASIGNADO_A_DESTINO:
    'Ya se entregaron plantas de este lote a una o mas subcampanias.',
}

// Modelo fisico: el estado se deriva de lo ya entregado a subcampanias
// (`saldoAsignadoSubcampanias` + asignaciones activas) y del saldo vivo que
// queda en el vivero (que es directamente el disponible para entregar).
export function getDispatchFlowStatus(lot: FlowSource): DispatchFlowStatus {
  const activeAssignments = lot.cantidadAsignacionesActivas ?? 0
  const entregado = lot.saldoAsignadoSubcampanias ?? 0
  if (activeAssignments > 0 || entregado > 0) return 'ASIGNADO_A_DESTINO'

  const currentAlive = lot.saldoVivoActual ?? lot.cantidadActual ?? 0
  const hasLiveStock = lot.plantasVivasIniciales !== null && currentAlive > 0

  if (lot.estadoLote === 'ACTIVO' && hasLiveStock) return 'LISTO_PARA_DESPACHO'

  return 'LOTE_EN_VIVERO'
}
