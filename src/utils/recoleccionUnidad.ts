export type UnidadCanonicaRecoleccion = 'G' | 'UNIDAD'
export type UnidadFormularioRecoleccion = 'kg' | 'g' | 'units'

function roundCanonica(value: number) {
  return Number(value.toFixed(6))
}

export function mapToCantidadYUnidadCanonica(
  cantidad: number,
  unidadFormulario: UnidadFormularioRecoleccion,
): { cantidad_inicial_canonica: number; unidad_canonica: UnidadCanonicaRecoleccion } {
  if (unidadFormulario === 'units') {
    return {
      cantidad_inicial_canonica: roundCanonica(cantidad),
      unidad_canonica: 'UNIDAD',
    }
  }

  if (unidadFormulario === 'kg') {
    return {
      cantidad_inicial_canonica: roundCanonica(cantidad * 1000),
      unidad_canonica: 'G',
    }
  }

  return {
    cantidad_inicial_canonica: roundCanonica(cantidad),
    unidad_canonica: 'G',
  }
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
 * - 'G' → 'gr'
 * - 'UNIDAD' → 'Unidad' when count === 1, otherwise 'Unidades' (default plural)
 */
export function formatUnidadCanonicaDisplay(
  value: string | null | undefined,
  count?: number,
): string {
  const unidadCanonica = normalizeUnidadCanonica(value)
  if (unidadCanonica === 'UNIDAD') {
    return count === 1 ? 'Unidad' : 'Unidad(es)'
  }
  if (unidadCanonica === 'G') {
    return 'gr'
  }
  return '—'
}
