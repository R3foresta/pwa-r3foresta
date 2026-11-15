import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarIntento, leerIntento, liberarConfirmado, descartarPreparacion, type IntentoIncorporacion, type IncorporacionStorage } from './incorporacion.store'
import { validarRecibo } from './incorporacion.contract'

const actor = '9007199254740993', solicitud = 'b4c905c9-34aa-41dc-b232-fb327ceafc69'
const file = new File(['original'], 'original.heic', { type: 'image/heic', lastModified: 1234 })
function attempt(): IntentoIncorporacion {
  return { version: 1, actor_id: actor, solicitud_id: solicitud, base: { vivero_id: '9007199254740992', planta_id: '9007199254740993', cantidad: 1, fecha_evento: '2026-11-15', modalidad: 'SALDO_INICIAL', procedencia: 'DONACION' }, labels: { vivero: 'Vivero sintético', planta: 'Especie sintética', responsable: 'Responsable sintético' }, files: [file], evidencia_ids: [], fase: 'FOTOS_POR_CARGAR', recibo: null, revision: 0 }
}
let records: Map<string, unknown>, storage: IncorporacionStorage
beforeEach(() => {
  records = new Map()
  storage = { read: vi.fn(async key => records.get(key) ?? null), write: vi.fn(async record => { records.set(record.actor_id, record) }), delete: vi.fn(async key => { records.delete(key) }) }
})
describe('persistencia privada del intento T5', () => {
  it('conserva bytes originales/UUID por actor y verifica la escritura antes de devolver', async () => {
    const stored = await guardarIntento(attempt(), storage)
    expect(stored.revision).toBe(1)
    expect(stored.files[0]).toBe(file)
    expect(stored.solicitud_id).toBe(solicitud)
    expect(await leerIntento('7', storage)).toBeNull()
    expect(await leerIntento(actor, storage)).toEqual(stored)
    expect(Object.isFrozen(stored.base)).toBe(true)
    expect(JSON.stringify(stored)).not.toMatch(/signed_url|Authorization|blob:/)
  })
  it('rechaza referencias numéricas inseguras y metadatos inesperados', async () => {
    await expect(guardarIntento({ ...attempt(), base: { ...attempt().base, planta_id: Number(actor) as never } }, storage)).rejects.toThrow()
    records.set(actor, { ...attempt(), token: 'no debe guardarse' })
    await expect(leerIntento(actor, storage)).rejects.toThrow()
  })
  it('detecta otra revisión o UUID sin sustituir el intento actual', async () => {
    const original = await guardarIntento(attempt(), storage)
    const next = await guardarIntento({ ...original, fase: 'FOTOS_POR_CONSULTAR' }, storage)
    await expect(guardarIntento({ ...original, fase: 'FOTOS_POR_CONSULTAR' }, storage)).rejects.toThrow(/otra pestaña/)
    await expect(guardarIntento({ ...next, solicitud_id: '8e949e85-e8ea-4f78-8f80-1934068ec4ce' }, storage)).rejects.toThrow(/otra pestaña/)
    expect(await leerIntento(actor, storage)).toEqual(next)
  })
  it('no permite cambiar intención, archivos o evidencias fijadas ni liberar un alta incierta', async () => {
    let original = await guardarIntento(attempt(), storage)
    original = await guardarIntento({ ...original, evidencia_ids: ['10'], fase: 'LISTO_PARA_CONFIRMAR' }, storage)
    original = await guardarIntento({ ...original, fase: 'ALTA_POR_CONSULTAR' }, storage)
    await expect(guardarIntento({ ...original, base: { ...original.base, cantidad: 2 } }, storage)).rejects.toThrow()
    await expect(guardarIntento({ ...original, files: [new File(['otra'], file.name, { type: file.type, lastModified: file.lastModified })] }, storage)).rejects.toThrow()
    await expect(guardarIntento({ ...original, evidencia_ids: ['11'] }, storage)).rejects.toThrow()
    await expect(descartarPreparacion(original, storage)).rejects.toThrow(/ya pudo enviarse/)
    await expect(liberarConfirmado(original, storage)).rejects.toThrow(/confirmada/)
    expect(storage.delete).not.toHaveBeenCalled()
  })
  it('permite descartar sólo preparación local y exige revisión actual', async () => {
    const original = await guardarIntento(attempt(), storage)
    const next = await guardarIntento({ ...original, fase: 'FOTOS_POR_CONSULTAR' }, storage)
    await expect(descartarPreparacion(original, storage)).rejects.toThrow()
    await descartarPreparacion(next, storage)
    expect(await leerIntento(actor, storage)).toBeNull()
  })
  it('sólo libera un recibo confirmado coherente sin guardar firmas', async () => {
    const record = await guardarIntento(attempt(), storage)
    const evidence = ['10']
    const receipt = validarRecibo({ success: true, estado: 'CONFIRMADO', data: { ...record.base, solicitud_id: solicitud, lote_vivero_id: actor, evento_incorporacion_id: '9007199254740994', codigo_trazabilidad: 'VIV-INC-SINTETICO', tercero_origen: null, referencia_documental: null, observaciones: null, saldo_vivo_antes: 0, saldo_vivo_despues: 1, evidencia_ids_vinculadas: evidence, nombre_cientifico_snapshot: 'Histórico', nombre_comercial_snapshot: 'Histórico', variedad_snapshot: null, nombre_responsable_snapshot: null, registrado_en: '2026-11-15T12:00:00Z' } })
    const confirmed = await guardarIntento({ ...record, fase: 'CONFIRMADO', recibo: receipt, evidencia_ids: evidence, files: [] }, storage)
    await liberarConfirmado(confirmed, storage)
    expect(await leerIntento(actor, storage)).toBeNull()
  })
  it('un write no verificable o una cuota fallida impide tratar los datos como persistidos', async () => {
    vi.mocked(storage.write).mockImplementationOnce(async () => {})
    await expect(guardarIntento(attempt(), storage)).rejects.toThrow()
    vi.mocked(storage.write).mockRejectedValueOnce(new Error('quota'))
    await expect(guardarIntento(attempt(), storage)).rejects.toThrow()
  })
})
