import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IncorporacionApi, IncorporacionApiError } from './incorporacion.api'
import type { FotosPendientes, IncorporacionBase, IncorporacionPayload, IncorporacionRecibo, IncorporacionResultado } from './incorporacion.contract'
import type { IncorporacionStorage, IntentoIncorporacion } from './incorporacion.store'
import { IncorporacionController } from './useIncorporacionCommand'

const ACTOR = '7'
const UUID = '2d21a83e-0f03-4c4f-89cb-bac7978977c2'
const TOKEN = 'synthetic-token-t5'
const EVIDENCE = '9007199254740993'
const BASE: IncorporacionBase = {
  vivero_id: '9007199254740992', planta_id: '9007199254740993',
  modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', fecha_evento: '2026-11-15', cantidad: 210,
  observaciones: 'Conteo sintético; historia anterior no registrada.',
}
const LABELS = { vivero: 'Vivero sintético', planta: 'Especie sintética', responsable: 'Responsable sintético' }
const photo = new File(['bytes originales sintéticos'], 'conteo.jpg', { type: 'image/jpeg' })
const NOT_FOUND: IncorporacionResultado = { success: true, estado: 'SIN_RESULTADO', resultado_concluyente: false }
const PENDING: FotosPendientes = {
  success: true, evidencia_ids: [EVIDENCE], data: [{
    id: EVIDENCE, bucket: 'vivero_incorporaciones', ruta_archivo: 'sintetico/conteo.jpg',
    signed_url: 'https://storage.example.test/signed/sintetico', url_expira_en_segundos: 300,
    mime_type: 'image/jpeg',
  }],
}
const EMPTY_PHOTOS: FotosPendientes = { success: true, evidencia_ids: [], data: [] }
const uncertain = () => new IncorporacionApiError(503, false, 'Resultado sintético no determinado; consulta la misma solicitud.')
function receipt(input: IncorporacionPayload): IncorporacionRecibo {
  return {
    success: true, estado: 'CONFIRMADO', data: {
      ...input,
      lote_vivero_id: '9007199254740994', evento_incorporacion_id: '9007199254740995', codigo_trazabilidad: 'VIV-INC-SINTETICO',
      tercero_origen: input.tercero_origen ?? null, referencia_documental: input.referencia_documental ?? null, observaciones: input.observaciones ?? null,
      saldo_vivo_antes: 0, saldo_vivo_despues: input.cantidad, evidencia_ids_vinculadas: [...input.evidencia_ids],
      nombre_cientifico_snapshot: 'Científico sintético', nombre_comercial_snapshot: 'Comercial sintético',
      variedad_snapshot: null, nombre_responsable_snapshot: 'Responsable sintético', registrado_en: '2026-11-15T15:00:00.000Z',
    },
  }
}
function record(fase: IntentoIncorporacion['fase'] = 'LISTO_PARA_CONFIRMAR', actor = ACTOR): IntentoIncorporacion {
  return {
    version: 1, actor_id: actor, solicitud_id: UUID, base: { ...BASE }, labels: { ...LABELS }, files: [photo],
    evidencia_ids: fase === 'FOTOS_POR_CARGAR' || fase === 'FOTOS_POR_CONSULTAR' ? [] : [EVIDENCE],
    fase, recibo: null, revision: 3,
  }
}
function clone(value: IntentoIncorporacion): IntentoIncorporacion {
  return { ...value, base: { ...value.base }, labels: { ...value.labels }, files: [...value.files], evidencia_ids: [...value.evidencia_ids] }
}
function memoryStorage(initial?: IntentoIncorporacion) {
  const records = new Map<string, IntentoIncorporacion>()
  if (initial) records.set(initial.actor_id, clone(initial))
  const storage: IncorporacionStorage = {
    read: vi.fn(async actor => records.has(actor) ? clone(records.get(actor)!) : null),
    write: vi.fn(async value => { records.set(value.actor_id, clone(value)) }),
    delete: vi.fn(async actor => { records.delete(actor) }),
  }
  return { storage, records }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(accept => { resolve = accept })
  return { promise, resolve }
}
const cleanups: Array<() => void> = []
async function start(storage: IncorporacionStorage, admin = true, actor = ACTOR, token = TOKEN) {
  const controller = new IncorporacionController(actor, token, admin, storage)
  const stop = controller.start()
  cleanups.push(stop)
  await waitFor(() => expect(controller.getSnapshot().busy).toBeNull())
  return { controller, stop }
}
const lockDescriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-15T16:00:00Z'))
  localStorage.setItem('authToken', TOKEN)
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(UUID)
  vi.spyOn(IncorporacionApi, 'subir').mockResolvedValue(PENDING)
  vi.spyOn(IncorporacionApi, 'pendientes').mockResolvedValue(PENDING)
  vi.spyOn(IncorporacionApi, 'recuperar').mockResolvedValue(NOT_FOUND)
  vi.spyOn(IncorporacionApi, 'confirmar').mockImplementation(async (_actor, input) => receipt(input))
  const tails = new Map<string, Promise<unknown>>()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request: vi.fn((key: string, _options: unknown, callback: () => unknown) => {
      const result = (tails.get(key) ?? Promise.resolve()).then(callback)
      tails.set(key, result.catch(() => undefined))
      return result
    }),
  } })
})
afterEach(() => {
  vi.useRealTimers()
  cleanups.splice(0).forEach(stop => stop())
  if (lockDescriptor) Object.defineProperty(navigator, 'locks', lockDescriptor)
  else Reflect.deleteProperty(navigator, 'locks')
})

describe('intento durable de incorporación', () => {
  it('conserva UUID, intención y bytes antes del upload, e IDs exactos antes del POST', async () => {
    const { storage, records } = memoryStorage()
    vi.mocked(IncorporacionApi.subir).mockImplementation(async (actor, id, viveroId, files) => {
      const saved = records.get(actor)!
      expect(saved).toMatchObject({ actor_id: ACTOR, solicitud_id: UUID, fase: 'FOTOS_POR_CONSULTAR', base: BASE, evidencia_ids: [] })
      expect(saved.files[0]).toBe(photo)
      expect(saved.files[0].size).toBe(photo.size)
      expect([id, viveroId]).toEqual([UUID, BASE.vivero_id])
      expect(files[0]).toBe(photo)
      return PENDING
    })
    vi.mocked(IncorporacionApi.confirmar).mockImplementation(async (actor, input) => {
      expect(records.get(actor)).toMatchObject({ solicitud_id: UUID, base: BASE, evidencia_ids: [EVIDENCE], fase: 'ALTA_POR_CONSULTAR' })
      expect(input).toEqual({ ...BASE, solicitud_id: UUID, evidencia_ids: [EVIDENCE] })
      return receipt(input)
    })
    const { controller } = await start(storage)
    await controller.preparar(BASE, LABELS, [photo])
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    await controller.confirmar()
    expect(controller.getSnapshot().receipt?.data.lote_vivero_id).toBe('9007199254740994')
    expect(records.get(ACTOR)?.fase).toBe('CONFIRMADO')
    expect(JSON.stringify(records.get(ACTOR))).not.toContain(TOKEN)
    expect(JSON.stringify(records.get(ACTOR))).not.toContain('signed_url')
    expect(crypto.randomUUID).toHaveBeenCalledOnce()
  })
  it('una falla de persistencia previa impide cualquier upload o alta', async () => {
    const { storage, records } = memoryStorage()
    vi.mocked(storage.write).mockRejectedValue(new Error('Cuota de almacenamiento sintética'))
    const { controller } = await start(storage)
    await controller.preparar(BASE, LABELS, [photo])
    expect(controller.getSnapshot().error).toBeTruthy()
    expect(records.size).toBe(0)
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
  })
  it('no envía el alta si no puede guardar su fase y referencias finales', async () => {
    const { storage, records } = memoryStorage(record())
    vi.mocked(storage.write).mockImplementation(async value => {
      if (value.fase === 'ALTA_POR_CONSULTAR') throw new Error('Almacenamiento final no disponible')
      records.set(value.actor_id, clone(value))
    })
    const { controller } = await start(storage)
    await controller.confirmar()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(records.get(ACTOR)).toMatchObject({ fase: 'LISTO_PARA_CONFIRMAR', solicitud_id: UUID, evidencia_ids: [EVIDENCE] })
  })
  it('recupera un upload incierto tras recarga consultando recibo y pendientes, sin otra subida automática', async () => {
    const { storage, records } = memoryStorage()
    vi.mocked(IncorporacionApi.subir).mockRejectedValueOnce(uncertain())
    const first = await start(storage)
    await first.controller.preparar(BASE, LABELS, [photo])
    expect(records.get(ACTOR)).toMatchObject({ fase: 'FOTOS_POR_CONSULTAR', solicitud_id: UUID, evidencia_ids: [] })
    first.stop()
    const { controller } = await start(storage)
    expect(IncorporacionApi.recuperar).not.toHaveBeenCalled()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    const order: string[] = []
    vi.mocked(IncorporacionApi.recuperar).mockImplementation(async () => { order.push('recibo'); return NOT_FOUND })
    vi.mocked(IncorporacionApi.pendientes).mockImplementation(async () => { order.push('pendientes'); return PENDING })
    await controller.recuperar()
    expect(order).toEqual(['recibo', 'pendientes'])
    expect(records.get(ACTOR)).toMatchObject({ fase: 'LISTO_PARA_CONFIRMAR', solicitud_id: UUID, evidencia_ids: [EVIDENCE] })
    expect(IncorporacionApi.subir).toHaveBeenCalledOnce()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(controller.getSnapshot().photos[0].signed_url).toContain('/signed/')
    expect(JSON.stringify(records.get(ACTOR))).not.toContain('/signed/')
  })
  it('una consulta vacía de fotos no confirma rollback ni repite la carga hasta decisión explícita', async () => {
    const { storage, records } = memoryStorage(record('FOTOS_POR_CONSULTAR'))
    vi.mocked(IncorporacionApi.pendientes).mockResolvedValue(EMPTY_PHOTOS)
    const { controller } = await start(storage)
    await controller.recuperar()
    expect(controller.getSnapshot().canRepeatPhotos).toBe(true)
    expect(controller.getSnapshot().error).toContain('no acredita')
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
    expect(records.get(ACTOR)?.solicitud_id).toBe(UUID)
    await controller.repetirFotos()
    expect(IncorporacionApi.recuperar).toHaveBeenCalledTimes(2)
    expect(IncorporacionApi.pendientes).toHaveBeenCalledTimes(2)
    expect(IncorporacionApi.subir).toHaveBeenCalledWith(ACTOR, UUID, BASE.vivero_id, [photo], expect.any(AbortSignal))
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(crypto.randomUUID).not.toHaveBeenCalled()
  })
  it('ante alta incierta exige consulta y reenvío explícito del mismo UUID, cuerpo e IDs', async () => {
    const { storage, records } = memoryStorage()
    const { controller } = await start(storage)
    await controller.preparar(BASE, LABELS, [photo])
    vi.mocked(IncorporacionApi.confirmar).mockRejectedValueOnce(uncertain())
    await controller.confirmar()
    const original = vi.mocked(IncorporacionApi.confirmar).mock.calls[0][1]
    expect(records.get(ACTOR)).toMatchObject({ fase: 'ALTA_POR_CONSULTAR', solicitud_id: UUID, evidencia_ids: [EVIDENCE] })
    expect(controller.getSnapshot().canReplay).toBe(false)
    await controller.confirmar()
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
    await controller.recuperar()
    expect(controller.getSnapshot().canReplay).toBe(true)
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
    await controller.confirmar()
    expect(vi.mocked(IncorporacionApi.confirmar).mock.calls.map(([, input]) => input)).toEqual([original, original])
    expect(IncorporacionApi.recuperar).toHaveBeenCalledTimes(2)
    expect(IncorporacionApi.subir).toHaveBeenCalledOnce()
    expect(crypto.randomUUID).toHaveBeenCalledOnce()
    expect(controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
  })
  it('recupera el éxito si se perdió la respuesta después del commit, sin volver a crear ni leer pendientes', async () => {
    const { storage } = memoryStorage(record('ALTA_POR_CONSULTAR'))
    vi.mocked(IncorporacionApi.recuperar).mockResolvedValueOnce(receipt({ ...BASE, solicitud_id: UUID, evidencia_ids: [EVIDENCE] }))
    const { controller } = await start(storage)
    await controller.recuperar()
    expect(controller.getSnapshot().receipt?.data.saldo_vivo_despues).toBe(210)
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(IncorporacionApi.pendientes).not.toHaveBeenCalled()
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
  })
  it('conserva el éxito remoto aunque falle la guarda local posterior', async () => {
    const { storage, records } = memoryStorage(record())
    vi.mocked(storage.write).mockImplementation(async value => {
      if (value.fase === 'CONFIRMADO') throw new Error('Fallo local posterior al éxito')
      records.set(value.actor_id, clone(value))
    })
    const { controller } = await start(storage)
    await controller.confirmar()
    expect(controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
    expect(controller.getSnapshot().rejected).toBe(false)
    expect(controller.getSnapshot().error).toBeTruthy()
    expect(records.get(ACTOR)?.fase).toBe('ALTA_POR_CONSULTAR')
    await controller.load()
    expect(controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
  })
  it('una preparación que envejece fuera de ventana no llega al POST ni se marca como alta incierta', async () => {
    const { storage, records } = memoryStorage(record())
    const { controller } = await start(storage)
    vi.setSystemTime(new Date('2026-12-15T16:00:00Z'))
    await controller.confirmar()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(records.get(ACTOR)?.fase).toBe('LISTO_PARA_CONFIRMAR')
    expect(controller.getSnapshot().error).toContain('fuera de la ventana')
  })
  it('sin Web Locks bloquea efectos nuevos pero permite consultar un éxito propio', async () => {
    const { storage } = memoryStorage(record('ALTA_POR_CONSULTAR'))
    Reflect.deleteProperty(navigator, 'locks')
    vi.mocked(IncorporacionApi.recuperar).mockResolvedValueOnce(receipt({ ...BASE, solicitud_id: UUID, evidencia_ids: [EVIDENCE] }))
    const { controller } = await start(storage, false)
    await controller.recuperar()
    expect(controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
    expect(storage.write).not.toHaveBeenCalled()
    expect(controller.getSnapshot().canReplay).toBe(false)
  })
  it('recuperar lo propio no necesita ADMIN y otra cuenta no recibe su intento', async () => {
    const { storage, records } = memoryStorage(record('ALTA_POR_CONSULTAR'))
    vi.mocked(IncorporacionApi.recuperar).mockResolvedValueOnce(receipt({ ...BASE, solicitud_id: UUID, evidencia_ids: [EVIDENCE] }))
    const original = await start(storage, false)
    await original.controller.recuperar()
    expect(original.controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
    expect(IncorporacionApi.recuperar).toHaveBeenCalledWith(ACTOR, UUID, expect.any(AbortSignal))
    expect(IncorporacionApi.pendientes).not.toHaveBeenCalled()
    expect(IncorporacionApi.subir).not.toHaveBeenCalled()
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
    original.stop()
    const other = await start(storage, false, '8')
    expect(other.controller.getSnapshot().attempt).toBeNull()
    expect(other.controller.getSnapshot().receipt).toBeNull()
    expect(records.get(ACTOR)?.recibo?.estado).toBe('CONFIRMADO')
  })
})

describe('aislamiento de la sesión y concurrencia T5', () => {
  it.each(['token', 'desmontaje'] as const)('una respuesta tardía de upload al cambiar %s no prepara ni envía el alta', async change => {
    const { storage, records } = memoryStorage()
    const upload = deferred<FotosPendientes>()
    vi.mocked(IncorporacionApi.subir).mockReturnValueOnce(upload.promise)
    const { controller, stop } = await start(storage)
    const preparing = controller.preparar(BASE, LABELS, [photo])
    await waitFor(() => expect(IncorporacionApi.subir).toHaveBeenCalledOnce())
    const signal = vi.mocked(IncorporacionApi.subir).mock.calls[0][4]!
    if (change === 'token') localStorage.setItem('authToken', 'synthetic-new-account-token')
    else { stop(); expect(signal.aborted).toBe(true) }
    upload.resolve(PENDING)
    await preparing
    expect(records.get(ACTOR)).toMatchObject({ fase: 'FOTOS_POR_CONSULTAR', solicitud_id: UUID, evidencia_ids: [] })
    expect(controller.getSnapshot().photos).toEqual([])
    expect(IncorporacionApi.confirmar).not.toHaveBeenCalled()
  })
  it('dos pestañas y un doble clic preparan una sola intención y confirman una sola alta', async () => {
    const { storage } = memoryStorage()
    const upload = deferred<FotosPendientes>()
    vi.mocked(IncorporacionApi.subir).mockReturnValueOnce(upload.promise)
    const first = await start(storage)
    const second = await start(storage)
    const prepareFirst = first.controller.preparar(BASE, LABELS, [photo])
    const doubleClick = first.controller.preparar(BASE, LABELS, [photo])
    const prepareSecond = second.controller.preparar(BASE, LABELS, [photo])
    await waitFor(() => expect(IncorporacionApi.subir).toHaveBeenCalledOnce())
    upload.resolve(PENDING)
    await Promise.all([prepareFirst, doubleClick, prepareSecond])
    expect(IncorporacionApi.subir).toHaveBeenCalledOnce()
    expect(crypto.randomUUID).toHaveBeenCalledOnce()
    expect(second.controller.getSnapshot().attempt?.solicitud_id).toBe(UUID)
    const post = deferred<IncorporacionRecibo>()
    vi.mocked(IncorporacionApi.confirmar).mockReturnValueOnce(post.promise)
    const confirmFirst = first.controller.confirmar()
    const confirmSecond = second.controller.confirmar()
    await waitFor(() => expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce())
    post.resolve(receipt({ ...BASE, solicitud_id: UUID, evidencia_ids: [EVIDENCE] }))
    await Promise.all([confirmFirst, confirmSecond])
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
    expect(first.controller.getSnapshot().receipt?.estado).toBe('CONFIRMADO')
  })
  it.each([
    { status: 400, concluyente: true, rejected: true },
    { status: 503, concluyente: false, rejected: false },
    { status: 409, concluyente: false, rejected: false },
  ])('distingue HTTP $status sin liberar la solicitud ni cambiar referencias después del posible POST', async ({ status, concluyente, rejected }) => {
    const { storage, records } = memoryStorage(record())
    const { controller } = await start(storage)
    vi.mocked(IncorporacionApi.confirmar).mockRejectedValueOnce(new IncorporacionApiError(status, concluyente, 'Error sintético'))
    await controller.confirmar()
    expect(controller.getSnapshot().rejected).toBe(rejected)
    expect(records.get(ACTOR)).toMatchObject({ fase: 'ALTA_POR_CONSULTAR', solicitud_id: UUID, evidencia_ids: [EVIDENCE], base: BASE })
    await controller.descartar()
    expect(records.get(ACTOR)).toMatchObject({ fase: 'ALTA_POR_CONSULTAR', solicitud_id: UUID, evidencia_ids: [EVIDENCE] })
    expect(storage.delete).not.toHaveBeenCalled()
    expect(crypto.randomUUID).not.toHaveBeenCalled()
    expect(IncorporacionApi.confirmar).toHaveBeenCalledOnce()
  })
})
