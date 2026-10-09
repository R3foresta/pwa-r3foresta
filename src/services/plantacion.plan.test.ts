import { describe, expect, it, vi } from 'vitest'
import type { RevisarPlanData, RevisarPlanInput } from '../modules/plantacion/types/contracts'
import { PlantacionService } from './plantacion.service'

function makeInput(): RevisarPlanInput {
  return {
    meta_total_arboles: 60,
    revision_esperada: 3,
    metas: [
      { planta_id: 10, cantidad_objetivo: 40, porcentaje_objetivo: 66.67 },
      { planta_id: 20, cantidad_objetivo: 20, porcentaje_objetivo: 33.33 },
    ],
  }
}

function makeConfirmation(): RevisarPlanData {
  const input = makeInput()
  return {
    subcampania_id: 54,
    estado: 'ACTIVA',
    meta_total_arboles: input.meta_total_arboles,
    plan_revision: 4,
    metas: input.metas,
  }
}

function mockResponse(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Revisión atómica del plan de subcampaña', () => {
  it('envía meta, especies y versión juntas en un único PUT autenticado y devuelve el plan confirmado', async () => {
    localStorage.setItem('authToken', 'jwt')
    const input = makeInput()
    const data = makeConfirmation()
    const fetchMock = mockResponse(data)

    expect(await PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'PUT',
      headers: { 'x-auth-id': 'auth-1', Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    expect(input).toEqual(makeInput())
  })

  it('lee la revisión persistida del plan con GET antes de editar', async () => {
    localStorage.setItem('authToken', 'jwt')
    const data = makeConfirmation()
    const fetchMock = mockResponse(data)
    expect(await PlantacionService.getSubcampaniaPlan(54, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'GET',
      headers: { 'x-auth-id': 'auth-1', Authorization: 'Bearer jwt' },
    })
  })

  it('conserva la compatibilidad del guardado del wizard BORRADOR con solo metas', async () => {
    const metas = makeInput().metas
    const data = { subcampania_id: 54, metas }
    const fetchMock = mockResponse(data)
    expect(await PlantacionService.putSubcampaniaPlan(54, metas, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'PUT',
      headers: { 'x-auth-id': 'auth-1', 'Content-Type': 'application/json' },
      body: expect.any(String),
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ metas })
  })

  it('acepta porcentajes positivos menores de 1 con hasta dos decimales y versión inicial cero', async () => {
    const input: RevisarPlanInput = {
      meta_total_arboles: 10000,
      revision_esperada: 0,
      metas: [
        { planta_id: 10, cantidad_objetivo: 1, porcentaje_objetivo: 0.01 },
        { planta_id: 20, cantidad_objetivo: 9999, porcentaje_objetivo: 99.99 },
      ],
    }
    const data = { ...makeConfirmation(), meta_total_arboles: 10000, plan_revision: 1, metas: input.metas }
    const fetchMock = mockResponse(data)
    expect(await PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'no envía una meta total inválida (%s)', async (metaTotal) => {
      const fetchMock = mockResponse(makeConfirmation())
      await expect(PlantacionService.revisarSubcampaniaPlan(54, { ...makeInput(), meta_total_arboles: metaTotal }, 'auth-1'))
        .rejects.toThrow(/entero positivo/)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'no envía ni redondea una cantidad de especie inválida (%s)', async (cantidad) => {
      const input = makeInput()
      input.metas[0].cantidad_objetivo = cantidad
      const fetchMock = mockResponse(makeConfirmation())
      await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/entera positivos/)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(input.metas[0].cantidad_objetivo).toBe(cantidad)
    },
  )

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'no envía una revisión esperada inválida (%s)', async (revision) => {
      const fetchMock = mockResponse(makeConfirmation())
      await expect(PlantacionService.revisarSubcampaniaPlan(54, { ...makeInput(), revision_esperada: revision }, 'auth-1'))
        .rejects.toThrow(/versión vigente/)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('no envía un plan sin versión vigente', async () => {
    const { revision_esperada: omittedRevision, ...withoutVersion } = makeInput()
    expect(omittedRevision).toBe(3)
    const fetchMock = mockResponse(makeConfirmation())
    await expect(PlantacionService.revisarSubcampaniaPlan(54, withoutVersion as RevisarPlanInput, 'auth-1'))
      .rejects.toThrow(/versión vigente/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no envía un plan sin especies', async () => {
    const fetchMock = mockResponse(makeConfirmation())
    await expect(PlantacionService.revisarSubcampaniaPlan(54, { ...makeInput(), metas: [] }, 'auth-1')).rejects.toThrow(/al menos una especie/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no envía especies duplicadas aunque los totales sean coherentes', async () => {
    const input = makeInput()
    input.metas[1].planta_id = input.metas[0].planta_id
    const fetchMock = mockResponse(makeConfirmation())
    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/repetir una especie/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([0, -1, 100.01, 66.666, Number.NaN, Number.POSITIVE_INFINITY])(
    'no envía un porcentaje inválido ni lo redondea (%s)', async (porcentaje) => {
      const input = makeInput()
      input.metas[0].porcentaje_objetivo = porcentaje
      const fetchMock = mockResponse(makeConfirmation())
      await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/porcentaje/)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(input.metas[0].porcentaje_objetivo).toBe(porcentaje)
    },
  )

  it('exige porcentajes que sumen exactamente 100 con precisión de centésimas', async () => {
    const input = makeInput()
    input.metas[1].porcentaje_objetivo = 33.32
    const fetchMock = mockResponse(makeConfirmation())
    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/sumar 100%/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exige que las cantidades sumen la meta total antes de solicitar el guardado', async () => {
    const input = makeInput()
    input.metas[1].cantidad_objetivo = 21
    const fetchMock = mockResponse(makeConfirmation())
    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/sumar la meta total/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'Tu rol global cambió.'],
    [409, 'El plan fue revisado por otro administrador.'],
    [422, 'No se puede retirar una especie con stock inicial disponible.'],
  ])('conserva el error %s del backend y el payload enviado', async (status, message) => {
    const input = makeInput()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message }), { status }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toMatchObject({ status, message })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(makeInput())
    expect(input).toEqual(makeInput())
  })

  it.each([
    ['sin datos', undefined],
    ['otra subcampaña', { ...makeConfirmation(), subcampania_id: 55 }],
    ['sin versión nueva', { ...makeConfirmation(), plan_revision: undefined }],
    ['la versión anterior', { ...makeConfirmation(), plan_revision: 3 }],
    ['una meta distinta', { ...makeConfirmation(), meta_total_arboles: 59 }],
    ['sin metas', { ...makeConfirmation(), metas: undefined }],
    ['sin estado', { ...makeConfirmation(), estado: undefined }],
    ['un plan vacío', { ...makeConfirmation(), metas: [] }],
    ['especies diferentes', { ...makeConfirmation(), metas: [{ planta_id: 30, cantidad_objetivo: 60, porcentaje_objetivo: 100 }] }],
  ])('rechaza una respuesta 200 incompleta con %s', async (_description, data) => {
    const input = makeInput()
    const fetchMock = mockResponse(data)
    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/confirmación completa/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(input).toEqual(makeInput())
  })
})
