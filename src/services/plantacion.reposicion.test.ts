import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from './plantacion.service'
import type { CreateRegistroPlantacionInput } from '../modules/plantacion/types/contracts'

const scope = { subcampania_id: 820, es_reposicion: true as const }
const input: CreateRegistroPlantacionInput = { ...scope, registro_plantacion_origen_id: 820000, fecha_plantacion: '2026-10-16', latitud: -16.5, longitud: -68.1, detalles: [{ asignacion_id: 82099, lote_vivero_id: 81, planta_id: 8, cantidad: 1 }], evidencia_ids: [123] }
beforeEach(() => { localStorage.clear(); localStorage.setItem('authToken', 'jwt'); localStorage.setItem('auth_id', 'auth-901') })
describe('Compatibilidad D de reposición interna', () => {
  it('sube multipart con ámbito y propósito explícitos sin metadata libre ni URL pública', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [{ id: '123' }], evidencia_ids: [123] }), { status: 201 }))
    vi.stubGlobal('fetch', fetcher)
    const result = await PlantacionService.uploadEvidenciasPendientesPlantacion({ ...scope, fotos: [new File(['foto'], 'propia.jpg', { type: 'image/jpeg' })] })
    expect(result).toEqual({ evidencia_ids: [123] })
    const options = fetcher.mock.calls[0][1] as RequestInit
    const body = options.body as FormData
    expect(body.get('subcampania_id')).toBe('820')
    expect(body.get('es_reposicion')).toBe('true')
    expect(body.has('metadata')).toBe(false)
    expect(body.getAll('fotos')).toHaveLength(1)
    expect(new Headers(options.headers).has('Content-Type')).toBe(false)
  })
  it('descarta fotos dentro del ámbito declarado y nunca omite el propósito', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { evidencia_ids_descartadas: [123], evidencia_ids_ignoradas: [] } })))
    vi.stubGlobal('fetch', fetcher)
    await PlantacionService.descartarEvidenciasPendientesPlantacion({ ...scope, evidencia_ids: [123] })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ ...scope, evidencia_ids: [123] })
  })
  it('envía el origen requerido sin permitir un registro inicial por el contrato retirado', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { registro_plantacion_id: 999, cantidad_total_plantada: 1, codigo_trazabilidad: 'PLT-999' } })))
    vi.stubGlobal('fetch', fetcher)
    await PlantacionService.registrarPlantacion(input)
    expect(JSON.parse(fetcher.mock.calls[0][1].body).registro_plantacion_origen_id).toBe(820000)
    await expect(PlantacionService.registrarPlantacion({ ...input, es_reposicion: false } as unknown as CreateRegistroPlantacionInput)).rejects.toThrow('solo admite reposición')
    await expect(PlantacionService.registrarPlantacion({ ...input, registro_plantacion_origen_id: 0 })).rejects.toThrow('registro inicial de origen')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('propaga el rechazo backend de origen ajeno sin simular registro ni descartar evidencia', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'El origen no pertenece a la subcampaña.' }), { status: 409 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(PlantacionService.registrarPlantacion({ ...input, registro_plantacion_origen_id: 821000 })).rejects.toThrow('origen no pertenece')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
