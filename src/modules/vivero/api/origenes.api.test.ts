import { describe, expect, it, vi } from 'vitest'
import { validarOrigenes, OrigenesService } from './origenes.api'
import { VIVERO_A, VIVERO_B } from '../../accesos/test-fixtures'
import { uploadEvidenciasPendientesViveroApi, uploadEvidenciasEventoViveroApi } from '../../../api/lotes-vivero.api'
import { RecoleccionesService } from '../../../services/recolecciones.service'

const origen = { recoleccion_id: '3', vivero_almacenamiento_id: VIVERO_B, recolector_id: '9007199254740993', planta_id: '2', codigo_trazabilidad: 'SINT-3', fecha: '2026-11-05', tipo_material: 'SEMILLA', nombre_cientifico_snapshot: 'Especie sintética', nombre_comercial_snapshot: 'Árbol sintético', variedad_snapshot: null, estado_registro: 'VALIDADO', estado_operativo: 'ABIERTO', saldo_actual: 2.5, unidad_canonica: 'G', estado_habilitacion: 'PENDIENTE_RECEPCION' }
const reading = { success: true, data: [origen], pagination: { page: 1, limit: 20, total: 1 } }
describe('compatibilidad mínima M2 sin ficha M1', () => {
  it('conserva la proyección mínima y rechaza el vivero vecino o datos privados ajenos', () => {
    expect(validarOrigenes(reading, VIVERO_B, 1)).toEqual(reading)
    expect(() => validarOrigenes(reading, VIVERO_A, 1)).toThrow()
    expect(() => validarOrigenes({ ...reading, data: [{ ...origen, estado_habilitacion: 'VALIDADO' }] }, VIVERO_B, 1)).toThrow()
    expect(() => validarOrigenes({ ...reading, data: [{ ...origen, observaciones: 'Fuera de proyección' }] }, VIVERO_B, 1)).toThrow()
    expect(() => validarOrigenes({ ...reading, data: [{ ...origen, recolector_id: Number(VIVERO_B) }] }, VIVERO_B, 1)).toThrow()
  })
  it('exige el motivo y conserva el saldo decimal exacto en la lectura de INICIO', () => {
    const exacto = '9007199254740993.123456'
    const apto = { ...origen, saldo_actual: Number(exacto), saldo_actual_exacto: exacto,
      estado_habilitacion: 'RECEPCION_CONFORME', motivo_no_inicio: null }
    expect(validarOrigenes({ ...reading, data: [apto] }, VIVERO_B, 1, true).data).toEqual([apto])
    expect(() => validarOrigenes(reading, VIVERO_B, 1, true)).toThrow()
    expect(() => validarOrigenes({ ...reading, data: [{ ...apto, saldo_actual_exacto: '1' }] }, VIVERO_B, 1, true)).toThrow()
    expect(() => validarOrigenes({ ...reading, data: [{ ...apto, estado_habilitacion: 'PENDIENTE_RECEPCION' }] }, VIVERO_B, 1, true)).toThrow()
  })
  it('conserva snapshots incompletos sin completar desde el catálogo vivo', () => {
    const legado = { ...origen, codigo_trazabilidad: null, planta_id: null, variedad_snapshot: '' }
    expect(validarOrigenes({ ...reading, data: [legado] }, VIVERO_B, 1).data).toEqual([
      { ...legado, variedad_snapshot: null },
    ])
  })
  it('la carga INICIO lleva vivero_id exacto y otros eventos derivan el contexto de la ruta', async () => {
    localStorage.setItem('authToken', 'synthetic'); localStorage.setItem('auth_id', 'synthetic-auth')
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetch)
    const photo = new File(['synthetic'], 'sintetica.jpg', { type: 'image/jpeg' })
    await uploadEvidenciasPendientesViveroApi({ vivero_id: VIVERO_B, fotos: [photo] })
    const body = fetch.mock.calls[0][1].body as FormData
    expect(body.get('vivero_id')).toBe(VIVERO_B)
    await uploadEvidenciasEventoViveroApi(15, 'DESPACHO', { fotos: [photo] })
    expect(fetch.mock.calls[1][0]).toContain('/lotes-vivero/15/despacho/evidencias-pendientes')
    expect((fetch.mock.calls[1][1].body as FormData).has('vivero_id')).toBe(false)
  })
  it('un catálogo numérico inseguro no se utiliza como vivero de autoridad', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: Number(VIVERO_B), codigo: 'SB', nombre: 'Sintético' }] }), { status: 200 })))
    await expect(RecoleccionesService.getViveros()).rejects.toThrow()
  })
  it('no consulta sin sesión y no hace fallback al detalle general de Recolección', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(OrigenesService.listar('7', VIVERO_B)).rejects.toMatchObject({ status: 401 })
    expect(fetch).not.toHaveBeenCalled()
  })
})
