import type { EntradaRecepcion } from './recepcion.contract'

type UnidadRecepcion = EntradaRecepcion['unidad_recibida']

/** Compara el decimal enviado a SQL, sin tolerancias ni redondeo de lo observado. */
function cantidadExacta(cantidad: number, unidad: UnidadRecepcion): bigint | null {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return null
  const [coeficiente, exponente = '0'] = String(cantidad).split('e')
  const [entero, fraccion = ''] = coeficiente.split('.')
  const valor = BigInt(entero + fraccion)
  // SQL admite seis decimales de G; KG desplaza otros tres. UNIDAD es entero.
  const potencia = Number(exponente) - fraccion.length + (unidad === 'KG' ? 9 : unidad === 'G' ? 6 : 0)
  if (potencia >= 0) return valor * 10n ** BigInt(potencia)
  const divisor = 10n ** BigInt(-potencia)
  return valor % divisor === 0n ? valor / divisor : null
}

export function coincideCantidadRecepcion(cantidad: number, unidad: UnidadRecepcion, declarada: number, unidadDeclarada: 'G' | 'UNIDAD'): boolean {
  if ((unidad === 'KG' ? 'G' : unidad) !== unidadDeclarada) return false
  const observada = cantidadExacta(cantidad, unidad)
  return observada !== null && observada === cantidadExacta(declarada, unidadDeclarada)
}
