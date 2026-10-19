import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpactoService } from '../api/impacto.api'
import examples from '../api/impacto.test-fixtures.json'
import { validarImpactoConsulta } from '../api/impacto.contract'
import type { ImpactoConsulta, ImpactoQuery } from '../types'
import { useImpactoConsulta } from './useImpactoConsulta'

vi.mock('../api/impacto.api', () => ({ ImpactoService: { consultar: vi.fn() } }))
const request = vi.mocked(ImpactoService.consultar)
const page = (): { data: ImpactoConsulta } => validarImpactoConsulta(structuredClone(examples.global))
function firstPage() {
  const response = page()
  response.data.registros = response.data.registros.slice(0, 2)
  response.data.siguiente_cursor = '826001'
  return response
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => { resolve = complete })
  return { promise, resolve }
}
beforeEach(() => request.mockReset())

describe('consulta pública paginada y respuestas obsoletas', () => {
  it('anexa registros por identidad sin multiplicar indicadores ni puntos de cada página', async () => {
    const second = page()
    // La deduplicación de UI también resiste un registro ya presente.
    second.data.registros = [second.data.registros[0], ...second.data.registros.slice(2)]
    request.mockResolvedValueOnce(firstPage()).mockResolvedValueOnce(second)
    const { result } = renderHook(() => useImpactoConsulta({ tipo: 'global' }, {}))
    await waitFor(() => expect(result.current.data?.registros).toHaveLength(2))
    await act(() => result.current.loadMore())
    expect(result.current.data?.registros.map((record) => record.id)).toEqual(['827000', '826001', '826000', '820000'])
    expect(result.current.data?.indicadores).toEqual({ plantacion_inicial: 50, reposiciones: 4, bajas_reportadas: 11, registros: 4 })
    expect(result.current.data?.mapa).toHaveLength(4)
    expect(result.current.scopeChanged).toBe(false)
    expect(request).toHaveBeenLastCalledWith({ tipo: 'global' }, { cursor: '826001' }, expect.any(AbortSignal))
  })

  it('solo envía una carga aunque se active dos veces antes de renderizar', async () => {
    const pending = deferred<{ data: ImpactoConsulta }>()
    request.mockResolvedValueOnce(firstPage()).mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useImpactoConsulta({ tipo: 'global' }, {}))
    await waitFor(() => expect(result.current.data).toBeTruthy())
    let first!: Promise<void>
    await act(async () => {
      first = result.current.loadMore()
      await result.current.loadMore()
    })
    expect(request).toHaveBeenCalledTimes(2)
    expect(result.current.loadingMore).toBe(true)
    await act(async () => { pending.resolve(page()); await first })
    expect(result.current.loadingMore).toBe(false)
  })

  it('conserva página e indicadores confirmados ante fallo recuperable de la siguiente', async () => {
    request.mockResolvedValueOnce(firstPage()).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(page())
    const { result } = renderHook(() => useImpactoConsulta({ tipo: 'global' }, {}))
    await waitFor(() => expect(result.current.data).toBeTruthy())
    await act(() => result.current.loadMore())
    expect(result.current.data?.registros).toHaveLength(2)
    expect(result.current.data?.indicadores.plantacion_inicial).toBe(50)
    expect(result.current.error).toBeNull()
    expect(result.current.pageError).toEqual(new Error('Sin conexión'))
    await act(() => result.current.loadMore())
    expect(result.current.pageError).toBeNull()
    expect(result.current.data?.siguiente_cursor).toBeNull()
    expect(request.mock.calls[1][1]).toEqual(request.mock.calls[2][1])
  })

  it('cancela filtros anteriores e ignora incluso una respuesta que no respeta AbortSignal', async () => {
    const pending = deferred<{ data: ImpactoConsulta }>()
    const next = validarImpactoConsulta(examples.subcampania, { tipo: 'subcampania', id: '826' })
    request.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(next)
    const { result, rerender } = renderHook(({ query }: { query: ImpactoQuery }) => useImpactoConsulta({ tipo: 'global' }, query), { initialProps: { query: {} } })
    const signal = request.mock.calls[0][2]!
    rerender({ query: { planta_id: '8' } })
    expect(signal.aborted).toBe(true)
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data?.indicadores.plantacion_inicial).toBe(25))
    await act(async () => { pending.resolve(page()); await pending.promise })
    expect(result.current.data?.indicadores.plantacion_inicial).toBe(25)
    expect(request).toHaveBeenLastCalledWith({ tipo: 'global' }, { planta_id: '8' }, expect.any(AbortSignal))
  })

  it('descarta una página pendiente al cambiar los filtros', async () => {
    const pending = deferred<{ data: ImpactoConsulta }>()
    const next = validarImpactoConsulta(examples.subcampania, { tipo: 'subcampania', id: '826' })
    request.mockResolvedValueOnce(firstPage()).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(next)
    const { result, rerender } = renderHook(({ query }: { query: ImpactoQuery }) => useImpactoConsulta({ tipo: 'global' }, query), { initialProps: { query: {} } })
    await waitFor(() => expect(result.current.data).toBeTruthy())
    let load!: Promise<void>
    act(() => { load = result.current.loadMore() })
    const pageSignal = request.mock.calls[1][2]!
    rerender({ query: { subcampania_id: '826' } })
    expect(pageSignal.aborted).toBe(true)
    await waitFor(() => expect(result.current.data?.indicadores.plantacion_inicial).toBe(25))
    await act(async () => { pending.resolve(page()); await load })
    expect(result.current.data?.registros.map((record) => record.id)).toEqual(['826001', '826000'])
    expect(result.current.pageError).toBeNull()
    expect(result.current.loadingMore).toBe(false)
  })

  it('volver al mismo filtro anterior requiere una consulta nueva sin restaurar totales viejos', async () => {
    const other = deferred<{ data: ImpactoConsulta }>(), repeated = deferred<{ data: ImpactoConsulta }>()
    request.mockResolvedValueOnce(page()).mockReturnValueOnce(other.promise).mockReturnValueOnce(repeated.promise)
    const { result, rerender } = renderHook(({ query }: { query: ImpactoQuery }) => useImpactoConsulta({ tipo: 'global' }, query), { initialProps: { query: {} } })
    await waitFor(() => expect(result.current.data?.indicadores.plantacion_inicial).toBe(50))
    rerender({ query: { planta_id: '8' } })
    rerender({ query: {} })
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)
    await act(async () => { other.resolve(page()); await other.promise })
    expect(result.current.data).toBeNull()
    await act(async () => { repeated.resolve(page()); await repeated.promise })
    expect(result.current.data?.indicadores.plantacion_inicial).toBe(50)
  })

  it('retira filas que dejaron de ser públicas y avisa de cambio de alcance entre páginas', async () => {
    const next = page()
    next.data.mapa = next.data.mapa.filter((point) => point.registro_id !== '827000')
    next.data.registros = next.data.registros.slice(2)
    next.data.indicadores = { ...next.data.indicadores, plantacion_inicial: 30, registros: 3 }
    request.mockResolvedValueOnce(firstPage()).mockResolvedValueOnce(next)
    const { result } = renderHook(() => useImpactoConsulta({ tipo: 'global' }, {}))
    await waitFor(() => expect(result.current.data).toBeTruthy())
    await act(() => result.current.loadMore())
    expect(result.current.data?.registros.map((record) => record.id)).toEqual(['826001', '826000', '820000'])
    expect(result.current.data?.indicadores.registros).toBe(3)
    expect(result.current.data?.indicadores.plantacion_inicial).toBe(30)
    expect(result.current.scopeChanged).toBe(true)
  })

  it('no anexa una página con cursor repetido y permite reconsultar desde el inicio', async () => {
    const invalid = page()
    invalid.data.siguiente_cursor = '826001'
    request.mockResolvedValueOnce(firstPage()).mockResolvedValueOnce(invalid).mockResolvedValueOnce(page())
    const { result } = renderHook(() => useImpactoConsulta({ tipo: 'global' }, {}))
    await waitFor(() => expect(result.current.data).toBeTruthy())
    await act(() => result.current.loadMore())
    expect(result.current.data?.registros).toHaveLength(2)
    expect(result.current.pageError).toEqual(expect.objectContaining({ message: expect.stringContaining('La lista cambió') }))
    act(() => result.current.retry())
    expect(result.current.data).toBeNull()
    await waitFor(() => expect(result.current.data?.registros).toHaveLength(4))
    expect(request).toHaveBeenLastCalledWith({ tipo: 'global' }, {}, expect.any(AbortSignal))
  })

  it('una consulta inválida no envía petición ni publica resultados de la anterior', async () => {
    request.mockResolvedValueOnce(page())
    const { result, rerender } = renderHook(({ enabled }) => useImpactoConsulta({ tipo: 'global' }, {}, enabled), { initialProps: { enabled: true } })
    await waitFor(() => expect(result.current.data).toBeTruthy())
    const signal = request.mock.calls[0][2]!
    rerender({ enabled: false })
    expect(signal.aborted).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(request).toHaveBeenCalledTimes(1)
  })
})
