import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidYmdDate(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === value
}

export function isFutureDateYmd(value: string, today = new Date()): boolean {
  const todayYmd = today.toISOString().slice(0, 10)
  return value > todayYmd
}

export function countDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0
  const text = value.toString()
  if (!text.includes('.')) return 0
  return text.split('.')[1]?.length ?? 0
}

export function hasUpToOneDecimal(value: number): boolean {
  return countDecimals(value) <= 1
}

export function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isIntegerWhenUnidad(unidad: UnidadMedidaVivero, value: number): boolean {
  if (unidad !== 'UNIDAD') return true
  return Number.isInteger(value)
}

export function isUnidadCompatibleWithRecoleccion(
  unidad: UnidadMedidaVivero,
  recoleccionTipoMaterial: TipoMaterialVivero,
): boolean {
  if (recoleccionTipoMaterial === 'ESQUEJE') {
    return unidad === 'UNIDAD'
  }
  return true
}

export type CantidadValidationResult = {
  isValid: boolean
  message?: string
}

export function validateCantidadInicial(options: {
  cantidad: number
  unidad: UnidadMedidaVivero
  recoleccionTipoMaterial: TipoMaterialVivero
  maxCantidad?: number | null
}): CantidadValidationResult {
  const { cantidad, unidad, recoleccionTipoMaterial, maxCantidad } = options

  if (!isPositiveNumber(cantidad)) {
    return {
      isValid: false,
      message: 'La cantidad inicial debe ser mayor a 0.',
    }
  }

  if (unidad === 'G' && !hasUpToOneDecimal(cantidad)) {
    return {
      isValid: false,
      message: 'Cuando la unidad es G, la cantidad admite máximo 1 decimal.',
    }
  }

  if (!isIntegerWhenUnidad(unidad, cantidad)) {
    return {
      isValid: false,
      message: 'Cuando la unidad es UNIDAD, la cantidad debe ser entera.',
    }
  }

  if (!isUnidadCompatibleWithRecoleccion(unidad, recoleccionTipoMaterial)) {
    return {
      isValid: false,
      message: 'Las recolecciones de ESQUEJE solo permiten unidad UNIDAD.',
    }
  }

  if (typeof maxCantidad === 'number' && Number.isFinite(maxCantidad) && cantidad > maxCantidad) {
    return {
      isValid: false,
      message: `La cantidad no puede superar el saldo disponible (${maxCantidad} ${unidad}).`,
    }
  }

  return { isValid: true }
}
