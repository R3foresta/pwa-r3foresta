export type TipoMaterialCanonico = 'SEMILLA' | 'ESQUEJE'

export type CantidadErrorKey = 'empty' | 'non_positive' | 'decimal_not_allowed'

export function validateCantidad(
  rawValue: string | number | null | undefined,
  tipoMaterial: TipoMaterialCanonico,
): { isValid: boolean; parsed: number; errorKey?: CantidadErrorKey } {
  const parsed = Number(rawValue)

  if (!Number.isFinite(parsed)) {
    return { isValid: false, parsed: 0, errorKey: 'empty' }
  }

  if (parsed <= 0) {
    return { isValid: false, parsed, errorKey: 'non_positive' }
  }

  if (tipoMaterial === 'ESQUEJE' && !Number.isInteger(parsed)) {
    return { isValid: false, parsed, errorKey: 'decimal_not_allowed' }
  }

  return { isValid: true, parsed }
}
