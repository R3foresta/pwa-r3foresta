import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearAsignacionApi, devolverAsignacionApi, getLoteViveroDetalleApi, registrarMermaApi, createLoteViveroApi } from './lotes-vivero.api'
import { LotesViveroService } from '../services/lotes-vivero.service'
import { BIG_A, BIG_B, eventoFixture, loteFixture } from '../modules/vivero/t5.test-fixtures'

beforeEach(() => { localStorage.setItem('authToken', 'synthetic-token'); localStorage.setItem('auth_id', 'synthetic-auth') })
const json = (data: unknown) => new Response(JSON.stringify(data))

describe('frontera HTTP de lecturas y acciones existentes de Vivero', () => {
  it('usa Bearer capturado, no-store y el ID exacto en lecturas privadas', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ data: loteFixture() }))
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    await getLoteViveroDetalleApi(BIG_B, { token: 'synthetic-captured', signal: controller.signal })
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(`/lotes-vivero/${BIG_B}`), expect.objectContaining({ headers: { Authorization: 'Bearer synthetic-captured' }, cache: 'no-store', signal: controller.signal }))
    await expect(getLoteViveroDetalleApi(Number(BIG_B))).rejects.toThrow()
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('conserva IDs vecinos en asignación, devolución y evidencia de merma, sin redondeo', async () => {
    const fetcher = vi.fn().mockImplementation(async () => json({}))
    vi.stubGlobal('fetch', fetcher)
    await crearAsignacionApi(BIG_A, { subcampania_id: BIG_B, cantidad_asignada: 1, proposito: 'PLANTACION_INICIAL', fecha_asignacion: '2026-11-12', evidencia_ids: [BIG_A, BIG_B] })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ subcampania_id: BIG_B, evidencia_ids: [BIG_A, BIG_B] })
    await devolverAsignacionApi(BIG_A, BIG_B, { cantidad_devuelta: 1, motivo_devolucion: 'Motivo sintético', fecha_devolucion: '2026-11-12' })
    expect(fetcher.mock.calls[1][0]).toContain(`/${BIG_A}/asignaciones/${BIG_B}/devolucion`)
    await registrarMermaApi(BIG_B, { cantidad_afectada: 1, fecha_evento: '2026-11-12', causa_merma: 'OTRO', evidencia_ids: [BIG_B] })
    expect(JSON.parse(fetcher.mock.calls[2][1].body).evidencia_ids).toEqual([BIG_B])
    await expect(registrarMermaApi(BIG_B, { cantidad_afectada: 1, fecha_evento: '2026-11-12', causa_merma: 'OTRO', evidencia_ids: [Number(BIG_B)] })).rejects.toThrow()
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('conserva el contrato estricto de INICIO y sus IDs/evidencias exactos', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({}))
    vi.stubGlobal('fetch', fetcher)
    await createLoteViveroApi({ recoleccion_id: BIG_B, vivero_id: BIG_A, fecha_inicio: '2026-11-12', fecha_evento: '2026-11-12', cantidad_inicial_en_proceso: '1.000001', unidad_medida_inicial: 'G', evidencia_ids: [BIG_B] })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ recoleccion_id: BIG_B, vivero_id: BIG_A, cantidad_inicial_en_proceso: '1.000001', unidad_medida_inicial: 'G', evidencia_ids: [BIG_B] })
  })
  it('normaliza asignaciones sin alias y no convierte un body incompleto de historial en vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ data: [{ id: BIG_A, subcampania_id: BIG_B }, { id: BIG_B, subcampania_id: BIG_A }] })).mockResolvedValueOnce(json({ success: true })).mockResolvedValueOnce(json({ data: { eventos: [eventoFixture()] } })))
    expect((await LotesViveroService.listAsignaciones(BIG_A)).map(item => [item.id, item.subcampania_id])).toEqual([[BIG_A, BIG_B], [BIG_B, BIG_A]])
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow('Respuesta de historial incompleta')
    expect((await LotesViveroService.getEvents(BIG_A))[0].kind).toBe('INCORPORACION')
  })
})
