import type { TipoMaterialVivero, UnidadMedidaVivero } from '../types/contracts'
import { formatCantidadVivero } from './format'
import { DECIMALES_GRAMOS_INICIO, DIGITOS_ENTEROS_INICIO } from '../../../config/vivero'
import { todayLocalISO } from '../../../utils/validations/date'

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidYmdDate(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export function isFutureDateYmd(value: string, today = new Date()): boolean {
  const todayYmd = todayLocalISO(today)
  return value > todayYmd
}

function cantidadEnUnidadMinima(texto: string, unidad: UnidadMedidaVivero, truncar: boolean): bigint | null {
  const formato = /^(\d+)(?:\.(\d+))?$/.exec(texto)
  if (!formato) return null
  const [, entero, fraccion = ''] = formato
  const decimales = unidad === 'G' ? DECIMALES_GRAMOS_INICIO : 0
  if (!truncar && fraccion.length > decimales) return null
  return BigInt(entero + fraccion.slice(0, decimales).padEnd(decimales, '0'))
}

export function saldoEnUnidadMinima(texto: string, unidad: UnidadMedidaVivero): bigint | null {
  return cantidadEnUnidadMinima(texto, unidad, true)
}

export function cantidadMaximaInicio(unidad: UnidadMedidaVivero): bigint {
  const decimales = unidad === 'G' ? DECIMALES_GRAMOS_INICIO : 0
  return 10n ** BigInt(DIGITOS_ENTEROS_INICIO + decimales) - 1n
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
  cantidad: bigint | null
  message?: string
}

export function validateCantidadInicial(options: {
  cantidad: string
  unidad: UnidadMedidaVivero
  recoleccionTipoMaterial: TipoMaterialVivero
  maxCantidad: bigint | null
}): CantidadValidationResult {
  const { unidad, recoleccionTipoMaterial, maxCantidad } = options
  const cantidad = cantidadEnUnidadMinima(options.cantidad, unidad, false)
  if (cantidad === null) {
    return {
      isValid: false,
      cantidad,
      message: unidad === 'G'
        ? `Ingresa una cantidad en G con hasta ${DECIMALES_GRAMOS_INICIO} decimales.`
        : 'Ingresa una cantidad entera para UNIDAD.',
    }
  }

  if (cantidad === 0n) {
    return { isValid: false, cantidad, message: 'La cantidad inicial debe ser mayor a 0.' }
  }

  if (cantidad > cantidadMaximaInicio(unidad)) {
    return {
      isValid: false,
      cantidad,
      message: `La cantidad inicial admite hasta ${DIGITOS_ENTEROS_INICIO} dígitos enteros.`,
    }
  }

  if (!isUnidadCompatibleWithRecoleccion(unidad, recoleccionTipoMaterial)) {
    return { isValid: false, cantidad, message: 'Las recolecciones de ESQUEJE solo permiten unidad UNIDAD.' }
  }

  if (maxCantidad === null) {
    return { isValid: false, cantidad, message: 'No se pudo comprobar el saldo disponible.' }
  }

  if (cantidad > maxCantidad) {
    return {
      isValid: false,
      cantidad,
      message: `La cantidad no puede superar el saldo disponible (${formatCantidadVivero(maxCantidad, unidad)} ${unidad}).`,
    }
  }

  return { isValid: true, cantidad }
}
