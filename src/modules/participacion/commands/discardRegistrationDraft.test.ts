import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionApiError } from '../api/participacion.api'
import { available, capture, comandoId, prepared, receipt } from '../api/registro.test-fixtures'
import type { PreparacionRegistroLectura, ReciboRegistro, RegistroIdentity } from '../registroTypes'
import { discardRegistrationDraft } from './discardRegistrationDraft'
import { listRegistrationDrafts, newRegistrationDraft, readRegistrationDraft, saveRegistrationDraft, type RegistrationDraftRecord, type RegistrationStorage } from './registrationDraftStore'

class MemoryStorage implements RegistrationStorage {
  records = new Map<string, RegistrationDraftRecord>()
  failDelete = false
  async read(key: string) { return this.records.get(key) ?? null }
  async write(record: RegistrationDraftRecord) { this.records.set(record.key, record) }
  async delete(key: string) { if (this.failDelete) throw new Error('Cuota agotada'); this.records.delete(key) }
  async list(actorId: string) { return [...this.records.values()].filter(record => record.actor_id === actorId) }
}

const cancelled: ReciboRegistro = {
  comando_id: comandoId, operacion: 'REGISTRAR_PLANTACION_INICIAL', finalizado_en: receipt.finalizado_en,
  estado: 'RECHAZADO', resultado: null,
  error: { codigo: 'PREPARACION_CANCELADA', mensaje: 'Preparación descartada', campos: [], ambitos: ['821'], reintento: 'NUEVA_CONFIRMACION' },
}
const uncertain = () => new ParticipacionApiError(202, { codigo: 'COMANDO_NO_CONFIRMADO', mensaje: 'Resultado pendiente', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' })
let storage: MemoryStorage
let api: { cancelar: ReturnType<typeof vi.fn<(identity: RegistroIdentity) => Promise<ReciboRegistro>>>; preparar: ReturnType<typeof vi.fn<(identity: RegistroIdentity) => Promise<PreparacionRegistroLectura>>> }
const originalLock = Object.getOwnPropertyDescriptor(navigator, 'locks')

beforeEach(() => {
  storage = new MemoryStorage()
  api = { cancelar: vi.fn(async () => cancelled), preparar: vi.fn(async () => ({ ...prepared, data: { ...prepared.data, operacion: 'REGISTRAR_PLANTACION_INICIAL' as const, estado: 'PREPARADO' as const } })) }
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key: string, _options: unknown, callback: () => Promise<unknown>) => callback() } })
})

async function storedDraft(withCommand: boolean) {
  const base = newRegistrationDraft('801', '821')
  const file = new File(['foto privada'], 'plantacion.jpg', { type: 'image/jpeg' })
  return saveRegistrationDraft({ ...base, comando_id: withCommand ? comandoId : null, preparado: withCommand, draft: { ...base.draft, observaciones: 'Texto privado' }, files: withCommand ? [{ carga_id: available.data.carga_id, file, carga: { ...available.data, estado: 'DISPONIBLE' as const }, error: null, omitted: false }] : [] }, storage)
}
async function summary() { return (await listRegistrationDrafts('801', storage))[0] }

describe('eliminación segura de capturas', () => {
  it('borra campos locales sin llamar al servidor si no existe preparación', async () => {
    await storedDraft(false)
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('LOCAL')
    expect(await readRegistrationDraft('801', '821', storage)).toBeNull()
    expect(api.cancelar).not.toHaveBeenCalled()
  })

  it('clausura la misma preparación antes de borrar foto y datos locales', async () => {
    await storedDraft(true)
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('REMOTE')
    expect(api.cancelar).toHaveBeenCalledExactlyOnceWith(capture, undefined)
    expect(api.preparar).not.toHaveBeenCalled()
    expect(await readRegistrationDraft('801', '821', storage)).toBeNull()
  })

  it('conserva la foto y la clave ante respuesta incierta y permite reintentar el mismo descarte', async () => {
    await storedDraft(true)
    api.cancelar.mockRejectedValueOnce(uncertain())
    await expect(discardRegistrationDraft('801', '821', await summary(), { storage, api })).rejects.toThrow()
    const pending = await readRegistrationDraft('801', '821', storage)
    expect(pending?.cancelacion_solicitada).toBe(true)
    expect(pending?.files).toHaveLength(1)
    expect(pending?.comando_id).toBe(comandoId)
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('REMOTE')
    expect(api.cancelar).toHaveBeenCalledTimes(2)
    expect(await readRegistrationDraft('801', '821', storage)).toBeNull()
  })

  it('si la preparación no llegó al servidor, prepara y descarta la misma clave', async () => {
    await storedDraft(true)
    api.cancelar.mockRejectedValueOnce(new ParticipacionApiError(404, { codigo: 'COMANDO_NO_ENCONTRADO', mensaje: 'Preparación no encontrada', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' }))
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('REMOTE')
    expect(api.preparar).toHaveBeenCalledExactlyOnceWith(capture, undefined)
    expect(api.cancelar).toHaveBeenCalledTimes(2)
    expect(api.cancelar.mock.calls.every(call => call[0].comando_id === comandoId)).toBe(true)
  })

  it('elimina una propuesta ya rechazada después de pedir limpieza de sus fotos al servidor', async () => {
    const record = await storedDraft(true)
    const rejected: ReciboRegistro = { ...cancelled, error: { ...cancelled.error, codigo: 'REVISION_OBSOLETA' } }
    await saveRegistrationDraft({ ...record, terminal: rejected }, storage)
    api.cancelar.mockResolvedValueOnce(rejected)
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('REMOTE')
    expect(api.cancelar).toHaveBeenCalledExactlyOnceWith(capture, undefined)
    expect(await readRegistrationDraft('801', '821', storage)).toBeNull()
  })

  it('bloquea un envío final sin resultado y conserva sus archivos', async () => {
    const record = await storedDraft(true)
    await saveRegistrationDraft({ ...record, payload: { comando_id: comandoId, subcampania_id: '821', plan_revision_esperada: '0', fecha_plantacion: '2026-10-15', latitud: -16.5, longitud: -68.1, especies: [{ planta_id: '8', cantidad: 1 }], coresponsable_ids: [], evidencia_ids: ['62'], observaciones: null } }, storage)
    await expect(discardRegistrationDraft('801', '821', await summary(), { storage, api })).rejects.toThrow(/Comprueba el resultado/)
    expect((await readRegistrationDraft('801', '821', storage))?.files).toHaveLength(1)
    expect(api.cancelar).not.toHaveBeenCalled()
  })

  it('no borra un registro si el servidor confirma la plantación mientras se descarta', async () => {
    await storedDraft(true)
    api.cancelar.mockResolvedValueOnce(receipt)
    await expect(discardRegistrationDraft('801', '821', await summary(), { storage, api })).rejects.toThrow(/confirmó esta plantación/)
    expect((await readRegistrationDraft('801', '821', storage))?.terminal?.estado).toBe('CONFIRMADO')
  })

  it('no borra una versión distinta de la que confirmó la persona', async () => {
    const first = await storedDraft(true)
    const stale = await summary()
    await saveRegistrationDraft({ ...first, draft: { ...first.draft, observaciones: 'Cambio en otra pestaña' } }, storage)
    await expect(discardRegistrationDraft('801', '821', stale, { storage, api })).rejects.toThrow(/cambió en otra pestaña/)
    expect(api.cancelar).not.toHaveBeenCalled()
    expect((await readRegistrationDraft('801', '821', storage))?.draft.observaciones).toBe('Cambio en otra pestaña')
  })

  it('conserva los datos si falla la limpieza local después del descarte remoto', async () => {
    await storedDraft(true)
    storage.failDelete = true
    await expect(discardRegistrationDraft('801', '821', await summary(), { storage, api })).rejects.toThrow(/limpieza local/)
    expect((await readRegistrationDraft('801', '821', storage))?.files).toHaveLength(1)
    storage.failDelete = false
    expect(await discardRegistrationDraft('801', '821', await summary(), { storage, api })).toBe('REMOTE')
    expect(await readRegistrationDraft('801', '821', storage)).toBeNull()
  })
})

afterEach(() => { if (originalLock) Object.defineProperty(navigator, 'locks', originalLock); else Reflect.deleteProperty(navigator, 'locks') })
