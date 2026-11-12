import { beforeEach, describe, expect, it, vi } from 'vitest'
import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { requestPrivada } from '../../participacion/api/participacion.transport'
import { RecepcionService, cargarIntencionRecepcion, guardarIntencionRecepcion, recepcionStoreKey } from './recepcion.api'
import { detalleFixture, origenFixture, recibirFixture, rechazarFixture, reciboFixture } from './recepcion.test-fixtures'

vi.mock('../../participacion/api/participacion.api', () => ({ verificarActorParticipacion: vi.fn() }))
vi.mock('../../participacion/api/participacion.transport', async importOriginal => ({
  ...await importOriginal<typeof import('../../participacion/api/participacion.transport')>(),
  requestPrivada: vi.fn(),
}))
const reply = (body: unknown, status = 200) => ({ status, body, token: 'bearer' })
beforeEach(() => {
  localStorage.clear()
  vi.mocked(verificarActorParticipacion).mockResolvedValue('bearer')
})

describe('API de recepción100', () => {
  it('recibe y rechaza por rutas distintas, con body cerrado y Bearer verificado', async () => {
    for (const intention of [recibirFixture(), rechazarFixture()]) {
      vi.mocked(requestPrivada).mockResolvedValueOnce(reply(reciboFixture(intention)))
      await RecepcionService.comando(intention, false)
      const [path, init, token] = vi.mocked(requestPrivada).mock.calls.at(-1)!
      expect(path).toBe(`/recepcion-semillas/${intention.recoleccion_id}/${intention.accion === 'RECIBIR' ? 'recibir-validar' : 'rechazar'}`)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(intention.entrada)
      expect(init?.headers).toBeUndefined()
      expect(token).toBe('bearer')
    }
  })
  it('recupera solo comando propio sin leer ficha ni exigir facultad operativa', async () => {
    const intention = rechazarFixture()
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply(reciboFixture(intention)))
    await RecepcionService.comando(intention, true)
    expect(verificarActorParticipacion).toHaveBeenCalledWith('7', undefined)
    expect(requestPrivada).toHaveBeenCalledTimes(1)
    expect(requestPrivada).toHaveBeenCalledWith(`/recepcion-semillas/comandos/${intention.entrada.comando_id}`, { signal: undefined }, 'bearer')
  })
  it('202 conserva un resultado inconcluso;403 durable se distingue del rechazo de ficha', async () => {
    const intention = rechazarFixture()
    const receipt = { comando_id: intention.entrada.comando_id, estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null }
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply(receipt, 202))
    expect((await RecepcionService.comando(intention, true)).estado).toBe('SIN_RESULTADO')
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply({ ...receipt, estado: 'RECHAZADO', error: { codigo: 'CAPACIDAD_INSUFICIENTE' }, finalizado_en: '2026-11-12T00:00:00Z' }, 403))
    expect((await RecepcionService.comando(intention, false)).estado).toBe('RECHAZADO')
  })
  it('rechaza respuestas HTTP incompatibles y503 aunque contenga un recibo aparente', async () => {
    const intention = recibirFixture()
    for (const status of [202, 403, 503]) {
      vi.mocked(requestPrivada).mockResolvedValueOnce(reply(reciboFixture(intention), status))
      await expect(RecepcionService.comando(intention, false)).rejects.toThrow()
    }
  })
  it('no acepta recibo confirmado con cantidad, fecha o acción cambiadas', async () => {
    const intention = recibirFixture()
    for (const mismatch of [{ cantidad_recibida: 99 }, { fecha_recepcion: '2026-11-11' }, { accion: 'RECHAZAR' }]) {
      const receipt = reciboFixture(intention)
      vi.mocked(requestPrivada).mockResolvedValueOnce(reply({ ...receipt, resultado: { ...receipt.resultado, ...mismatch } }))
      await expect(RecepcionService.comando(intention, false)).rejects.toThrow()
    }
  })
  it('lista con cursor exacto y valida el origen solicitado al leer el detalle', async () => {
    const detail = detalleFixture()
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply({ data: [origenFixture()], siguiente_antes_de_id: '9007199254740992' }))
    expect((await RecepcionService.cola('7', '9007199254740994')).siguiente_antes_de_id).toBe('9007199254740992')
    expect(requestPrivada).toHaveBeenLastCalledWith('/recepcion-semillas?antes_de_id=9007199254740994', { signal: undefined }, 'bearer')
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply(detail))
    await expect(RecepcionService.detalle('7', '9007199254740992')).rejects.toThrow('El detalle no corresponde')
  })
  it('sube fotos originales por multipart y valida IDs únicos y audiencia', async () => {
    const intention = recibirFixture()
    const photo = new File(['fotografía'], 'foto.jpg', { type: 'image/jpeg' })
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply({ evidencia_ids: ['9007199254740994'], audiencia: 'BUCKET_LEGADO_PUBLICO' }, 201))
    expect(await RecepcionService.fotos('7', intention.recoleccion_id, [photo])).toEqual(['9007199254740994'])
    const init = vi.mocked(requestPrivada).mock.calls.at(-1)![1]
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).getAll('fotos')).toEqual([photo])
    expect(init?.headers).toBeUndefined()
    vi.mocked(requestPrivada).mockResolvedValueOnce(reply({ evidencia_ids: ['2', '2'], audiencia: 'BUCKET_LEGADO_PUBLICO' }, 201))
    await expect(RecepcionService.fotos('7', intention.recoleccion_id, [photo, photo])).rejects.toThrow()
    await expect(RecepcionService.fotos('7', intention.recoleccion_id, [])).rejects.toThrow('entre 1 y 5')
  })
})

describe('conservación local de recepción', () => {
  it('rechaza actor distinto y protege el contenido de un pendiente', () => {
    const intention = guardarIntencionRecepcion(recibirFixture())
    expect(cargarIntencionRecepcion('7')).toEqual(intention)
    expect(Object.isFrozen(intention.entrada)).toBe(true)
    expect(() => guardarIntencionRecepcion(rechazarFixture())).toThrow('pendiente')
    localStorage.setItem(recepcionStoreKey('7'), JSON.stringify({ ...intention, actor_id: '8' }))
    expect(() => cargarIntencionRecepcion('7')).toThrow('cuenta original')
  })
  it('detecta el pendiente del flujo anterior sin convertirlo ni borrarlo', () => {
    const intention = recibirFixture()
    const legacy = { actor_id: intention.actor_id, recoleccion_id: intention.recoleccion_id, entrada: intention.entrada }
    const raw = JSON.stringify(legacy)
    localStorage.setItem(recepcionStoreKey('7'), raw)
    expect(() => cargarIntencionRecepcion('7')).toThrow('flujo anterior')
    expect(() => guardarIntencionRecepcion(recibirFixture())).toThrow('flujo anterior')
    expect(localStorage.getItem(recepcionStoreKey('7'))).toBe(raw)
  })
  it('bloquea escrituras si no se acredita persistencia local', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined)
    expect(() => guardarIntencionRecepcion(recibirFixture())).toThrow('no se ha enviado')
  })
})
