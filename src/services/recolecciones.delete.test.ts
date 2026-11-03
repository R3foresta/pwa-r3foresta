import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, RecoleccionRequestError } from './recolecciones.service'

const confirmation = {
  success: true,
  data: {
    recoleccion_id: 292,
    eliminado_en: '2026-11-03T18:30:00.000Z',
    eliminado_por_usuario_id: 7,
  },
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  localStorage.setItem('authToken', 'verified-jwt')
  vi.stubGlobal('fetch', fetchMock)
})

describe('RecoleccionesService.deleteDraft', () => {
  it('envía solo Bearer, sin body ni identidad o rol legados, y conserva la confirmación del servidor', async () => {
    localStorage.setItem('auth_id', 'legacy-auth-id')
    localStorage.setItem('r3foresta:user', JSON.stringify({ id: '99', rol: 'ADMIN' }))
    fetchMock.mockResolvedValue(new Response(JSON.stringify(confirmation), { status: 200 }))

    await expect(RecoleccionesService.deleteDraft(292)).resolves.toEqual(confirmation)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/recolecciones/292'), {
      method: 'DELETE',
      headers: { Authorization: 'Bearer verified-jwt' },
    })
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza el ID inválido %s antes de enviar una petición', async (id) => {
      await expect(RecoleccionesService.deleteDraft(id)).rejects.toThrow('ID de recolección inválido.')
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each([null, '', '   '])('exige un token antes de enviar una petición (%s)', async (token) => {
    if (token === null) localStorage.removeItem('authToken')
    else localStorage.setItem('authToken', token)

    await expect(RecoleccionesService.deleteDraft(292)).rejects.toThrow(/iniciar sesión/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([403, 404, 409, 500])('conserva mensaje y estado HTTP %s sin simular éxito ni reintentar', async (status) => {
    const message = `Rechazo del servidor ${status}`
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message }), { status }))

    const error = await RecoleccionesService.deleteDraft(292).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(RecoleccionRequestError)
    expect(error).toMatchObject({ message, status })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['sin confirmación', {}],
    ['éxito falso', { ...confirmation, success: false }],
    ['otro registro', { ...confirmation, data: { ...confirmation.data, recoleccion_id: 293 } }],
    ['fecha ausente', { ...confirmation, data: { ...confirmation.data, eliminado_en: null } }],
    ['fecha inválida', { ...confirmation, data: { ...confirmation.data, eliminado_en: 'no-es-fecha' } }],
    ['actor ausente', { ...confirmation, data: { ...confirmation.data, eliminado_por_usuario_id: undefined } }],
    ['actor inválido', { ...confirmation, data: { ...confirmation.data, eliminado_por_usuario_id: 0 } }],
    ['datos incompletos', { success: true, data: null }],
  ])('no acredita una respuesta 200 con %s', async (_label, payload) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))

    await expect(RecoleccionesService.deleteDraft(292)).rejects.toThrow(/confirmar la eliminación/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no acredita un 202 con un body de confirmación', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(confirmation), { status: 202 }))
    await expect(RecoleccionesService.deleteDraft(292)).rejects.toThrow(/confirmar la eliminación/)
  })

  it('propaga un fallo de red y no repite automáticamente el DELETE', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(RecoleccionesService.deleteDraft(292)).rejects.toThrow('Failed to fetch')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
