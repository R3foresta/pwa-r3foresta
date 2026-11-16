import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

type DetailRead = { scope: string; key: string; data: ViveroLotDetailView | null; error: string | null }
type EventsRead = { key: string } & ({ data: ViveroLotEventView[]; complete: boolean; error?: never } | { data?: never; error: string })
export function useViveroDetail(lotId: string, isInvalidId: boolean) {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const token = localStorage.getItem('authToken')
  const [detailRead, setDetailRead] = useState<DetailRead | null>(null)
  const [eventsRead, setEventsRead] = useState<EventsRead | null>(null)
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
      data => { if (current()) setDetailRead({ scope: scopeKey, key: detailKey, data, error: null }) },
      error => {
        if (current()) setDetailRead(previous => ({
          scope: scopeKey, key: detailKey,
          // Un reintento dentro del mismo ámbito no desmonta confirmaciones.
          // Los datos anteriores se marcan desactualizados hasta releer saldos.
          data: previous?.scope === scopeKey ? previous.data : null,
          error: error instanceof Error ? error.message : 'No se pudo cargar el lote.',
        }))
      },
    )
    return () => controller.abort()
  }, [lotId, isInvalidId, token, scopeKey, detailKey])

  useEffect(() => {
    if (isInvalidId || !token) return
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    LotesViveroService.getEventHistory(lotId, { token, signal: controller.signal }).then(
      ({ events, complete }) => { if (current()) setEventsRead({ key: eventsKey, data: events, complete }) },
      error => { if (current()) setEventsRead({ key: eventsKey, error: error instanceof Error ? error.message : 'No se pudo cargar el historial.' }) },
    )
    return () => controller.abort()
  }, [lotId, isInvalidId, token, eventsKey])

  const scopedDetail = detailRead?.scope === scopeKey ? detailRead : null
  const currentDetail = scopedDetail?.key === detailKey ? scopedDetail : null
  const detail = scopedDetail?.data ?? null
  const history = eventsRead?.key === eventsKey ? eventsRead : null
  const invalidError = isInvalidId ? 'ID de lote inválido.' : !token ? 'Inicia sesión para consultar Vivero.' : null
  return {
    scopeKey, detail,
    events: history?.data ?? [],
    loading: !invalidError && !detail && !currentDetail,
    error: invalidError ?? (detail ? null : currentDetail?.error ?? null),
    detailRefreshing: !invalidError && !!detail && !currentDetail,
    detailRefreshError: detail ? currentDetail?.error ?? null : null,
    eventsLoading: !invalidError && history === null,
    eventsError: history?.error ?? null,
    historyComplete: history && 'complete' in history ? history.complete : false,
    eventsReady: Boolean(history?.data),
    refetch: () => setAttempt(value => value + 1),
    refetchEvents: () => setEventsAttempt(value => value + 1),
  }
}
