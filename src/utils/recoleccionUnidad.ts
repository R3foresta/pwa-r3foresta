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

export function formatUnidadCanonicaDisplay(value: string | null | undefined): string {
  const unidadCanonica = normalizeUnidadCanonica(value)
  if (unidadCanonica === 'UNIDAD') {
    return 'unidades'
  }
  if (unidadCanonica === 'G') {
    return 'gr'
  }
  return '—'
}
