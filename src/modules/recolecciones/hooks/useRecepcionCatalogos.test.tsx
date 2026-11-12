import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, type ViveroCatalogo } from '../../../services/recolecciones.service'
import { useRecepcionCatalogos } from './useRecepcionCatalogos'

beforeEach(() => {
  vi.spyOn(RecoleccionesService, 'getViveros').mockResolvedValue([{ id: '9007199254740993', nombre: 'Vivero sur', codigo: 'SUR' }])
  vi.spyOn(RecoleccionesService, 'getMetodos').mockResolvedValue([{ id: 2, nombre: 'Recolección manual' }])
})

describe('catálogos públicos de presentación de recepción', () => {
  it('sin recepción autorizada no consulta; usa IDs exactos y conserva nombres disponibles', async () => {
    const view = renderHook(({ enabled }) => useRecepcionCatalogos('7', enabled), { initialProps: { enabled: false } })
    expect(RecoleccionesService.getViveros).not.toHaveBeenCalled()
    expect(RecoleccionesService.getMetodos).not.toHaveBeenCalled()
    view.rerender({ enabled: true })
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.viveros).toEqual({ '9007199254740993': 'Vivero sur' })
    expect(view.result.current.viveros['9007199254740992']).toBeUndefined()
    expect(view.result.current.metodos).toEqual({ '2': 'Recolección manual' })
    view.rerender({ enabled: true })
    expect(RecoleccionesService.getViveros).toHaveBeenCalledTimes(1)
  })

  it('un fallo de catálogo no borra el otro ni bloquea la operación', async () => {
    vi.mocked(RecoleccionesService.getMetodos).mockRejectedValue(new Error('Fallo sintético'))
    const view = renderHook(() => useRecepcionCatalogos('7', true))
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.viveros['9007199254740993']).toBe('Vivero sur')
    expect(view.result.current.metodos).toEqual({})
    expect(view.result.current.warning).toContain('métodos')
  })

  it('descarta respuestas de otra cuenta y retira etiquetas al perder acceso', async () => {
    let complete!: (rows: ViveroCatalogo[]) => void
    vi.mocked(RecoleccionesService.getViveros).mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
    const view = renderHook(({ actor, enabled }) => useRecepcionCatalogos(actor, enabled), { initialProps: { actor: '7', enabled: true } })
    view.rerender({ actor: '8', enabled: true })
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    await act(async () => complete([{ id: '1', nombre: 'Respuesta obsoleta', codigo: 'ANT' }]))
    expect(view.result.current.viveros['1']).toBeUndefined()
    view.rerender({ actor: '8', enabled: false })
    expect(view.result.current.viveros).toEqual({})
  })

  it('no inventa una etiqueta a partir de un ID numérico redondeado', async () => {
    vi.mocked(RecoleccionesService.getViveros).mockResolvedValue([{ id: Number('9007199254740993'), nombre: 'No confiable', codigo: 'X' }])
    const view = renderHook(() => useRecepcionCatalogos('7', true))
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.viveros).toEqual({})
    expect(view.result.current.warning).toContain('viveros')
  })
})
