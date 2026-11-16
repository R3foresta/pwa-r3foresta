import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearAsignacionApi, devolverAsignacionApi, getLoteViveroDetalleApi, registrarMermaApi, createLoteViveroApi } from './lotes-vivero.api'
import { LotesViveroService } from '../services/lotes-vivero.service'
import { BIG_A, BIG_B, eventoFixture, loteFixture } from '../modules/vivero/t5.test-fixtures'

beforeEach(() => { localStorage.setItem('authToken', 'synthetic-token'); localStorage.setItem('auth_id', 'synthetic-auth') })
const json = (data: unknown) => new Response(JSON.stringify(data))
const paged = (eventos: unknown[], cursor: string | null, total: number, cut = '9007199254742000') => ({
  success: true,
  data: { lote_id: BIG_A, codigo_trazabilidad: 'VIV-SINTETICO', estado_lote: 'ACTIVO', total_eventos: eventos.length, eventos,
    paginacion: { limite: 100, devueltos: eventos.length, total_en_lectura: total, hay_mas: cursor !== null, cursor_siguiente: cursor, lectura_completa: cursor === null, corte_evento_id: cut, orden: ['fecha_evento', 'created_at', 'id'] } },
})
const syntheticEvent = (id: string) => ({ ...eventoFixture('ADAPTABILIDAD'), id, lote_vivero_id: BIG_A })

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
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/historial.*incompleto/i)
    expect((await LotesViveroService.getEvents(BIG_A))[0].kind).toBe('INCORPORACION')
  })

  it('reúne páginas consecutivas con IDs exactos y conserva Bearer, abort signal y filtros', async () => {
    const controller = new AbortController()
    const first = Array.from({ length: 100 }, (_, i) => syntheticEvent(String(9007199254741000n + BigInt(i))))
    const second = [syntheticEvent('9007199254741100'), syntheticEvent('9007199254741101')]
    const fetcher = vi.fn().mockResolvedValueOnce(json(paged(first, 'opaque-cursor', 102))).mockResolvedValueOnce(json(paged(second, null, 102)))
    vi.stubGlobal('fetch', fetcher)
    const result = await LotesViveroService.listAdaptabilidadTimeline(BIG_A, { token: 'captured-token', signal: controller.signal })
    expect(result.eventos).toHaveLength(102)
    expect(result.eventos[100].id).toBe('9007199254741100')
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toContain('tipo_evento=ADAPTABILIDAD')
      expect(init).toMatchObject({ headers: { Authorization: 'Bearer captured-token' }, cache: 'no-store', signal: controller.signal })
    }
    expect(fetcher.mock.calls[0][0]).not.toContain('cursor=')
    expect(fetcher.mock.calls[1][0]).toContain('cursor=opaque-cursor')
    fetcher.mockResolvedValueOnce(json(paged(first, 'general-cursor', 102))).mockResolvedValueOnce(json(paged(second, null, 102)))
    const general = await LotesViveroService.getEvents(BIG_A, { token: 'captured-token', signal: controller.signal })
    expect(general).toHaveLength(102)
    expect(general[100].id).toBe('9007199254741100')
    expect(fetcher.mock.calls[2][0]).not.toContain('tipo_evento=')
    expect(fetcher.mock.calls[3][0]).toContain('cursor=general-cursor')
  })

  it('acepta la respuesta legada sin paginación en la primera lectura', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: true, data: { lote_id: BIG_A, codigo_trazabilidad: 'VIV-LEGADO', estado_lote: 'ACTIVO', total_eventos: 1, eventos: [syntheticEvent('9007199254741000')] } })))
    expect(await LotesViveroService.getEvents(BIG_A)).toHaveLength(1)
  })

  it('rechaza cursores repetidos, cortes/conteos cambiantes, IDs duplicados y fallos de página sin parcial', async () => {
    const one = [syntheticEvent('9007199254741000')]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(paged(one, 'repeat', 3))).mockResolvedValueOnce(json(paged([syntheticEvent('9007199254741001')], 'repeat', 3))))
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/historial.*incompleto/i)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(paged(one, 'next', 2))).mockResolvedValueOnce(json(paged([syntheticEvent('9007199254741001')], null, 3))))
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/historial.*incompleto/i)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(paged(one, 'next', 2))).mockResolvedValueOnce(json(paged([syntheticEvent('9007199254741001')], null, 2, BIG_A))))
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/historial.*incompleto/i)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(paged(one, 'next', 2))).mockResolvedValueOnce(json(paged(one, null, 2))))
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/historial.*incompleto/i)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(paged(one, 'next', 2))).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Sin permiso' }), { status: 403 })))
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow('Sin permiso')
  })

  it('descarta incluso una respuesta de página que llega tras abortarse la cuenta', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn(async () => { controller.abort(); return json(paged([syntheticEvent('9007199254741000')], null, 1)) }))
    await expect(LotesViveroService.getEvents(BIG_A, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('descarta la lectura al cambiar la sesión implícita sin mezclar cuentas entre páginas', async () => {
    const fetcher = vi.fn(async () => {
      localStorage.setItem('authToken', 'another-account-token')
      return json(paged([syntheticEvent('9007199254741000')], 'next-account', 2))
    })
    vi.stubGlobal('fetch', fetcher)
    await expect(LotesViveroService.listAdaptabilidadTimeline(BIG_A)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0]).toEqual([
      expect.stringContaining('tipo_evento=ADAPTABILIDAD'),
      expect.objectContaining({ headers: { Authorization: 'Bearer synthetic-token' } }),
    ])
  })

  it('convierte 409 de corte inestable en instrucción de reintento desde cero', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(paged([syntheticEvent('9007199254741000')], 'next', 2))).mockResolvedValueOnce(new Response(JSON.stringify({ error: { codigo: 'HISTORIAL_CAMBIO_DURANTE_LECTURA' } }), { status: 409 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(LotesViveroService.getEvents(BIG_A)).rejects.toThrow(/cambió durante la consulta.*nueva/i)
    fetcher.mockResolvedValueOnce(json(paged([syntheticEvent('9007199254741000')], null, 1)))
    await expect(LotesViveroService.getEvents(BIG_A)).resolves.toHaveLength(1)
    expect(fetcher.mock.calls[2][0]).not.toContain('cursor=')
  })
})
