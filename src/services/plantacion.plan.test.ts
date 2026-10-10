import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSubcampaniaApi } from '../api/plantacion.api'
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

beforeEach(() => {
  localStorage.setItem('authToken', 'jwt')
})

describe('Revisión atómica del plan de subcampaña', () => {
  it('envía meta, especies y versión juntas en un único PUT autenticado y devuelve el plan confirmado', async () => {
    localStorage.setItem('authToken', 'jwt')
    const input = makeInput()
    const data = makeConfirmation()
    const fetchMock = mockResponse(data)

    expect(await PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'PUT',
      headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
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
      headers: { Authorization: 'Bearer jwt' },
    })
  })

  it('conserva la compatibilidad del guardado del wizard BORRADOR con solo metas', async () => {
    const metas = makeInput().metas
    const data = { subcampania_id: 54, metas }
    const fetchMock = mockResponse(data)
    expect(await PlantacionService.putSubcampaniaPlan(54, metas, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'PUT',
      headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
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

  it('acepta el máximo entero del backend para meta total y cantidad con Bearer', async () => {
    const input: RevisarPlanInput = {
      meta_total_arboles: 2147483647,
      revision_esperada: 0,
      metas: [{ planta_id: 10, cantidad_objetivo: 2147483647, porcentaje_objetivo: 100 }],
    }
    const data = { ...makeConfirmation(), meta_total_arboles: input.meta_total_arboles, plan_revision: 1, metas: input.metas }
    const fetchMock = mockResponse(data)

    expect(await PlantacionService.revisarSubcampaniaPlan(54, input)).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method: 'PUT',
      headers: { Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it.each([
    { field: 'meta total', hasToken: true },
    { field: 'meta total', hasToken: false },
    { field: 'cantidad de especie', hasToken: true },
    { field: 'cantidad de especie', hasToken: false },
  ])('rechaza $field superior a 2147483647 antes de autenticar (token: $hasToken)', async ({ field, hasToken }) => {
    if (!hasToken) localStorage.removeItem('authToken')
    const input = makeInput()
    if (field === 'meta total') input.meta_total_arboles = 2147483648
    else input.metas[0].cantidad_objetivo = 2147483648
    const fetchMock = mockResponse(makeConfirmation())

    await expect(PlantacionService.revisarSubcampaniaPlan(54, input, 'auth-1')).rejects.toThrow(/2147483647/)
    expect(fetchMock).not.toHaveBeenCalled()
    if (field === 'meta total') expect(input.meta_total_arboles).toBe(2147483648)
    else expect(input.metas[0].cantidad_objetivo).toBe(2147483648)
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

type PlanRequest = {
  name: string
  method: 'GET' | 'PUT'
  invoke: (input: RevisarPlanInput, authId?: string) => Promise<unknown>
  body?: (input: RevisarPlanInput) => unknown
}

const planRequests: PlanRequest[] = [
  {
    name: 'lectura GET',
    method: 'GET',
    invoke: (_input, authId) => PlantacionService.getSubcampaniaPlan(54, authId),
  },
  {
    name: 'revisión atómica PUT',
    method: 'PUT',
    invoke: (input, authId) => PlantacionService.revisarSubcampaniaPlan(54, input, authId),
    body: (input) => input,
  },
  {
    name: 'guardado histórico PUT',
    method: 'PUT',
    invoke: (input, authId) => PlantacionService.putSubcampaniaPlan(54, input.metas, authId),
    body: (input) => ({ metas: input.metas }),
  },
]

describe.each(planRequests)('Sesión WebAuthn del plan: $name', ({ method, invoke, body }) => {
  it.each([
    { name: 'sin auth_id', authId: undefined, storedAuthId: undefined },
    { name: 'auth_id de otra persona', authId: 'otra-persona', storedAuthId: 'otra-sesion' },
    { name: 'ID numérico auxiliar', authId: '27', storedAuthId: '43' },
    { name: 'auth_id local de otra sesión', authId: undefined, storedAuthId: 'otra-sesion' },
  ])('envía el Bearer sin x-auth-id con $name', async ({ authId, storedAuthId }) => {
    if (storedAuthId !== undefined) localStorage.setItem('auth_id', storedAuthId)
    const input = makeInput()
    const data = makeConfirmation()
    const fetchMock = mockResponse(data)

    expect(await invoke(input, authId)).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method,
      headers: {
        Authorization: 'Bearer jwt',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: expect.any(String) } : {}),
    })
    if (body) expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body(makeInput()))
    expect(input).toEqual(makeInput())
  })

  it.each([null, '', '   '])('bloquea el token ausente o vacío (%s), aunque exista auth_id', async (token) => {
    if (token === null) localStorage.removeItem('authToken')
    else localStorage.setItem('authToken', token)
    localStorage.setItem('auth_id', 'auth-1')
    const fetchMock = mockResponse(makeConfirmation())

    await expect(invoke(makeInput(), 'auth-1')).rejects.toMatchObject({
      status: 401,
      message: expect.stringMatching(/iniciar sesión/),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { status: 401, message: 'La sesión venció.' },
    { status: 401, message: 'La identidad de la sesión es inconsistente.' },
    { status: 403, message: 'No tienes permiso para editar.' },
    { status: 404, message: 'La subcampaña no existe.' },
    { status: 400, message: 'El plan contiene datos inválidos.' },
    { status: 422, message: 'No se puede retirar una especie con stock inicial disponible.' },
    { status: 409, message: 'Otro administrador revisó el plan.' },
    { status: 500, message: 'No se pudo procesar el plan.' },
  ])('conserva el error $status ($message), sin reintentar ni modificar el plan', async ({ status, message }) => {
    const input = makeInput()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message }), { status }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(invoke(input, 'otra-persona')).rejects.toMatchObject({ status, message })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/plan'), {
      method,
      headers: {
        Authorization: 'Bearer jwt',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: expect.any(String) } : {}),
    })
    if (body) expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body(makeInput()))
    expect(input).toEqual(makeInput())
  })

  it('conserva el error de red sin reintentar ni declarar éxito', async () => {
    const input = makeInput()
    const networkError = new TypeError('Failed to fetch')
    const fetchMock = vi.fn().mockRejectedValue(networkError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(invoke(input, 'auth-1')).rejects.toBe(networkError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    if (body) expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body(makeInput()))
    else expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    expect(input).toEqual(makeInput())
  })
})

describe('Compatibilidad de autenticación fuera de /plan', () => {
  it('conserva el contrato x-auth-id existente de las demás rutas', async () => {
    localStorage.removeItem('authToken')
    const fetchMock = mockResponse({ id: 54 })

    await getSubcampaniaApi(54, 'auth-1')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54'), {
      method: 'GET',
      headers: { 'x-auth-id': 'auth-1' },
    })
  })
})
