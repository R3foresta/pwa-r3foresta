import type { ViveroLotCardData, ViveroLotDetailView } from '../types/view-models'

export type DispatchFlowStatus =
  | 'LOTE_EN_VIVERO'
  | 'LISTO_PARA_DESPACHO'
  | 'ASIGNADO_A_DESTINO'

type FlowSource = Pick<
  ViveroLotDetailView | ViveroLotCardData,
  | 'estadoLote'
  | 'plantasVivasIniciales'
  | 'saldoAsignadoTotal'
  | 'saldoVivoDisponibleAsignacion'
  | 'cantidadAsignacionesActivas'
> & {
  saldoVivoActual?: number | null
  cantidadActual?: number | null
}

export const DISPATCH_FLOW_LABEL: Record<DispatchFlowStatus, string> = {
  LOTE_EN_VIVERO: 'Lote en vivero',
  LISTO_PARA_DESPACHO: 'Listo para despacho',
  ASIGNADO_A_DESTINO: 'Asignado a destino',
}

export const DISPATCH_FLOW_DESCRIPTION: Record<DispatchFlowStatus, string> = {
  LOTE_EN_VIVERO: 'El lote sigue en proceso operativo dentro del vivero.',
  LISTO_PARA_DESPACHO: 'Hay plantas vivas libres que pueden ofrecerse a asignacion.',
  ASIGNADO_A_DESTINO: 'Asignacion ya decidio a que subcampania o lugar iran estas plantas.',
}

export function getDispatchFlowStatus(lot: FlowSource): DispatchFlowStatus {
  const activeAssignments = lot.cantidadAsignacionesActivas ?? 0
  const reserved = lot.saldoAsignadoTotal ?? 0
  if (activeAssignments > 0 || reserved > 0) return 'ASIGNADO_A_DESTINO'

  const currentAlive = lot.saldoVivoActual ?? lot.cantidadActual ?? 0
  const freeStock = lot.saldoVivoDisponibleAsignacion ?? currentAlive
  const hasLiveStock = lot.plantasVivasIniciales !== null && currentAlive > 0 && freeStock > 0

  if (lot.estadoLote === 'ACTIVO' && hasLiveStock) return 'LISTO_PARA_DESPACHO'

  return 'LOTE_EN_VIVERO'
}
