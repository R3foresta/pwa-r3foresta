import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionApiError } from '../api/participacion.api'
import { RegistroParticipacionService as Api } from '../api/registro.api'
import type { CargaRegistro, ReciboRegistro, RegistroIdentity } from '../registroTypes'
import { useRegistroCommand } from './useRegistroCommand'
import { indexedRegistrationStorage, listRegistrationDrafts, newRegistrationDraft, readRegistrationDraft, type RegistrationDraftRecord, type RegistrationStorage } from './registrationDraftStore'
import type { RegistroConfirmDraft } from './registrationCommandController'

const date = '2026-10-16T12:00:00Z'
const input: RegistroConfirmDraft = { plan_revision_esperada: '9007199254740993', fecha_plantacion: '2026-10-16', latitud: -16.5, longitud: -68.1, especies: [{ planta_id: '8', cantidad: 30 }], coresponsable_ids: ['9'], observaciones: 'Registro observado' }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
function copyRecord(record: RegistrationDraftRecord): RegistrationDraftRecord {
  return { ...record, draft: clone(record.draft), files: record.files.map((photo) => ({ ...photo, carga: photo.carga ? clone(photo.carga) : null })), payload: record.payload ? clone(record.payload) : null, terminal: record.terminal ? clone(record.terminal) : null }
}
class MemoryStorage implements RegistrationStorage {
  records = new Map<string, RegistrationDraftRecord>()
  fail = false
  async read(key: string) { const value = this.records.get(key); return value ? copyRecord(value) : null }
  async write(record: RegistrationDraftRecord) { if (this.fail) throw new Error('Cuota agotada'); this.records.set(record.key, copyRecord(record)) }
  async delete(key: string) { if (this.fail) throw new Error('Cuota agotada'); this.records.delete(key) }
  async list(actorId: string) { return [...this.records.values()].filter((record) => record.actor_id === actorId).map(copyRecord) }
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes }); return { promise, resolve } }
function uncertain(status = 0) { return new ParticipacionApiError(status, { codigo: status === 401 ? 'SESION_INVALIDA' : 'COMANDO_NO_CONFIRMADO', mensaje: 'Resultado inconcluso', campos: [], ambitos: [], reintento: status === 401 ? 'RECUPERAR_SESION' : 'MISMA_CLAVE' }) }
function receipt(identity: RegistroIdentity, error?: string): ReciboRegistro {
  const base = { comando_id: identity.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL' as const, finalizado_en: date }
  return error ? { ...base, estado: 'RECHAZADO', resultado: null, error: { codigo: error, mensaje: 'Revisa el registro antes de una nueva intención.', campos: [], ambitos: [identity.subcampania_id], reintento: 'NUEVA_CONFIRMACION' } } : { ...base, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'PLANTACION_INICIAL', registro_plantacion_id: '87', codigo_trazabilidad: 'PLT-87', subcampania_id: identity.subcampania_id, responsable_id: identity.actor_id, fecha_plantacion: identity.payload?.fecha_plantacion ?? input.fecha_plantacion, cantidad_total_plantada: 30, especies: [{ planta_id: '8', cantidad: 30 }], gps_dentro_poligono: true, gps_distancia_a_poligono_m: 0, revision_inicial: '0' } }
}
function carga(id: string, estado: CargaRegistro['estado'] = 'DISPONIBLE'): CargaRegistro { return { carga_id: id, estado, evidencia_id: estado === 'RESERVADA' ? null : '91', creado_en: date, expira_en: estado === 'VINCULADA' ? null : '2026-11-15T12:00:00Z' } }
function file() { return new File(['bytes privados exactos'], 'foto-campo.jpg', { type: 'image/jpeg', lastModified: 100 }) }
async function fileText(photo: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsText(photo) }) }
const originalLock = Object.getOwnPropertyDescriptor(navigator, 'locks')
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  let sequence = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`)
  const tails = new Map<string, Promise<unknown>>()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn((key: string, _options: unknown, callback: () => unknown) => {
    const result = (tails.get(key) ?? Promise.resolve()).then(callback); tails.set(key, result.catch(() => undefined)); return result
  }) } })
  vi.spyOn(Api, 'preparar').mockImplementation(async (identity) => ({ data: { comando_id: identity.comando_id, subcampania_id: identity.subcampania_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'PREPARADO' }, observado_en: date }))
  vi.spyOn(Api, 'recuperar').mockRejectedValue(uncertain(202))
  vi.spyOn(Api, 'listarCargas').mockResolvedValue({ data: [], observado_en: date })
  vi.spyOn(Api, 'subirCarga').mockImplementation(async (_identity, id) => ({ data: carga(id), observado_en: date }))
  vi.spyOn(Api, 'enviar').mockImplementation(async (identity) => receipt(identity))
  vi.spyOn(Api, 'cancelar').mockImplementation(async (identity) => receipt(identity, 'PREPARACION_CANCELADA'))
})
afterEach(() => { if (originalLock) Object.defineProperty(navigator, 'locks', originalLock); else Reflect.deleteProperty(navigator, 'locks') })
async function setup(actor = '7', scope = '11') {
  const hook = renderHook(() => useRegistroCommand(actor, scope, storage))
  await waitFor(() => expect(hook.result.current.state).toBe('draft'))
  return hook
}
async function capture() {
  const hook = await setup()
  const { plan_revision_esperada, ...draft } = input
  await act(() => hook.result.current.updateDraft({ ...draft, gps_confirmado: true, step: 3, plan_revision_revisada: plan_revision_esperada }))
  await act(() => hook.result.current.addFiles([file()]))
  await act(() => hook.result.current.upload())
  expect(hook.result.current.state).toBe('prepared')
  return hook
}

describe('captura persistida y preparación compartida', () => {
  it('sube diez fotos con un máximo de dos en vuelo y conserva cada resultado antes del siguiente par', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles(Array.from({ length: 10 }, file)))
    const gates: Array<ReturnType<typeof deferred<void>>> = []
    let inFlight = 0
    let peak = 0
    vi.mocked(Api.subirCarga).mockImplementation(async (_identity, id) => {
      inFlight += 1; peak = Math.max(peak, inFlight)
      const gate = deferred<void>(); gates.push(gate)
      await gate.promise
      inFlight -= 1
      return { data: carga(id), observado_en: date }
    })
    let uploading!: Promise<void>
    act(() => { uploading = hook.result.current.upload() })
    for (let batch = 0; batch < 5; batch += 1) {
      await waitFor(() => expect(gates).toHaveLength((batch + 1) * 2))
      expect(hook.result.current.files.filter((photo) => photo.carga?.estado === 'DISPONIBLE')).toHaveLength(batch * 2)
      await act(async () => { gates[batch * 2].resolve(); gates[batch * 2 + 1].resolve() })
    }
    await act(() => uploading)
    expect(peak).toBe(2)
    expect(hook.result.current.state).toBe('prepared')
    expect(hook.result.current.files.every((photo) => photo.carga?.estado === 'DISPONIBLE')).toBe(true)
    expect((await readRegistrationDraft('7', '11', storage))?.files).toHaveLength(10)
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('comprueba automáticamente una respuesta perdida sin repetir el PUT', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    const id = hook.result.current.files[0].carga_id
    vi.mocked(Api.subirCarga).mockRejectedValueOnce(uncertain())
    vi.mocked(Api.listarCargas).mockResolvedValueOnce({ data: [], observado_en: date }).mockResolvedValueOnce({ data: [carga(id)], observado_en: date })
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('prepared')
    expect(hook.result.current.files[0].error).toBeNull()
    expect(Api.subirCarga).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('conserva el éxito del segundo archivo cuando el primero falla y detiene el resto', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file(), file(), file()]))
    const ids = hook.result.current.files.map((photo) => photo.carga_id)
    vi.mocked(Api.subirCarga).mockRejectedValueOnce(uncertain()).mockImplementationOnce(async (_identity, id) => ({ data: carga(id), observado_en: date }))
    vi.mocked(Api.listarCargas).mockResolvedValueOnce({ data: [], observado_en: date }).mockResolvedValue({ data: [carga(ids[1])], observado_en: date })
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('prepared')
    expect(hook.result.current.files[1].carga?.estado).toBe('DISPONIBLE')
    expect(hook.result.current.files[0].error).toBeTruthy()
    expect(Api.subirCarga).toHaveBeenCalledTimes(2)
    await act(() => hook.result.current.recover())
    await act(() => hook.result.current.upload())
    expect(vi.mocked(Api.subirCarga).mock.calls.filter((call) => call[1] === ids[1])).toHaveLength(1)
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('persiste UUID de comando antes de preparar y UUID/bytes de cada foto antes de PUT', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    vi.mocked(Api.preparar).mockImplementationOnce(async (identity) => {
      expect((await readRegistrationDraft('7', '11', storage))?.comando_id).toBe(identity.comando_id)
      return { data: { ...identity, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'PREPARADO' }, observado_en: date }
    })
    vi.mocked(Api.subirCarga).mockImplementationOnce(async (_identity, id, photo) => {
      const stored = await readRegistrationDraft('7', '11', storage)
      expect(stored?.files[0].carga_id).toBe(id)
      expect(await fileText(stored!.files[0].file)).toBe(await fileText(photo))
      return { data: carga(id), observado_en: date }
    })
    await act(() => hook.result.current.upload())
    expect(Api.listarCargas).toHaveBeenCalledBefore(vi.mocked(Api.subirCarga))
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('serializa parches rápidos del borrador y conserva revisión explícita y paso al recargar', async () => {
    const hook = await setup()
    await act(async () => {
      await Promise.all([hook.result.current.updateDraft({ observaciones: 'A' }), hook.result.current.updateDraft({ observaciones: 'AB' }), hook.result.current.updateDraft({ observaciones: 'ABC', step: 3, plan_revision_revisada: '9' })])
    })
    hook.unmount()
    const next = await setup()
    expect(next.result.current.draft).toMatchObject({ observaciones: 'ABC', step: 3, plan_revision_revisada: '9' })
    expect(Api.recuperar).not.toHaveBeenCalled()
  })

  it('pérdida de preparación conserva UUID y recarga reanuda PREPARADO por GET202/listado', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    vi.mocked(Api.preparar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.prepare())
    const original = hook.result.current.pending!
    hook.unmount()
    const next = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(next.result.current.state).toBe('prepared'))
    expect(next.result.current.pending?.comando_id).toBe(original.comando_id)
    expect(await fileText(next.result.current.files[0].file)).toBe('bytes privados exactos')
    expect(Api.preparar).toHaveBeenCalledTimes(1)
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('recarga de captura local cuyo GET404 es inconcluso repara preparación con la misma clave', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    const original = hook.result.current.pending!.comando_id
    hook.unmount()
    vi.mocked(Api.recuperar).mockRejectedValueOnce(uncertain(404))
    const next = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(next.result.current.state).toBe('draft'))
    expect(next.result.current.error).toBeNull()
    await act(() => next.result.current.upload())
    expect(next.result.current.pending!.comando_id).toBe(original)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
    expect(Api.preparar).toHaveBeenCalledWith(expect.objectContaining({ comando_id: original }), expect.any(AbortSignal))
  })

  it('rehace con la misma clave una preparación ausente al listar cargas y conserva las fotos locales', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    await act(() => hook.result.current.prepare())
    const original = hook.result.current.pending!.comando_id
    vi.mocked(Api.listarCargas).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'No se encontró la preparación propia.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    await act(() => hook.result.current.recover())
    expect(hook.result.current.state).toBe('prepared')
    expect(hook.result.current.pending!.comando_id).toBe(original)
    expect(Api.preparar).toHaveBeenCalledTimes(2)
    expect(vi.mocked(Api.preparar).mock.calls[1][0].comando_id).toBe(original)
    await act(() => hook.result.current.upload())
    expect(hook.result.current.files[0].carga?.estado).toBe('DISPONIBLE')
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('pérdida de respuesta PUT se concilia por listado sin subir otra foto ni cambiar su UUID', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    const cargaId = hook.result.current.files[0].carga_id
    vi.mocked(Api.subirCarga).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('prepared')
    hook.unmount()
    vi.mocked(Api.listarCargas).mockResolvedValue({ data: [carga(cargaId)], observado_en: date })
    const next = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(next.result.current.state).toBe('prepared'))
    await act(() => next.result.current.upload())
    expect(next.result.current.files[0].carga?.evidencia_id).toBe('91')
    expect(Api.subirCarga).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('omitir una foto disponible conserva sus bytes hasta terminal y no la envía como evidencia', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file(), file()]))
    let evidence = 90
    vi.mocked(Api.subirCarga).mockImplementation(async (_identity, id) => ({ data: { ...carga(id), evidencia_id: String(++evidence) }, observado_en: date }))
    await act(() => hook.result.current.upload())
    const omit = hook.result.current.files[0].carga_id
    await act(() => hook.result.current.removeFile(omit))
    expect(hook.result.current.files).toHaveLength(1)
    expect((await readRegistrationDraft('7', '11', storage))?.files).toHaveLength(2)
    await act(() => hook.result.current.confirm(input))
    expect(vi.mocked(Api.enviar).mock.calls[0][0].payload.evidencia_ids).toEqual(['92'])
  })
})

describe('confirmación, incertidumbre y terminales', () => {
  it('congela payload completo antes del POST y reintenta exactamente sin nueva clave', async () => {
    const hook = await capture()
    const command = hook.result.current.pending!.comando_id
    vi.mocked(Api.enviar).mockImplementationOnce(async (identity) => {
      expect((await readRegistrationDraft('7', '11', storage))?.payload).toEqual(identity.payload)
      expect(Object.isFrozen(identity.payload)).toBe(true)
      throw uncertain()
    })
    await act(() => hook.result.current.confirm(input))
    const saved = (await readRegistrationDraft('7', '11', storage))!
    expect(hook.result.current.state).toBe('unconfirmed')
    await act(() => hook.result.current.updateDraft({ observaciones: 'No cambiar' }))
    await act(() => hook.result.current.confirm({ ...input, especies: [{ planta_id: '8', cantidad: 2 }] }))
    expect(Api.enviar).toHaveBeenCalledTimes(1)
    await act(() => hook.result.current.retrySame())
    expect(hook.result.current.state).toBe('confirmed')
    expect(vi.mocked(Api.enviar).mock.calls[1][0]).toMatchObject({ comando_id: command, payload: saved.payload })
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it.each([0, 202, 404, 500, 503])('reintento consulta GET %i antes de repetir el payload original con MISMA_CLAVE', async (status) => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    const original = hook.result.current.pending!
    vi.mocked(Api.recuperar).mockRejectedValueOnce(uncertain(status))
    await act(() => hook.result.current.retrySame())
    expect(Api.recuperar).toHaveBeenCalledWith(original, expect.any(AbortSignal))
    expect(vi.mocked(Api.recuperar).mock.invocationCallOrder.at(-1)).toBeLessThan(vi.mocked(Api.enviar).mock.invocationCallOrder.at(-1)!)
    expect(vi.mocked(Api.enviar).mock.calls[1][0]).toEqual(original)
    expect(hook.result.current.state).toBe('confirmed')
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it.each([undefined, 'REVISION_OBSOLETA'])('reintento recupera terminal %s sin repetir POST', async (rejection) => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    vi.mocked(Api.recuperar).mockResolvedValueOnce(receipt(hook.result.current.pending!, rejection))
    await act(() => hook.result.current.retrySame())
    expect(hook.result.current.state).toBe(rejection ? 'rejected' : 'confirmed')
    expect(Api.enviar).toHaveBeenCalledTimes(1)
  })

  it.each([401, 403])('no reenvía si la comprobación falla por sesión/permisos HTTP %i', async (status) => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    const original = await readRegistrationDraft('7', '11', storage)
    vi.mocked(Api.recuperar).mockRejectedValueOnce(uncertain(status))
    await act(() => hook.result.current.retrySame())
    expect(Api.enviar).toHaveBeenCalledTimes(1)
    expect((await readRegistrationDraft('7', '11', storage))?.payload).toEqual(original?.payload)
    expect(hook.result.current.files).toHaveLength(1)
    expect(hook.result.current.receipt).toBeNull()
  })

  it('un 404 de recurso no visible no autoriza repetir el envío', async () => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    vi.mocked(Api.recuperar).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'RECURSO_NO_VISIBLE', mensaje: 'No disponible.', campos: [], ambitos: [], reintento: 'NO_APLICA' }))
    await act(() => hook.result.current.retrySame())
    expect(Api.enviar).toHaveBeenCalledTimes(1)
    expect(hook.result.current.state).toBe('unconfirmed')
  })

  it.each([202, 404, 500])('GET %i después de POST final conserva payload y bytes sin volver a captura', async (status) => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    const original = await readRegistrationDraft('7', '11', storage)
    vi.mocked(Api.recuperar).mockRejectedValue(uncertain(status))
    await act(() => hook.result.current.recover())
    expect(hook.result.current.state).toBe('unconfirmed')
    expect((await readRegistrationDraft('7', '11', storage))?.payload).toEqual(original?.payload)
    expect(hook.result.current.files).toHaveLength(1)
    expect(Api.listarCargas).toHaveBeenCalledTimes(1)
    await act(() => hook.result.current.newIntent())
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  it('recarga posterior a commit perdido recupera comprobante sin POST ni contexto', async () => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    const original = hook.result.current.pending!
    hook.unmount()
    vi.mocked(Api.recuperar).mockResolvedValueOnce(receipt(original))
    const next = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(next.result.current.state).toBe('confirmed'))
    expect(next.result.current.receipt?.resultado?.registro_plantacion_id).toBe('87')
    expect(Api.enviar).toHaveBeenCalledTimes(1)
    expect(next.result.current.files).toHaveLength(0)
    expect((await readRegistrationDraft('7', '11', storage))?.terminal?.estado).toBe('CONFIRMADO')
  })

  it('rechazo durable503 permite revisión explícita preservando datos y bytes con nuevas identidades', async () => {
    const hook = await capture()
    const oldFile = hook.result.current.files[0]
    const oldCommand = hook.result.current.pending!.comando_id
    vi.mocked(Api.enviar).mockImplementationOnce(async (identity) => receipt(identity, 'EVALUADOR_NO_DISPONIBLE'))
    await act(() => hook.result.current.confirm(input))
    expect(hook.result.current.state).toBe('rejected')
    await act(() => hook.result.current.newIntent())
    expect(hook.result.current.state).toBe('draft')
    expect(hook.result.current.pending?.comando_id).not.toBe(oldCommand)
    expect(hook.result.current.files[0].carga_id).not.toBe(oldFile.carga_id)
    expect(hook.result.current.files[0].carga).toBeNull()
    expect(hook.result.current.draft).toMatchObject({ especies: input.especies, coresponsable_ids: ['9'], observaciones: input.observaciones, step: 2, plan_revision_revisada: null })
    expect(await fileText(hook.result.current.files[0].file)).toBe('bytes privados exactos')
  })

  it('la preparación que devuelve un terminal se muestra sin subir ni reabrir la clave', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    vi.mocked(Api.preparar).mockImplementationOnce(async (identity) => receipt(identity, 'PREPARACION_CANCELADA'))
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('rejected')
    expect(Api.subirCarga).not.toHaveBeenCalled()
    expect(Api.enviar).not.toHaveBeenCalled()
    expect(hook.result.current.files).toHaveLength(0)
  })

  it('fallo al persistir un terminal conserva comprobante y bytes, sin continuar cargas', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    vi.mocked(Api.preparar).mockImplementationOnce(async (identity) => { storage.fail = true; return receipt(identity, 'PREPARACION_CANCELADA') })
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('rejected')
    expect(hook.result.current.receipt?.error?.codigo).toBe('PREPARACION_CANCELADA')
    expect(hook.result.current.files).toHaveLength(1)
    expect(hook.result.current.error).toContain('Resultado confirmado por el servidor')
    expect(Api.subirCarga).not.toHaveBeenCalled()
    storage.fail = false
    vi.mocked(Api.recuperar).mockImplementationOnce(async (identity) => receipt(identity, 'PREPARACION_CANCELADA'))
    await act(() => hook.result.current.recover())
    expect(hook.result.current.files).toHaveLength(0)
  })

  it('cancelación con respuesta perdida conserva fotos y bloqueo hasta recuperar terminal especial', async () => {
    const hook = await capture()
    vi.mocked(Api.cancelar).mockRejectedValueOnce(uncertain())
    let cancelled = true
    await act(async () => { cancelled = await hook.result.current.cancel() })
    expect(cancelled).toBe(false)
    expect(hook.result.current.files).toHaveLength(1)
    expect((await readRegistrationDraft('7', '11', storage))?.cancelacion_solicitada).toBe(true)
    await act(() => hook.result.current.upload())
    expect(Api.subirCarga).toHaveBeenCalledTimes(1)
    vi.mocked(Api.recuperar).mockImplementationOnce(async (identity) => receipt(identity, 'PREPARACION_CANCELADA'))
    await act(() => hook.result.current.recover())
    expect(hook.result.current.receipt?.error?.codigo).toBe('PREPARACION_CANCELADA')
    expect(hook.result.current.files).toHaveLength(0)
  })

  it('un descarte pendiente con GET404 se reintenta con la misma clave y queda clausurado', async () => {
    const hook = await setup()
    await act(() => hook.result.current.addFiles([file()]))
    const original = hook.result.current.pending!.comando_id
    vi.mocked(Api.cancelar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.cancel())
    expect(hook.result.current.cancelRequested).toBe(true)
    hook.unmount()
    vi.mocked(Api.recuperar).mockRejectedValueOnce(uncertain(404))
    const resumed = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(resumed.result.current.state).toBe('unconfirmed'))
    expect(resumed.result.current.error).toContain('Aún no se confirmó el descarte')
    expect(await listRegistrationDrafts('7', storage)).toEqual([expect.objectContaining({ estado: 'DESCARTE_PENDIENTE' })])
    vi.mocked(Api.cancelar).mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'No se encontró la preparación propia.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    await act(() => resumed.result.current.cancel())
    expect(resumed.result.current.receipt?.error?.codigo).toBe('PREPARACION_CANCELADA')
    expect(resumed.result.current.pending?.comando_id).toBe(original)
    expect(vi.mocked(Api.preparar).mock.calls.at(-1)?.[0].comando_id).toBe(original)
    expect(await listRegistrationDrafts('7', storage)).toEqual([expect.objectContaining({ estado: 'DESCARTADO' })])
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('descartar una captura sin preparación elimina sus datos locales', async () => {
    const hook = await setup()
    await act(() => hook.result.current.updateDraft({ observaciones: 'No se enviará', latitud: -16.5, longitud: -68.1 }))
    let cancelled = false
    await act(async () => { cancelled = await hook.result.current.cancel() })
    expect(cancelled).toBe(true)
    expect((await readRegistrationDraft('7', '11', storage))?.draft).toEqual(newRegistrationDraft('7', '11').draft)
    expect(Api.cancelar).not.toHaveBeenCalled()
  })

  it('no elimina incertidumbre ni bytes al pasar30 días; sólo limpia tras terminal conciliado', async () => {
    const hook = await capture()
    vi.mocked(Api.enviar).mockRejectedValueOnce(uncertain())
    await act(() => hook.result.current.confirm(input))
    const original = storage.records.get('7:11')!
    original.creado_en = Date.now() - 31 * 24 * 60 * 60 * 1000
    await act(() => hook.result.current.recover())
    expect(hook.result.current.files).toHaveLength(1)
    vi.mocked(Api.recuperar).mockImplementationOnce(async (identity) => receipt(identity, 'REVISION_OBSOLETA'))
    await act(() => hook.result.current.recover())
    expect(hook.result.current.files).toHaveLength(0)
    expect(hook.result.current.pending?.comando_id).toBe(original.comando_id)
  })
})

describe('aislamiento, concurrencia y fallos locales', () => {
  it('StrictMode puede montar, desmontar y reactivar el controller antes de preparar/subir', async () => {
    const hook = renderHook(() => useRegistroCommand('7', '11', storage), { wrapper: StrictMode })
    await waitFor(() => expect(hook.result.current.state).toBe('draft'))
    await act(() => hook.result.current.updateDraft({ fecha_plantacion: '2026-10-16' }))
    await act(() => hook.result.current.addFiles([file()]))
    await act(() => hook.result.current.upload())
    expect(hook.result.current.state).toBe('prepared')
    expect(hook.result.current.busy).toBe(false)
    expect(Api.preparar).toHaveBeenCalledTimes(1)
    expect(Api.subirCarga).toHaveBeenCalledTimes(1)
  })
  it('lista borradores sólo de su actor sin datos de fotos o texto', async () => {
    const hook = await capture()
    expect(await listRegistrationDrafts('8', storage)).toEqual([])
    expect(await listRegistrationDrafts('7', storage)).toEqual([{ subcampania_id: '11', comando_id: hook.result.current.pending?.comando_id, actualizado_en: expect.any(Number), revision_local: expect.any(Number), estado: 'PREPARADO' }])
    expect(JSON.stringify(await listRegistrationDrafts('7', storage))).not.toContain('Registro observado')
  })

  it('cambiar cuenta oculta bytes/pendiente y descarta la respuesta antigua; volver a A recupera original', async () => {
    const first = await capture()
    const original = first.result.current.pending!
    first.unmount()
    const late = deferred<ReciboRegistro>()
    vi.mocked(Api.recuperar).mockReturnValueOnce(late.promise)
    const hook = renderHook(({ actor }) => useRegistroCommand(actor, '11', storage), { initialProps: { actor: '7' } })
    await waitFor(() => expect(Api.recuperar).toHaveBeenCalled())
    hook.rerender({ actor: '8' })
    expect(hook.result.current.files).toEqual([])
    expect(hook.result.current.pending).toBeNull()
    await waitFor(() => expect(hook.result.current.state).toBe('draft'))
    await act(async () => late.resolve(receipt(original)))
    expect(hook.result.current.receipt).toBeNull()
    expect((await readRegistrationDraft('7', '11', storage))?.files).toHaveLength(1)
    vi.mocked(Api.recuperar).mockRejectedValueOnce(uncertain(202))
    vi.mocked(Api.listarCargas).mockResolvedValueOnce({ data: [carga(first.result.current.files[0].carga_id)], observado_en: date })
    hook.rerender({ actor: '7' })
    await waitFor(() => expect(hook.result.current.state).toBe('prepared'))
    expect(hook.result.current.pending?.comando_id).toBe(original.comando_id)
  })

  it('cuota local bloquea preparación y POST final antes de red', async () => {
    const hook = await setup()
    storage.fail = true
    await act(() => hook.result.current.prepare())
    expect(Api.preparar).not.toHaveBeenCalled()
    expect(Api.enviar).not.toHaveBeenCalled()
    storage.fail = false
    await act(() => hook.result.current.recover())
    await act(() => hook.result.current.addFiles([file()]))
    await act(() => hook.result.current.upload())
    storage.fail = true
    await act(() => hook.result.current.confirm(input))
    expect(Api.enviar).not.toHaveBeenCalled()
    expect((await readRegistrationDraft('7', '11', storage))?.payload).toBeNull()
  })

  it('dos pestañas no sobrescriben borrador ni crean otra preparación del mismo ámbito', async () => {
    const first = await setup()
    const second = await setup()
    await act(() => first.result.current.updateDraft({ observaciones: 'Primera intención' }))
    await act(() => second.result.current.updateDraft({ observaciones: 'No sobrescribir' }))
    expect((await readRegistrationDraft('7', '11', storage))?.draft.observaciones).toBe('Primera intención')
    expect(second.result.current.error).toContain('otra pestaña')
    await act(async () => Promise.all([first.result.current.prepare(), second.result.current.prepare()]))
    expect(Api.preparar).toHaveBeenCalledTimes(1)
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1)
    expect((await readRegistrationDraft('7', '11', storage))?.draft.observaciones).toBe('Primera intención')
  })

  it('un conflicto entre pestañas bloquea también los parches ya encolados hasta recuperar explícitamente', async () => {
    const first = await setup()
    const second = await setup()
    await act(() => first.result.current.updateDraft({ observaciones: 'Propuesta de A' }))
    await act(async () => {
      await Promise.all([second.result.current.updateDraft({ observaciones: 'B' }), second.result.current.updateDraft({ observaciones: 'B segundo parche' })])
    })
    expect((await readRegistrationDraft('7', '11', storage))?.draft.observaciones).toBe('Propuesta de A')
    await act(() => second.result.current.updateDraft({ observaciones: 'B sin conciliar' }))
    expect((await readRegistrationDraft('7', '11', storage))?.draft.observaciones).toBe('Propuesta de A')
    await act(() => second.result.current.recover())
    expect(second.result.current.draft.observaciones).toBe('Propuesta de A')
    await act(() => second.result.current.updateDraft({ observaciones: 'B revisó explícitamente' }))
    expect((await readRegistrationDraft('7', '11', storage))?.draft.observaciones).toBe('B revisó explícitamente')
  })

  it('sin IndexedDB el adaptador real bloquea y no contacta servidor', async () => {
    const hook = renderHook(() => useRegistroCommand('7', '11'))
    await waitFor(() => expect(hook.result.current.state).toBe('unconfirmed'))
    expect(Api.preparar).not.toHaveBeenCalled()
    expect(Api.enviar).not.toHaveBeenCalled()
  })

  it('un fallo síncrono al abrir IndexedDB permite comprobar otra vez el almacenamiento', async () => {
    const open = vi.fn().mockImplementation(() => { throw new DOMException('Almacenamiento denegado', 'SecurityError') })
    vi.stubGlobal('indexedDB', { open })
    await expect(indexedRegistrationStorage.read('7:11')).rejects.toThrow()
    await expect(indexedRegistrationStorage.read('7:11')).rejects.toThrow()
    expect(open).toHaveBeenCalledTimes(2)
    expect(Api.preparar).not.toHaveBeenCalled()
  })

  it.each([
    { especies: [null] },
    { especies: [{ planta_id: '8', cantidad: '30' }] },
    { coresponsable_ids: [9] },
    { step: '2' },
    { plan_revision_revisada: '01' },
  ])('bloquea un borrador privado dañado antes de exponerlo o consultar el servidor: %j', async (invalid) => {
    const record = newRegistrationDraft('7', '11')
    storage.records.set('7:11', { ...record, draft: { ...record.draft, ...invalid } } as unknown as RegistrationDraftRecord)
    const hook = renderHook(() => useRegistroCommand('7', '11', storage))
    await waitFor(() => expect(hook.result.current.state).toBe('unconfirmed'))
    expect(hook.result.current.files).toEqual([])
    expect(Api.recuperar).not.toHaveBeenCalled()
    expect(Api.preparar).not.toHaveBeenCalled()
    expect(Api.enviar).not.toHaveBeenCalled()
  })
})
