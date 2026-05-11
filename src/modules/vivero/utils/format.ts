import type { UnidadMedidaVivero } from '../types/contracts'

export function formatCantidadVivero(value: number, unidad: UnidadMedidaVivero): string {
  if (unidad === 'UNIDAD') return String(Math.trunc(value))
  return String(Number(value.toFixed(1)))
}
