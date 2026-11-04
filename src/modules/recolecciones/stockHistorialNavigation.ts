export type StockHistorialReturn = { plantaId: number; page: number }

export function readStockHistorialReturn(state: unknown): StockHistorialReturn | null {
  if (!state || typeof state !== 'object' || !('stockHistorialReturn' in state)) return null
  const value = state.stockHistorialReturn
  if (!value || typeof value !== 'object' || !('plantaId' in value) || !('page' in value)) return null
  if (typeof value.plantaId !== 'number' || !Number.isSafeInteger(value.plantaId) || value.plantaId <= 0 || typeof value.page !== 'number' || !Number.isSafeInteger(value.page) || value.page <= 0) return null
  return { plantaId: value.plantaId, page: value.page }
}

export function stockHistorialPath(value: StockHistorialReturn) {
  return `/app/collections/stock/${value.plantaId}?page=${value.page}`
}
