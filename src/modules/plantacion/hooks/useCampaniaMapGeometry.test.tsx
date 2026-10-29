import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import type { GeoJsonPolygon, Subcampania } from '../types/contracts'
import { useCampaniaMapGeometry } from './useCampaniaMapGeometry'

vi.mock('../../../services/plantacion.service', () => ({ PlantacionService: { getSubcampania: vi.fn() } }))
const read = vi.mocked(PlantacionService.getSubcampania)
const polygon: GeoJsonPolygon = {
  type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]]],
}
const anotherPolygon: GeoJsonPolygon = {
  type: 'Polygon', coordinates: [[[-67.2, -15.6], [-67.1, -15.6], [-67.1, -15.5], [-67.2, -15.6]]],
}
function sub(id: number, poligono?: GeoJsonPolygon | null, campaniaId = 20): Subcampania {
  return { id, campania_id: campaniaId, nombre: `Zona ${id}`, zona_id: 1, estado: 'BORRADOR',
    meta_total_arboles: 100, created_at: '2026-10-28', poligono }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(complete => { resolve = complete })
  return { promise, resolve }
}

beforeEach(() => { read.mockReset() })

describe('Geometría interna de campaña', () => {
  it('consulta sólo los polígonos omitidos y distingue un null confirmado de un fallo', async () => {
    read.mockImplementation(async id => sub(id, id === 52 ? polygon : null))
    const scopes = [sub(51, anotherPolygon), sub(52), sub(53, null)]
    const { result, rerender } = renderHook(({ current }) => useCampaniaMapGeometry(current, 'auth-1'), {
      initialProps: { current: scopes },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(read.mock.calls).toEqual([[52, 'auth-1'], [53, 'auth-1']])
    expect([...result.current.polygons]).toEqual([['52', polygon]])
    expect(result.current.errors).toBe(0)
    rerender({ current: [...scopes].reverse() })
    expect(result.current.loading).toBe(false)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('limita la cola a cuatro lecturas simultáneas y completa todos los detalles', async () => {
    const scopes = Array.from({ length: 9 }, (_, index) => sub(index + 1))
    const pending = new Map(scopes.map(scope => [scope.id, deferred<Subcampania>()]))
    let active = 0
    let peak = 0
    read.mockImplementation(id => {
      active += 1
      peak = Math.max(peak, active)
      return pending.get(id)!.promise.finally(() => { active -= 1 })
    })
    const { result } = renderHook(() => useCampaniaMapGeometry(scopes, 'auth-1'))
    expect(read).toHaveBeenCalledTimes(4)
    await act(async () => {
      for (let id = 1; id <= 4; id += 1) pending.get(id)!.resolve(sub(id, polygon))
    })
    await waitFor(() => expect(read).toHaveBeenCalledTimes(8))
    expect(result.current.polygons.size).toBe(4)
    expect(result.current.loading).toBe(true)
    await act(async () => {
      for (let id = 5; id <= 8; id += 1) pending.get(id)!.resolve(sub(id, polygon))
    })
    await waitFor(() => expect(read).toHaveBeenCalledTimes(9))
    await act(async () => { pending.get(9)!.resolve(sub(9, polygon)) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.polygons.size).toBe(9)
    expect(peak).toBe(4)
    expect(result.current.errors).toBe(0)
  })

  it('conserva éxitos y null confirmados al reintentar únicamente los errores parciales', async () => {
    let failed = false
    read.mockImplementation(async id => {
      if (id === 52 && !failed) { failed = true; throw new Error('Error temporal') }
      return sub(id, id === 53 ? null : polygon)
    })
    const scopes = [sub(51), sub(52), sub(53)]
    const { result } = renderHook(() => useCampaniaMapGeometry(scopes, 'auth-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.errors).toBe(1)
    expect([...result.current.polygons.keys()]).toEqual(['51'])
    act(() => result.current.retry())
    expect(result.current.polygons.get('51')).toEqual(polygon)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.errors).toBe(0)
    expect([...result.current.polygons.keys()]).toEqual(['51', '52'])
    expect(read.mock.calls.map(([id]) => id)).toEqual([51, 52, 53, 52])
  })

  it('rechaza detalles de otra identidad o campaña sin ocultar el polígono correcto', async () => {
    read.mockImplementation(async id => id === 51 ? sub(99, polygon) : id === 52 ? sub(52, polygon, 21) : sub(id, polygon))
    const scopes = [sub(51), sub(52), sub(53)]
    const { result } = renderHook(() => useCampaniaMapGeometry(scopes))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.errors).toBe(2)
    expect([...result.current.polygons]).toEqual([['53', polygon]])
  })

  it('retira datos al cambiar cuenta o lista e ignora respuestas anteriores incluso al volver al mismo ámbito', async () => {
    const first = deferred<Subcampania>()
    const next = deferred<Subcampania>()
    read.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise)
      .mockResolvedValueOnce(sub(52, polygon)).mockResolvedValueOnce(sub(51, anotherPolygon))
    const { result, rerender } = renderHook(({ scopes, authId }) => useCampaniaMapGeometry(scopes, authId), {
      initialProps: { scopes: [sub(51)], authId: 'auth-1' },
    })
    rerender({ scopes: [sub(51)], authId: 'auth-2' })
    expect(result.current.polygons.size).toBe(0)
    expect(result.current.loading).toBe(true)
    await act(async () => { next.resolve(sub(51, anotherPolygon)); await next.promise })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.polygons.get('51')).toEqual(anotherPolygon)
    await act(async () => { first.resolve(sub(51, polygon)); await first.promise })
    expect(result.current.polygons.get('51')).toEqual(anotherPolygon)
    rerender({ scopes: [sub(52)], authId: 'auth-2' })
    expect(result.current.polygons.size).toBe(0)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect([...result.current.polygons.keys()]).toEqual(['52'])
    rerender({ scopes: [sub(51)], authId: 'auth-2' })
    expect(result.current.polygons.size).toBe(0)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.polygons.get('51')).toEqual(anotherPolygon)
    expect(read.mock.calls).toEqual([[51, 'auth-1'], [51, 'auth-2'], [52, 'auth-2'], [51, 'auth-2']])
  })

  it.each(['disabled', 'unmounted'])('detiene la cola y descarta las respuestas al quedar %s', async action => {
    const scopes = Array.from({ length: 8 }, (_, index) => sub(index + 1))
    const pending = new Map(scopes.map(scope => [scope.id, deferred<Subcampania>()]))
    read.mockImplementation(id => pending.get(id)!.promise)
    const { result, rerender, unmount } = renderHook(({ enabled }) => useCampaniaMapGeometry(scopes, 'auth-1', enabled), {
      initialProps: { enabled: true },
    })
    expect(read).toHaveBeenCalledTimes(4)
    if (action === 'disabled') {
      rerender({ enabled: false })
      expect(result.current.loading).toBe(false)
      expect(result.current.polygons.size).toBe(0)
    } else unmount()
    await act(async () => {
      for (let id = 1; id <= 4; id += 1) pending.get(id)!.resolve(sub(id, polygon))
    })
    expect(read).toHaveBeenCalledTimes(4)
    if (action === 'disabled') expect(result.current.polygons.size).toBe(0)
  })
})
