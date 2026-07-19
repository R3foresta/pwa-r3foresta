import { useState, useEffect, useCallback, useRef } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

export function useViveroDetail(lotId: number, isInvalidId: boolean) {
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [loading, setLoading] = useState(!isInvalidId)
  const [error, setError] = useState<string | null>(isInvalidId ? 'ID de lote inválido.' : null)

  const mountedRef = useRef(true)
  // Protección contra respuestas obsoletas: si el lote cambia o hay refetch
  // concurrente, descartamos las respuestas cuyo requestId ya no es el vigente.
  const requestIdRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (isInvalidId) return
      const requestId = ++requestIdRef.current
      // `silent`: refresco en segundo plano (p. ej. tras una entrega) sin
      // mostrar el loader de pantalla completa, para no parpadear la vista.
      if (!opts?.silent) setLoading(true)
      setError(null)

      const [detailResult, eventsResult] = await Promise.allSettled([
        LotesViveroService.getDetail(lotId),
        LotesViveroService.getEvents(lotId),
      ])

      if (!mountedRef.current || requestId !== requestIdRef.current) return

      if (detailResult.status === 'rejected') {
        const errorMsg =
          detailResult.reason instanceof Error
            ? detailResult.reason.message
            : 'No se pudo cargar la información del lote. Verifica tu conexión.'
        setError(errorMsg)
        if (!opts?.silent) setLoading(false)
        return
      }

      setDetail(detailResult.value)
      setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value : [])
      if (!opts?.silent) setLoading(false)
    },
    [lotId, isInvalidId],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  const refetch = useCallback(() => {
    void load({ silent: true })
  }, [load])

  return { detail, events, loading, error, refetch }
}
