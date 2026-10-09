export type UnidadCanonicaRecoleccion = 'G' | 'UNIDAD'
export type UnidadFormularioRecoleccion = 'kg' | 'g' | 'units'

/** Valida la precisión decimal antes de convertir a Number, sin redondear el dato observado. */
export function mapToCantidadYUnidadCanonica(
  cantidad: string | number,
  unidadFormulario: UnidadFormularioRecoleccion,
): { cantidad_inicial_canonica: number; unidad_canonica: UnidadCanonicaRecoleccion } {
  const raw = String(cantidad).trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(raw)) {
    throw new Error('Ingresa una cantidad numérica válida.')
  }
  const [entero, fraccion = ''] = raw.split('.')
  const valor = BigInt(entero + fraccion)
  const escala = 10n ** BigInt(fraccion.length)
  if (valor <= 0n) {
    throw new Error('La cantidad debe ser mayor a 0.')
  }

  if (unidadFormulario === 'units') {
    if (valor % escala !== 0n) {
      throw new Error('Para UNIDAD la cantidad debe ser entera.')
    }
    const cantidadEntera = Number(valor / escala)
    if (!Number.isSafeInteger(cantidadEntera)) throw new Error('La cantidad supera el rango permitido.')
    return { cantidad_inicial_canonica: cantidadEntera, unidad_canonica: 'UNIDAD' }
  }

  // Décimas de gramo: kg × 10 000, G × 10.
  const factor = unidadFormulario === 'kg' ? 10000n : 10n
  const decimasNumerador = valor * factor
  if (decimasNumerador % escala !== 0n) {
    throw new Error('La cantidad en G debe tener como máximo un decimal después de convertir.')
  }
  const decimas = Number(decimasNumerador / escala)
  if (!Number.isSafeInteger(decimas)) throw new Error('La cantidad supera el rango permitido.')
  return { cantidad_inicial_canonica: decimas / 10, unidad_canonica: 'G' }
}

export function normalizeUnidadCanonica(
  value: string | null | undefined,
): UnidadCanonicaRecoleccion | null {
  if (!value) return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'G' || normalized === 'UNIDAD') {
    return normalized
  }
  return null
}

/**
 * Display label for a canonical unit returned by the backend ('G' | 'UNIDAD').
 * - 'G' → 'G'
 * - 'UNIDAD' → 'Unidad' when count === 1, otherwise 'Unidades' (default plural)
 */
export function formatUnidadCanonicaDisplay(
  value: string | null | undefined,
  count?: number,
): string {
  const unidadCanonica = normalizeUnidadCanonica(value)
  if (unidadCanonica === 'UNIDAD') {
    return count === 1 ? 'Unidad' : 'Unidades'
  }
  if (unidadCanonica === 'G') {
    return 'G'
  }
  return '—'
}
