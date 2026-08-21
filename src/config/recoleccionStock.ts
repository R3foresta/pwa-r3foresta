export type RecoleccionStockAvailability = 'DISPONIBLE' | 'BAJO_STOCK' | 'SIN_SALDO'

type StockAmounts = {
  gramos_disponibles: number
  unidades_disponibles: number
}

export const RECOLECCION_STOCK_THRESHOLDS = {
  gramos_disponible: 1_000,
  unidades_disponible: 50,
} as const

export const RECOLECCION_STOCK_LABELS: Record<
  RecoleccionStockAvailability,
  string
> = {
  DISPONIBLE: 'Disponible',
  BAJO_STOCK: 'Bajo stock',
  SIN_SALDO: 'Sin saldo',
}

const decimalFormatter = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const quantityFormatter = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 2,
})

const unitFormatter = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 0,
})

export function resolveStockAvailability(
  item: Pick<StockAmounts, 'gramos_disponibles' | 'unidades_disponibles'>,
): RecoleccionStockAvailability {
  const gramos = Math.max(0, Number(item.gramos_disponibles) || 0)
  const unidades = Math.max(0, Number(item.unidades_disponibles) || 0)

  if (gramos === 0 && unidades === 0) return 'SIN_SALDO'

  if (
    gramos >= RECOLECCION_STOCK_THRESHOLDS.gramos_disponible ||
    unidades >= RECOLECCION_STOCK_THRESHOLDS.unidades_disponible
  ) {
    return 'DISPONIBLE'
  }

  return 'BAJO_STOCK'
}

export function formatStockWeight(grams: number) {
  const safeGrams = Math.max(0, Number(grams) || 0)
  if (safeGrams >= 1_000) {
    return `${decimalFormatter.format(safeGrams / 1_000)} kg`
  }
  return `${quantityFormatter.format(safeGrams)} g`
}

export function formatStockUnits(units: number) {
  return unitFormatter.format(Math.max(0, Number(units) || 0))
}
