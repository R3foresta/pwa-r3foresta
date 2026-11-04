import { useEffect, useState } from 'react'
import { getStockDisponibilidad, getStockHistorial, type StockDisponibilidad, type StockHistorialResult } from '../stockHistorial.service'

export type LoadState<T> =
  | { key: string; status: 'loading' }
  | { key: string; status: 'error'; error: unknown }
  | { key: string; status: 'success'; value: T }

export function useStockHistorial(plantaId: number, page: number, actorId: string, token: string) {
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [stockAttempt, setStockAttempt] = useState(0)
  const [history, setHistory] = useState<LoadState<StockHistorialResult> | null>(null)
  const [stock, setStock] = useState<LoadState<StockDisponibilidad | null> | null>(null)
  const historyKey = JSON.stringify([plantaId, page, actorId, token, historyAttempt])
  const stockKey = JSON.stringify([plantaId, actorId, token, stockAttempt])

  useEffect(() => {
    const controller = new AbortController()
    const isCurrent = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    getStockHistorial(plantaId, page, token, controller.signal).then(
      value => { if (isCurrent()) setHistory({ key: historyKey, status: 'success', value }) },
      error => { if (isCurrent()) setHistory({ key: historyKey, status: 'error', error }) },
    )
    return () => controller.abort()
  }, [historyKey, plantaId, page, token])

  useEffect(() => {
    const controller = new AbortController()
    const isCurrent = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    getStockDisponibilidad(plantaId, token, controller.signal).then(
      value => { if (isCurrent()) setStock({ key: stockKey, status: 'success', value }) },
      error => { if (isCurrent()) setStock({ key: stockKey, status: 'error', error }) },
    )
    return () => controller.abort()
  }, [stockKey, plantaId, token])

  return {
    history: history?.key === historyKey ? history : { key: historyKey, status: 'loading' } as const,
    stock: stock?.key === stockKey ? stock : { key: stockKey, status: 'loading' } as const,
    retryHistory: () => setHistoryAttempt(value => value + 1),
    retryStock: () => setStockAttempt(value => value + 1),
  }
}
