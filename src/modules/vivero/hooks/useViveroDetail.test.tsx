import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { m2Fixture } from '../../accesos/test-fixtures'
import { useViveroDetail } from './useViveroDetail'
import { useViveroLots } from './useViveroLots'
import { mapLoteToDetailView, mapTimelineEventToView } from '../mappers/lote.mapper'
import { BIG_A, BIG_B, eventoFixture, loteFixture } from '../t5.test-fixtures'

const session = vi.hoisted(() => ({ actor: '7', revision: '1' }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: session.actor } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ revision_acceso: session.revision }).data } }) }))
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(accept => { resolve = accept })
  return { promise, resolve }
}
beforeEach(() => { localStorage.setItem('authToken', 'synthetic-a'); session.actor = '7'; session.revision = '1' })

describe('lecturas independientes y descarte por contexto', () => {
  it('publica la ficha sin esperar al historial y diferencia error de vacío', async () => {
    const events = deferred<Awaited<ReturnType<typeof LotesViveroService.getEventHistory>>>()
    vi.spyOn(LotesViveroService, 'getDetail').mockResolvedValue(mapLoteToDetailView(loteFixture()))
    vi.spyOn(LotesViveroService, 'getEventHistory').mockReturnValue(events.promise)
    const { result } = renderHook(() => useViveroDetail(BIG_A, false))
    await waitFor(() => expect(result.current.detail?.id).toBe(BIG_A))
    expect(result.current.loading).toBe(false)
    expect(result.current.eventsLoading).toBe(true)
    await act(async () => events.resolve({ events: [], complete: true }))
    expect(result.current.eventsReady).toBe(true)
    expect(result.current.eventsError).toBeNull()
    vi.mocked(LotesViveroService.getEventHistory).mockRejectedValueOnce(new Error('Historial fallido'))
    act(() => result.current.refetchEvents())
    await waitFor(() => expect(result.current.eventsError).toBe('Historial fallido'))
    expect(result.current.detail?.id).toBe(BIG_A)
    expect(result.current.eventsReady).toBe(false)
  })
  it.each(['lote', 'cuenta', 'token', 'permiso'] as const)('descarta respuestas y fotos anteriores al cambiar %s', async change => {
    const oldDetail = deferred<ReturnType<typeof mapLoteToDetailView>>()
    const oldEvents = deferred<Awaited<ReturnType<typeof LotesViveroService.getEventHistory>>>()
    vi.spyOn(LotesViveroService, 'getDetail').mockReturnValueOnce(oldDetail.promise).mockResolvedValue(mapLoteToDetailView(loteFixture({ id: BIG_B, codigo_trazabilidad: 'NUEVO' })))
    vi.spyOn(LotesViveroService, 'getEventHistory').mockReturnValueOnce(oldEvents.promise).mockResolvedValue({ events: [], complete: false })
    const { result, rerender } = renderHook(({ id }) => useViveroDetail(id, false), { initialProps: { id: BIG_A } })
    if (change === 'cuenta') session.actor = '8'
    if (change === 'token') localStorage.setItem('authToken', 'synthetic-b')
    if (change === 'permiso') session.revision = '2'
    rerender({ id: change === 'lote' ? BIG_B : BIG_A })
    expect(result.current.detail).toBeNull()
    expect(result.current.events).toEqual([])
    await waitFor(() => expect(result.current.detail?.codigo).toBe('NUEVO'))
    await act(async () => { oldDetail.resolve(mapLoteToDetailView(loteFixture())); oldEvents.resolve({ events: [mapTimelineEventToView(eventoFixture())], complete: true }) })
    expect(result.current.detail?.codigo).toBe('NUEVO')
    expect(result.current.events).toEqual([])
  })
  it('descarta una página anterior al cambiar cuenta/token, incluso si la petición ignora cancelación', async () => {
    const oldPage = deferred<Awaited<ReturnType<typeof LotesViveroService.listForUi>>>()
    vi.spyOn(LotesViveroService, 'listForUi').mockReturnValueOnce(oldPage.promise).mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } })
    const { result, rerender } = renderHook(() => useViveroLots({ stageFilter: 'TODOS', page: 1, limit: 20 }))
    session.actor = '8'
    localStorage.setItem('authToken', 'synthetic-b')
    rerender()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => oldPage.resolve({ items: [{ id: BIG_A } as never], pagination: {} as never }))
    expect(result.current.lots).toEqual([])
  })
})
