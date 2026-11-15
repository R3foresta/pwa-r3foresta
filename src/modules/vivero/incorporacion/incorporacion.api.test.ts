import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { IncorporacionApi, INCORPORACION_TIMEOUT_MS } from './incorporacion.api'
import type { IncorporacionPayload } from './incorporacion.contract'

vi.mock('../../participacion/api/participacion.api', () => ({ verificarActorParticipacion: vi.fn() }))
const a = '9007199254740992', b = '9007199254740993'
const payload: IncorporacionPayload = { solicitud_id: '4ff8f9bb-4280-463d-95c8-97a3f11f122c', vivero_id: a, planta_id: b, modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', fecha_evento: '2026-11-12', cantidad: 210, evidencia_ids: [a, b] }
function receipt() {
  return { success: true, estado: 'CONFIRMADO', data: { ...payload, lote_vivero_id: a, evento_incorporacion_id: b, codigo_trazabilidad: 'VIV-INC-SINTETICA', tercero_origen: null, referencia_documental: null, observaciones: null, evidencia_ids_vinculadas: [...payload.evidencia_ids], saldo_vivo_antes: 0, saldo_vivo_despues: 210, nombre_cientifico_snapshot: 'Científico histórico', nombre_comercial_snapshot: 'Nombre histórico', variedad_snapshot: null, nombre_responsable_snapshot: null, registrado_en: '2026-11-12T12:34:56.123456Z' } }
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
beforeEach(() => { localStorage.setItem('authToken', 'synthetic-bearer'); vi.mocked(verificarActorParticipacion).mockResolvedValue('synthetic-bearer') })
afterEach(() => vi.useRealTimers())
describe('API incorporación, transporte real con HTTP simulado', () => {
  it('recupera un recibo propio por identidad Bearer sin M2 y sin ruta ../ ni /v1', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(receipt()))
    vi.stubGlobal('fetch', fetcher)
    expect((await IncorporacionApi.recuperar('7', payload.solicitud_id)).estado).toBe('CONFIRMADO')
    expect(verificarActorParticipacion).toHaveBeenCalledWith('7', undefined)
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/api\/lotes-vivero\/incorporaciones\/4ff8f9bb/), expect.objectContaining({ cache: 'no-store', credentials: 'omit', headers: { Authorization: 'Bearer synthetic-bearer' } }))
    expect(fetcher.mock.calls[0][0]).not.toContain('/v1/')
  })
  it('confirma una sola vez con body exacto y valida intención/IDs devueltos', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(receipt(), 201)).mockResolvedValueOnce(response({ ...receipt(), data: { ...receipt().data, planta_id: a } }, 201))
    vi.stubGlobal('fetch', fetcher)
    await IncorporacionApi.confirmar('7', payload)
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload)
    expect(fetcher.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer synthetic-bearer', 'Content-Type': 'application/json' })
    await expect(IncorporacionApi.confirmar('7', payload)).rejects.toMatchObject({ status: 201, concluyente: false })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('SIN_RESULTADO y respuesta de otro UUID nunca confirman ni habilitan otra clave', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ success: true, estado: 'SIN_RESULTADO', resultado_concluyente: false })).mockResolvedValueOnce(response({ ...receipt(), data: { ...receipt().data, solicitud_id: '4ff8f9bb-4280-463d-95c8-97a3f11f122d' } }))
    vi.stubGlobal('fetch', fetcher)
    expect(await IncorporacionApi.recuperar('7', payload.solicitud_id)).toEqual({ success: true, estado: 'SIN_RESULTADO', resultado_concluyente: false })
    await expect(IncorporacionApi.recuperar('7', payload.solicitud_id)).rejects.toMatchObject({ concluyente: false })
  })
  it('sube multipart sin Content-Type manual y lee pendientes por el mismo UUID/vivero', async () => {
    const photo = { id: a, bucket: 'vivero_incorporaciones', ruta_archivo: 'privada/foto.jpg', signed_url: 'https://storage.example.test/signed', url_expira_en_segundos: 300 }
    const result = { success: true, data: [photo], evidencia_ids: [a] }
    const fetcher = vi.fn().mockResolvedValueOnce(response(result, 201)).mockResolvedValueOnce(response(result))
    vi.stubGlobal('fetch', fetcher)
    await IncorporacionApi.subir('7', payload.solicitud_id, b, [new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })])
    const request = fetcher.mock.calls[0][1]
    expect(request.headers).toEqual({ Authorization: 'Bearer synthetic-bearer' })
    expect(request.body.get('vivero_id')).toBe(b)
    expect(request.body.getAll('fotos')).toHaveLength(1)
    await IncorporacionApi.pendientes('7', payload.solicitud_id, b)
    expect(fetcher.mock.calls[1][0]).toContain(`/incorporaciones/${payload.solicitud_id}/evidencias-pendientes?vivero_id=${b}`)
  })
  it.each([[400, true], [422, true], [409, false], [503, false], [401, false], [403, false]] as const)('clasifica HTTP %s sin repetir la escritura', async (status, concluyente) => {
    const fetcher = vi.fn().mockResolvedValue(response({ message: 'Respuesta sintética' }, status))
    vi.stubGlobal('fetch', fetcher)
    await expect(IncorporacionApi.confirmar('7', payload)).rejects.toMatchObject({ status, concluyente })
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('un body ilegible, incluso en 400, no constituye rechazo de validación explícito', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ilegible', { status: 400 })))
    await expect(IncorporacionApi.confirmar('7', payload)).rejects.toMatchObject({ status: 400, concluyente: false })
  })
  it.each(['cabeceras', 'body'])('timeout esperando %s conserva resultado incierto sin POST automático', async stage => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockImplementation(() => stage === 'cabeceras' ? new Promise(() => {}) : Promise.resolve({ status: 201, json: () => new Promise(() => {}) }))
    vi.stubGlobal('fetch', fetcher)
    const assertion = expect(IncorporacionApi.confirmar('7', payload)).rejects.toMatchObject({ status: 0, concluyente: false })
    await vi.advanceTimersByTimeAsync(INCORPORACION_TIMEOUT_MS + 1)
    await assertion
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true)
  })
  it('un cambio de token antes de escribir no transmite el body con otra sesión', async () => {
    localStorage.setItem('authToken', 'otra-sesion')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(IncorporacionApi.confirmar('7', payload)).rejects.toMatchObject({ status: 401, concluyente: false })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('propaga cancelación externa sin aceptar después una respuesta tardía', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetcher)
    const promise = IncorporacionApi.recuperar('7', payload.solicitud_id, controller.signal)
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()
    await assertion
  })
})
