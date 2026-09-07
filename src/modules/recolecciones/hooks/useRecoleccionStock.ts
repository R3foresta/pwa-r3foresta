import { useCallback, useEffect, useState } from 'react'
import {
  RecoleccionesService,
  type RecoleccionStockItem,
} from '../../../services/recolecciones.service'

export function useRecoleccionStock(enabled = true) {
  const [items, setItems] = useState<RecoleccionStockItem[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)
      const response = await RecoleccionesService.getStockSummary()
      setItems(response.data)
    } catch (loadError) {
      setItems([])
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el stock de semillas.',
      )
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      void refresh()
      return
    }

    setItems([])
    setError(null)
    setLoading(false)
  }, [enabled, refresh])

  return { items, loading, error, refresh }
}
