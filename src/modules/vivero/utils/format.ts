import { DECIMALES_GRAMOS_INICIO } from '../../../config/vivero'
import type { UnidadMedidaVivero } from '../types/contracts'

export function formatCantidadVivero(valor: bigint, unidad: UnidadMedidaVivero): string {
  if (unidad === 'UNIDAD') return String(valor)
  const digitos = String(valor).padStart(DECIMALES_GRAMOS_INICIO + 1, '0')
  const entero = digitos.slice(0, -DECIMALES_GRAMOS_INICIO)
  const fraccion = digitos.slice(-DECIMALES_GRAMOS_INICIO).replace(/0+$/, '')
  return fraccion ? `${entero}.${fraccion}` : entero
}
