import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

type Read<T> = { key: string } & ({ data: T; error?: never } | { data?: never; error: string })
export function useViveroDetail(lotId: string, isInvalidId: boolean) {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const token = localStorage.getItem('authToken')
  const [detailRead, setDetailRead] = useState<Read<ViveroLotDetailView> | null>(null)
  const [eventsRead, setEventsRead] = useState<Read<ViveroLotEventView[]> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [eventsAttempt, setEventsAttempt] = useState(0)
  const scopeKey = JSON.stringify([lotId, user?.id, token, m2.status, m2.data])
  const detailKey = JSON.stringify([scopeKey, attempt])
  const eventsKey = JSON.stringify([detailKey, eventsAttempt])

  useEffect(() => {
    if (isInvalidId || !token) return
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    LotesViveroService.getDetail(lotId, { token, signal: controller.signal }).then(
      data => { if (current()) setDetailRead({ key: detailKey, data }) },
      error => { if (current()) setDetailRead({ key: detailKey, error: error instanceof Error ? error.message : 'No se pudo cargar el lote.' }) },
    )
    return () => controller.abort()
  }, [lotId, isInvalidId, token, detailKey])

  useEffect(() => {
    if (isInvalidId || !token) return
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    LotesViveroService.getEvents(lotId, { token, signal: controller.signal }).then(
      data => { if (current()) setEventsRead({ key: eventsKey, data }) },
      error => { if (current()) setEventsRead({ key: eventsKey, error: error instanceof Error ? error.message : 'No se pudo cargar el historial.' }) },
    )
    return () => controller.abort()
  }, [lotId, isInvalidId, token, eventsKey])

  const detail = detailRead?.key === detailKey ? detailRead : null
  const history = eventsRead?.key === eventsKey ? eventsRead : null
  const invalidError = isInvalidId ? 'ID de lote inválido.' : !token ? 'Inicia sesión para consultar Vivero.' : null
  return {
    scopeKey,
    detail: detail?.data ?? null,
    events: history?.data ?? [],
    loading: !invalidError && detail === null,
    error: invalidError ?? detail?.error ?? null,
    eventsLoading: !invalidError && history === null,
    eventsError: history?.error ?? null,
    eventsReady: Boolean(history?.data),
    refetch: () => setAttempt(value => value + 1),
    refetchEvents: () => setEventsAttempt(value => value + 1),
  }
}
