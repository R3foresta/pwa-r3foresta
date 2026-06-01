import { useState, useEffect } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

export function useViveroDetail(lotId: number, isInvalidId: boolean) {
  const [detail, setDetail] = useState<ViveroLotDetailView | null>(null)
  const [events, setEvents] = useState<ViveroLotEventView[]>([])
  const [loading, setLoading] = useState(!isInvalidId)
  const [error, setError] = useState<string | null>(isInvalidId ? 'ID de lote inválido.' : null)

  useEffect(() => {
    if (isInvalidId) return

    let isMounted = true

    const fetchDetailData = async () => {
      setLoading(true)
      setError(null)
      
      const [detailResult, eventsResult] = await Promise.allSettled([
        LotesViveroService.getDetail(lotId),
        LotesViveroService.getEvents(lotId),
      ])

      if (!isMounted) return

      if (detailResult.status === 'rejected') {
        const errorMsg = detailResult.reason instanceof Error 
          ? detailResult.reason.message 
          : 'No se pudo cargar la información del lote. Verifica tu conexión.'
        
        setError(errorMsg)
        setLoading(false)
        return
      }

      setDetail(detailResult.value)
      setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value : [])
      setLoading(false)
    }

    fetchDetailData()

    return () => { isMounted = false }
  }, [lotId, isInvalidId])

  return { detail, events, loading, error }
}