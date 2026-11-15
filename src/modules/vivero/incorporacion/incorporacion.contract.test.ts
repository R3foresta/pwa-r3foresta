import { describe, expect, it } from 'vitest'
import { errorFotoIncorporacion, rangoIncorporacion, validarBase, validarFechaOperativa, validarFotosPendientes, validarPayload, validarRecibo, type IncorporacionPayload } from './incorporacion.contract'

const a = '9007199254740992', b = '9007199254740993'
const payload: IncorporacionPayload = { solicitud_id: '4ff8f9bb-4280-463d-95c8-97a3f11f122c', vivero_id: a, planta_id: b, modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', fecha_evento: '2026-11-12', cantidad: 210, evidencia_ids: [a, b] }
const base = { vivero_id: a, planta_id: b, modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', fecha_evento: '2026-11-12', cantidad: 210 }
function receipt() {
  return { success: true, estado: 'CONFIRMADO', data: { ...payload, lote_vivero_id: a, evento_incorporacion_id: b, codigo_trazabilidad: 'VIV-INC-SINTETICA', tercero_origen: null, referencia_documental: null, observaciones: null, evidencia_ids_vinculadas: [...payload.evidencia_ids], saldo_vivo_antes: 0, saldo_vivo_despues: 210, nombre_cientifico_snapshot: 'Científico histórico', nombre_comercial_snapshot: 'Nombre histórico', variedad_snapshot: null, nombre_responsable_snapshot: null, registrado_en: '2026-11-12T12:34:56.123456Z' } }
}
describe('contrato de incorporación', () => {
  it('conserva IDs vecinos, normaliza sólo texto/intención y admite el historial fuera de ventana móvil', () => {
    expect(validarBase({ ...base, observaciones: '  Conteo sin historia previa  ' })).toEqual({ ...base, observaciones: 'Conteo sin historia previa' })
    expect(validarPayload(payload).evidencia_ids).toEqual([a, b])
    expect(validarPayload({ ...payload, vivero_id: 42 }).vivero_id).toBe('42')
    expect(() => validarPayload({ ...payload, vivero_id: Number(b) })).toThrow()
    expect(validarBase({ ...base, fecha_evento: '2020-01-01' }).fecha_evento).toBe('2020-01-01')
  })
  it.each([
    { modalidad: 'RECEPCION', procedencia: 'PRODUCCION_PROPIA' }, { procedencia: 'DESCONOCIDA' },
    { cantidad: 0 }, { cantidad: 1.5 }, { cantidad: 2147483648 }, { cantidad: true },
    { fecha_evento: '2026-02-30' }, { fecha_evento: '2026-11-12T00:00:00Z' }, { responsable_id: '4' },
  ])('rechaza combinaciones/límites o campos inventados: %j', change => {
    expect(() => validarBase({ ...base, ...change })).toThrow()
  })
  it('admite producción propia/desconocida sólo en saldo inicial con observaciones para desconocida', () => {
    expect(validarBase({ ...base, procedencia: 'PRODUCCION_PROPIA' }).procedencia).toBe('PRODUCCION_PROPIA')
    expect(validarBase({ ...base, procedencia: 'DESCONOCIDA', observaciones: 'Antecedente desconocido' }).procedencia).toBe('DESCONOCIDA')
  })
  it('rechaza evidencias duplicadas, vacías, inseguras o más de cinco en el payload', () => {
    for (const evidencia_ids of [[], [a, a], [Number(b)], ['1', '2', '3', '4', '5', '6']]) expect(() => validarPayload({ ...payload, evidencia_ids })).toThrow()
  })
  it('aplica hoy−10..hoy en La Paz y conserva fechas DATE', () => {
    const now = new Date('2026-11-15T02:00:00Z')
    expect(rangoIncorporacion(now)).toEqual({ min: '2026-11-04', max: '2026-11-14' })
    expect(validarFechaOperativa('2026-11-04', now)).toBe(true)
    expect(validarFechaOperativa('2026-11-14', now)).toBe(true)
    expect(validarFechaOperativa('2026-11-03', now)).toBe(false)
    expect(validarFechaOperativa('2026-11-15', now)).toBe(false)
    expect(validarFechaOperativa('2026-02-30', now)).toBe(false)
  })
  it('coteja toda la intención y el saldo inicial sin completar snapshots nulos', () => {
    const result = validarRecibo(receipt(), payload)
    expect(result.data.variedad_snapshot).toBeNull()
    expect(result.data.evidencia_ids_vinculadas).toEqual([a, b])
    expect(validarRecibo({ ...receipt(), data: { ...receipt().data, evidencia_ids_vinculadas: [b, a] } }, payload)).toBeTruthy()
    for (const change of [{ cantidad: 200 }, { vivero_id: b }, { planta_id: a }, { procedencia: 'COMPRA' }, { fecha_evento: '2026-11-13' }, { tercero_origen: 'Otro' }, { referencia_documental: 'Otra' }, { observaciones: 'Otra' }, { evidencia_ids_vinculadas: [a] }, { saldo_vivo_despues: 190 }, { lote_vivero_id: Number(b) }]) {
      expect(() => validarRecibo({ ...receipt(), data: { ...receipt().data, ...change } }, payload)).toThrow()
    }
  })
  it('valida foto pequeña/15MiB y MIME/extensión sin exigir miniatura decodificable', () => {
    expect(errorFotoIncorporacion(new File(['heic'], 'foto.heic', { type: '' }))).toBeNull()
    expect(errorFotoIncorporacion(new File(['x'], 'foto.gif', { type: 'image/gif' }))).toMatch(/Formato inválido/)
    expect(errorFotoIncorporacion(new File([], 'vacia.jpg', { type: 'image/jpeg' }))).toMatch(/vacía/)
    const photo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    Object.defineProperty(photo, 'size', { value: 15 * 1024 * 1024, configurable: true })
    expect(errorFotoIncorporacion(photo)).toBeNull()
    Object.defineProperty(photo, 'size', { value: 15 * 1024 * 1024 + 1 })
    expect(errorFotoIncorporacion(photo)).toMatch(/15 MiB/)
  })
  it('lee pendientes escasos sin inventar metadatos y conserva acumulación de tandas', () => {
    const photo = { id: a, bucket: 'vivero_incorporaciones', ruta_archivo: 'privada/foto.jpg', signed_url: 'https://storage.example.test/signed', url_expira_en_segundos: 300 }
    const result = validarFotosPendientes({ success: true, data: [photo], evidencia_ids: [a] })
    expect(result.data[0]).toEqual(photo)
    expect(Object.hasOwn(result.data[0], 'tamano_bytes')).toBe(false)
    const data = ['1', '2', '3', '4', '5', '6'].map(id => ({ ...photo, id }))
    expect(validarFotosPendientes({ success: true, data, evidencia_ids: data.map(item => item.id) }).data).toHaveLength(6)
    expect(() => validarFotosPendientes({ success: true, data: [{ ...photo, bucket: 'publico' }], evidencia_ids: [a] })).toThrow()
  })
})
