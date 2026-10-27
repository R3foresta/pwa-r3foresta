import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IntentoAcceso } from '../types'
import { PARTICIPACION_REQUEST_TIMEOUT_MS, ParticipacionService } from './participacion.api'

const date = '2026-10-15T10:08:34.097494Z'
const api = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
const command = '3db713df-36a1-479c-82b9-91ac76cc1db6'
const intento: IntentoAcceso = { actor_id: '600', operacion: 'OTORGAR_PLANTADOR', payload: { comando_id: command, usuario_destino_id: '603', ambitos: [{ subcampania_id: '600', revision_esperada: '1' }] } }
const capacidades = { data: { actor: { usuario_id: '600', rol_global: 'ADMIN' }, capacidades_globales: { asignar_roles: true, designar_administradores: true, leer_plan: true }, subcampanias: [] }, observado_en: date, siguiente_cursor: null }
const receipt = { comando_id: command, operacion: intento.operacion, estado: 'CONFIRMADO', error: null, finalizado_en: date, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '600', usuarios: [{ usuario_id: '603', permiso_anterior: null, permiso_nuevo: 'PLANTADOR', revision_anterior: '1', revision_nueva: '2', cambio: 'CAMBIO_APLICADO', conserva_acceso_global: true }] }] } }
const error = { codigo: 'REVISION_OBSOLETA', mensaje: 'La revisión cambió', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }
const response = (body: unknown, status = 200, retryAfter?: string) => ({ status, json: async () => body, headers: new Headers(retryAfter ? { 'Retry-After': retryAfter } : {}) })
let sequence = 0
beforeEach(() => { localStorage.clear(); localStorage.setItem('authToken', `jwt-${++sequence}`) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function prime() {
  const fetch = vi.fn().mockResolvedValue(response(capacidades))
  vi.stubGlobal('fetch', fetch)
  await ParticipacionService.capacidades()
  fetch.mockClear()
  return fetch
}

describe('cliente privado de participación', () => {
  it('usa Bearer de sesión, no-store y campos explícitos; nunca envía actor ni headers de rol', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response(receipt))
    await ParticipacionService.enviar(intento)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/accesos/otorgar-plantador`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', headers: { Authorization: `Bearer jwt-${sequence}`, 'Content-Type': 'application/json' } })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(intento.payload)
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-auth-id')
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-user-role')
  })
  it('sin sesión no realiza solicitudes; user cache no acredita actor', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    localStorage.removeItem('authToken')
    localStorage.setItem('r3foresta:user', JSON.stringify({ id: '600', rol: 'ADMIN' }))
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ status: 401, resultado_concluyente: false })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('envía el cambio de administrador a plantador a su endpoint específico y recupera la misma operación', async () => {
    const fetch = await prime()
    const change: IntentoAcceso = { ...intento, operacion: 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR' }
    fetch.mockResolvedValue(response({
      ...receipt, operacion: change.operacion,
      resultado: { tipo: 'ACCESO', cambios: [{ ...receipt.resultado.cambios[0], usuarios: [{ ...receipt.resultado.cambios[0].usuarios[0], permiso_anterior: 'ADMINISTRADOR_SUBCAMPANIA' }] }] },
    }))
    await ParticipacionService.enviar(change)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/accesos/administrador-a-plantador`)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(change.payload)
    await ParticipacionService.recuperar(change)
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/comandos/${command}?operacion=CAMBIAR_ADMINISTRADOR_A_PLANTADOR`)
    expect(fetch.mock.calls[1][1]).not.toHaveProperty('body')
  })
  it('liga el actor a capacidades del Bearer actual antes de recuperar y no consulta el comando de otra cuenta', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ ...capacidades, data: { ...capacidades.data, actor: { usuario_id: '601', rol_global: 'ADMIN' } } })); vi.stubGlobal('fetch', fetch)
    await expect(ParticipacionService.recuperar(intento)).rejects.toMatchObject({ status: 401, reintento: 'RECUPERAR_SESION' })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/capacidades`)
  })
  it('pagina miembros y consulta privada por POST sin correo en URL ni campos extra', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ data: [], observado_en: date, siguiente_cursor: 'siguiente' }))
    await ParticipacionService.miembros('9007199254740993', { cursor: 'cursor opaco', limite: 20 })
    expect(fetch.mock.calls[0][0]).toBe(`${api}/subcampanias/9007199254740993/miembros-participacion?cursor=cursor+opaco&limite=20`)
    await ParticipacionService.buscar({ modo: 'CORREO_EXACTO', consulta: ' Ana+campo@ejemplo.test ', accion: 'OTORGAR_PLANTADOR', subcampania_ids: ['600'], limite: 20 })
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/personas/buscar`)
    expect(JSON.parse(fetch.mock.calls[1][1].body).consulta).toBe('Ana+campo@ejemplo.test')
  })
  it('revisión no admite otra persona ni ámbitos omitidos', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ data: { usuario: { usuario_id: '604', nombre: 'Otra', organizacion: null }, ambitos: [{ subcampania_id: '600', permiso_contextual: null, revision_permiso: '0', acceso_global: false }] }, observado_en: date }))
    await expect(ParticipacionService.revisar({ usuario_destino_id: '603', subcampania_ids: ['600'] })).rejects.toMatchObject({ name: 'ParticipacionContratoError' })
  })
  it.each([409, 422])('retorna RECHAZADO durable válido con HTTP %s sin confundirlo con infraestructura', async status => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ ...receipt, estado: 'RECHAZADO', resultado: null, error }, status))
    await expect(ParticipacionService.enviar(intento)).resolves.toMatchObject({ estado: 'RECHAZADO', error: { codigo: 'REVISION_OBSOLETA' } })
  })
  it('un 409 fuera de recibo conserva resultado inconcluso y misma clave', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ comando_id: command, resultado_concluyente: false, error: { ...error, codigo: 'COMANDO_REUTILIZADO', reintento: 'MISMA_CLAVE' } }, 409))
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ status: 409, codigo: 'COMANDO_REUTILIZADO', resultado_concluyente: false, reintento: 'MISMA_CLAVE' })
  })
  it.each([401, 500, 503])('HTTP %s no acredita un recibo aun si su body parece terminal', async status => {
    const fetch = await prime()
    fetch.mockResolvedValue(response(receipt, status))
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ status, resultado_concluyente: false })
  })
  it.each([202, 404])('GET %s es inconcluso y publica Retry-After sin convertir ausencia en rechazo', async status => {
    const fetch = await prime()
    fetch.mockResolvedValue(response(status === 202 ? { ...receipt, estado: 'SIN_RESULTADO', resultado: null, finalizado_en: null } : { comando_id: command, resultado_concluyente: false, error: { ...error, codigo: 'COMANDO_NO_CONFIRMADO', reintento: 'MISMA_CLAVE' } }, status, '2'))
    await expect(ParticipacionService.recuperar(intento)).rejects.toMatchObject({ status, resultado_concluyente: false, reintento: 'MISMA_CLAVE', retryAfter: 2 })
  })
  it('después de respuesta perdida recupera por GET con la misma identidad y valida el resultado histórico', async () => {
    const fetch = await prime()
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(response(receipt))
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ codigo: 'RESULTADO_NO_DETERMINADO', reintento: 'MISMA_CLAVE' })
    await expect(ParticipacionService.recuperar(intento)).resolves.toMatchObject({ estado: 'CONFIRMADO', comando_id: command })
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/comandos/${command}?operacion=OTORGAR_PLANTADOR`)
    expect(fetch.mock.calls[1][1]).not.toHaveProperty('body')
  })
  it('un recibo con revisión/persona distinta permanece inconcluso', async () => {
    const fetch = await prime()
    fetch.mockResolvedValue(response({ ...receipt, resultado: { tipo: 'ACCESO', cambios: [{ ...receipt.resultado.cambios[0], usuarios: [{ ...receipt.resultado.cambios[0].usuarios[0], revision_nueva: '3' }] }] } }))
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ name: 'ParticipacionContratoError', resultado_concluyente: false })
  })
  it('descarta datos tardíos después de un cambio de cuenta', async () => {
    const fetch = await prime()
    fetch.mockImplementationOnce(async () => { localStorage.setItem('authToken', 'otra-cuenta'); return response(receipt) })
    await expect(ParticipacionService.enviar(intento)).rejects.toMatchObject({ status: 401 })
  })
  it('no envía si la sesión cambia entre acreditar actor y comenzar request', async () => {
    const fetch = await prime()
    const promise = ParticipacionService.enviar(intento)
    localStorage.setItem('authToken', 'otra-cuenta')
    await expect(promise).rejects.toMatchObject({ status: 401 })
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each(['POST', 'GET', 'BODY'] as const)('limita espera de %s y conserva identidad inconclusa sin reenvío automático', async kind => {
    const fetch = await prime()
    vi.useFakeTimers()
    fetch.mockImplementation(() => kind === 'BODY' ? Promise.resolve({ ...response(null), json: () => new Promise(() => {}) }) : new Promise(() => {}))
    const promise = kind === 'GET' ? ParticipacionService.recuperar(intento) : ParticipacionService.enviar(intento)
    const assertion = expect(promise).rejects.toMatchObject({ status: 0, codigo: 'RESULTADO_NO_DETERMINADO', resultado_concluyente: false, reintento: 'MISMA_CLAVE' })
    await vi.advanceTimersByTimeAsync(PARTICIPACION_REQUEST_TIMEOUT_MS + 1)
    await assertion
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cancela por señal externa durante body y limpia temporizador/listener', async () => {
    const fetch = await prime()
    vi.useFakeTimers()
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    fetch.mockResolvedValue({ ...response(null), json: () => new Promise(() => {}) })
    const promise = ParticipacionService.miembros('600', {}, controller.signal)
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    controller.abort()
    await assertion
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)
  })
})
