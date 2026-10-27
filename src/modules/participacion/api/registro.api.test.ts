import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from './participacion.api'
import { PARTICIPACION_REQUEST_TIMEOUT_MS } from './participacion.transport'
import { REGISTRO_FOTO_MAX_BYTES, RegistroParticipacionService as Service } from './registro.api'
import { attempt, available, capture, cargaId, context, detail, instant, prepared, receipt, stableError } from './registro.test-fixtures'

const api = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
const response = (body: unknown, status = 200) => ({ status, json: async () => body, headers: new Headers(status === 202 ? { 'Retry-After': '2' } : {}) })
const photo = () => new File(['foto'], 'campo.jpg', { type: 'image/jpeg' })
const capacidades = { data: { actor: { usuario_id: '801', rol_global: 'VOLUNTARIO' }, capacidades_globales: { asignar_roles: false, designar_administradores: false, leer_plan: true }, subcampanias: [] }, observado_en: instant, siguiente_cursor: null }
let sequence = 0
beforeEach(() => { localStorage.clear(); localStorage.setItem('authToken', `registro-jwt-${++sequence}`) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function prime() {
  const fetch = vi.fn().mockResolvedValue(response(capacidades)); vi.stubGlobal('fetch', fetch)
  await ParticipacionService.capacidades(); fetch.mockClear(); return fetch
}

describe('registro API sobre transporte privado compartido', () => {
  it('contexto liga actor y ámbito con Bearer, no-store y sin headers auxiliares', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response(context))
    await expect(Service.contexto('801', '821')).resolves.toEqual(context)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/subcampanias/821/contexto-registro`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit', headers: { Authorization: `Bearer registro-jwt-${sequence}` } })
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-auth-id')
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-user-role')
  })
  it('no ejecuta solicitudes privadas con sesión ausente ni recupera una identidad de otra cuenta', async () => {
    const fetch = await prime(); localStorage.removeItem('authToken')
    await expect(Service.recuperar(capture)).rejects.toMatchObject({ status: 401 })
    expect(fetch).not.toHaveBeenCalled()
    localStorage.setItem('authToken', 'otro-actor')
    fetch.mockResolvedValue(response({ ...capacidades, data: { ...capacidades.data, actor: { usuario_id: '802', rol_global: 'VOLUNTARIO' } } }))
    await expect(Service.recuperar(capture)).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('/capacidades')
  })
  it('participantes usa el endpoint contextual paginado y excluye al actor sin devolver contactos', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response({ data: [{ usuario_id: '802', nombre: 'Ana', organizacion: null }], observado_en: instant, siguiente_cursor: 'opaco' }))
    expect((await Service.participantes('801', '821', { q: ' Ána ', limite: 20, cursor: 'anterior' })).data).toHaveLength(1)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/subcampanias/821/participantes-seleccionables?cursor=anterior&limite=20&q=%C3%81na`)
    fetch.mockResolvedValue(response({ data: [{ usuario_id: '801', nombre: 'Actor', organizacion: null }], observado_en: instant, siguiente_cursor: null }))
    await expect(Service.participantes('801', '821')).rejects.toMatchObject({ name: 'ParticipacionContratoError' })
  })
  it('preparación envía sólo identidad/operación/ámbito y acepta PREPARADO o terminal histórico', async () => {
    const fetch = await prime(); fetch.mockResolvedValueOnce(response(prepared)).mockResolvedValueOnce(response(receipt))
    await expect(Service.preparar(capture)).resolves.toEqual(prepared)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ comando_id: capture.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', subcampania_id: '821' })
    await expect(Service.preparar(capture)).resolves.toEqual(receipt)
  })
  it('PUT carga usa UUID estable y multipart foto sin Content-Type JSON/boundary manual', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response(available, 201))
    await expect(Service.subirCarga(capture, cargaId, photo())).resolves.toEqual(available)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/comandos/${capture.comando_id}/cargas/${cargaId}?operacion=REGISTRAR_PLANTACION_INICIAL`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PUT', cache: 'no-store', credentials: 'omit' })
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Type')
    const body = fetch.mock.calls[0][1].body as FormData
    expect([...body.keys()]).toEqual(['foto'])
    expect(body.get('foto')).toBeInstanceOf(File)
  })
  it('202 RESERVADA no se transforma en una carga disponible sin evidencia', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response({ ...available, data: { ...available.data, estado: 'RESERVADA', evidencia_id: null } }, 202))
    expect((await Service.subirCarga(capture, cargaId, photo())).data).toMatchObject({ estado: 'RESERVADA', evidencia_id: null })
  })
  it('rechaza formato/tamaño inválido antes de subir sin fabricar un rechazo durable', async () => {
    const fetch = await prime()
    await expect(Service.subirCarga(capture, cargaId, new File(['x'], 'texto.txt', { type: 'text/plain' }))).rejects.toThrow()
    await expect(Service.subirCarga(capture, cargaId, new File([new Uint8Array(REGISTRO_FOTO_MAX_BYTES + 1)], 'campo.jpg', { type: 'image/jpeg' }))).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('lista y preview son propios, sin contexto operativo ni exposición de originales', async () => {
    const fetch = await prime(); fetch.mockResolvedValueOnce(response({ data: [available.data], observado_en: instant })).mockResolvedValueOnce(response({ data: { url: 'https://storage.example.test/derivado?firma=temporal', expira_en: instant }, observado_en: instant }))
    await Service.listarCargas(capture); await Service.preview(capture, cargaId)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/participacion/comandos/${capture.comando_id}/cargas?operacion=REGISTRAR_PLANTACION_INICIAL`)
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/cargas/${cargaId}/preview`)
    expect(fetch.mock.calls.every(call => !String(call[0]).includes('contexto-registro'))).toBe(true)
  })
  it('POST inicial conserva payload exacto, IDs string y revisión0; no envía actor ni reparto', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response(receipt))
    await expect(Service.enviar(attempt)).resolves.toEqual(receipt)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/plantaciones/iniciales`)
    const sent = JSON.parse(fetch.mock.calls[0][1].body)
    expect(sent).toEqual({ ...attempt.payload, afiliaciones_declaradas: [] })
    expect(sent).not.toHaveProperty('actor_id'); expect(sent).not.toHaveProperty('detalles')
  })
  it('permite sólo el503 RECHAZADO durable validado del evaluador', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response({ ...receipt, estado: 'RECHAZADO', resultado: null, error: { ...stableError, codigo: 'EVALUADOR_NO_DISPONIBLE' } }, 503))
    await expect(Service.enviar(attempt)).resolves.toMatchObject({ estado: 'RECHAZADO', error: { codigo: 'EVALUADOR_NO_DISPONIBLE' } })
    fetch.mockResolvedValue(response({ ...receipt, estado: 'RECHAZADO', resultado: null, error: stableError }, 503))
    await expect(Service.enviar(attempt)).rejects.toMatchObject({ status: 503, resultado_concluyente: false })
    fetch.mockResolvedValue(response(receipt, 503))
    await expect(Service.enviar(attempt)).rejects.toMatchObject({ status: 503, resultado_concluyente: false })
  })
  it('pausa503 no clausura preparación ni autoriza otra clave', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response({ error: { ...stableError, codigo: 'RESULTADO_NO_DETERMINADO', reintento: 'MISMA_CLAVE' }, comando_id: capture.comando_id, resultado_concluyente: false }, 503))
    await expect(Service.enviar(attempt)).rejects.toMatchObject({ status: 503, codigo: 'RESULTADO_NO_DETERMINADO', reintento: 'MISMA_CLAVE' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it.each([403, 409, 422])('conserva rechazo durable HTTP%s y no ajusta cantidades/personas', async status => {
    const fetch = await prime(); fetch.mockResolvedValue(response({ ...receipt, estado: 'RECHAZADO', resultado: null, error: stableError }, status))
    await expect(Service.enviar(attempt)).resolves.toMatchObject({ estado: 'RECHAZADO', resultado: null })
    expect(attempt.payload.especies).toEqual([{ planta_id: '8', cantidad: 1 }])
    expect(attempt.payload.coresponsable_ids).toEqual(['802'])
  })
  it('GET202 discrimina PREPARADO sin fingir guardado y mantiene Retry-After', async () => {
    const fetch = await prime(); const pending = { comando_id: capture.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null }
    fetch.mockResolvedValue(response(pending, 202))
    await expect(Service.recuperar(capture)).rejects.toMatchObject({ status: 202, codigo: 'COMANDO_NO_CONFIRMADO', message: expect.stringContaining('todavía no tiene un resultado de guardado'), retryAfter: 2, resultado_concluyente: false })
    fetch.mockResolvedValue(response({ ...pending, comando_id: cargaId }, 202))
    await expect(Service.recuperar(capture)).rejects.toMatchObject({ name: 'ParticipacionContratoError' })
  })
  it('respuesta perdida usa GET con la misma clave y devuelve el recibo histórico', async () => {
    const fetch = await prime(); fetch.mockRejectedValueOnce(new TypeError('red')).mockResolvedValueOnce(response(receipt))
    await expect(Service.enviar(attempt)).rejects.toMatchObject({ resultado_concluyente: false, reintento: 'MISMA_CLAVE' })
    await expect(Service.recuperar(attempt)).resolves.toEqual(receipt)
    expect(fetch.mock.calls[1][0]).toBe(`${api}/participacion/comandos/${capture.comando_id}?operacion=REGISTRAR_PLANTACION_INICIAL`)
  })
  it('descarte puede devolver cancelación sin payload o el terminal previamente confirmado', async () => {
    const fetch = await prime(); fetch.mockResolvedValueOnce(response({ ...receipt, estado: 'RECHAZADO', resultado: null, error: { ...stableError, codigo: 'PREPARACION_CANCELADA' } })).mockResolvedValueOnce(response(receipt))
    await expect(Service.cancelar(capture)).resolves.toMatchObject({ estado: 'RECHAZADO', error: { codigo: 'PREPARACION_CANCELADA' } })
    await expect(Service.cancelar(capture)).resolves.toEqual(receipt)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ operacion: 'REGISTRAR_PLANTACION_INICIAL' })
  })
  it('detalle propio no vuelve a exigir contexto tras retiro', async () => {
    const fetch = await prime(); fetch.mockResolvedValue(response(detail))
    await expect(Service.detallePropio('801', '21')).resolves.toEqual(detail)
    expect(fetch.mock.calls[0][0]).toBe(`${api}/plantaciones/21/detalle-propio`)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('detalle histórico abre con JWT vigente aunque no se puedan consultar capacidades', async () => {
    const fetch = vi.fn().mockResolvedValue(response(detail)); vi.stubGlobal('fetch', fetch)
    const capabilities = vi.spyOn(ParticipacionService, 'capacidades').mockRejectedValue(new Error('Capacidades temporalmente no disponibles'))
    await expect(Service.detallePropio('801', '21')).resolves.toEqual(detail)
    expect(capabilities).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: `Bearer registro-jwt-${sequence}` })
  })
  it('descarta una respuesta tardía tras cambiar token y no envía bajo otra cuenta', async () => {
    const fetch = await prime(); fetch.mockImplementationOnce(async () => { localStorage.setItem('authToken', 'otro-token'); return response(receipt) })
    await expect(Service.enviar(attempt)).rejects.toMatchObject({ status: 401 })
  })
  it.each(['PUT', 'GET', 'POST', 'BODY'] as const)('timeout de %s aborta sin repetir ni borrar identidad', async kind => {
    const fetch = await prime(); vi.useFakeTimers()
    fetch.mockImplementation(() => kind === 'BODY' ? Promise.resolve({ ...response(null), json: () => new Promise(() => {}) }) : new Promise(() => {}))
    const promise = kind === 'PUT' ? Service.subirCarga(capture, cargaId, photo()) : kind === 'GET' ? Service.recuperar(attempt) : Service.enviar(attempt)
    const assertion = expect(promise).rejects.toMatchObject({ codigo: 'RESULTADO_NO_DETERMINADO', resultado_concluyente: false, reintento: 'MISMA_CLAVE' })
    await vi.advanceTimersByTimeAsync(PARTICIPACION_REQUEST_TIMEOUT_MS + 1); await assertion
    expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][1].signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0)
  })
})
