import { afterEach, describe, expect, it, vi } from 'vitest'
import { consultarMermas, consultarVivero } from './reporte-vivero.api'
import { validarReporteMermas, validarReporteVivero } from './reporte-vivero.contract'

const plantaId = '9007199254740993'
const viveroId = '9007199254740995'
const filtrosVivero = { planta_id: plantaId, vivero_id: viveroId }
const filtrosMermas = { ...filtrosVivero, desde: '2026-01-01', hasta: '2026-11-19', pagina: 2 }
const observado_en = '2026-11-19T14:20:00Z'
const ambito = { ...filtrosVivero, especie: 'Tajibo', vivero: 'Vivero central' }
const opciones = {
  viveros: [{ id: viveroId, nombre: ambito.vivero }],
  especies: [{ id: plantaId, nombre: ambito.especie }],
}

const vivero = {
  observado_en, filtros: filtrosVivero, opciones,
  totales: { plantas: 85, especies: 1, viveros: 1 },
  filas: [{ ...ambito, plantas: 85 }],
  por_vivero: [{ vivero_id: viveroId, vivero: ambito.vivero, plantas: 85 }],
}

const detalle = {
  id: '9007199254740997', fecha: '2026-01-01', lote_id: '9007199254740999', codigo_lote: 'LOTE-1',
  ...ambito, causa: null, cantidad: null,
}

const mermas = {
  observado_en, filtros: filtrosMermas, opciones,
  totales: { plantas: 103, eventos: 26, eventos_sin_cantidad: 1 },
  por_causa: [{ causa: 'PLAGA', plantas: 103, eventos: 25 }, { causa: null, plantas: 0, eventos: 1 }],
  meses: [{ mes: '2026-11', plantas: 103 }],
  tamano_pagina: 25, detalle: [detalle],
}

const envelope = (data: unknown) => ({ success: true, data })

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('consultas administrativas de vivero y mermas', () => {
  it('conserva el saldo y los IDs BIGINT, y comprueba los totales por vivero', () => {
    expect(validarReporteVivero(envelope(vivero), filtrosVivero)).toEqual(vivero)
    expect(() => validarReporteVivero(envelope({ ...vivero, por_vivero: [{ ...vivero.por_vivero[0], plantas: 84 }] }), filtrosVivero)).toThrow()
    expect(() => validarReporteVivero(envelope({ ...vivero, filas: [{ ...vivero.filas[0], planta_id: Number(plantaId) }] }), filtrosVivero)).toThrow()
  })

  it('conserva el detalle paginado y sus cantidades ausentes junto con los agregados del conjunto', () => {
    expect(validarReporteMermas(envelope(mermas), filtrosMermas)).toEqual(mermas)
    expect(() => validarReporteMermas(envelope({ ...mermas, detalle: [] }), filtrosMermas)).toThrow()
    expect(() => validarReporteMermas(envelope({ ...mermas, detalle: [{ ...detalle, fecha: '2025-12-31' }] }), filtrosMermas)).toThrow()
    expect(() => validarReporteMermas(envelope({ ...mermas, meses: [] }), filtrosMermas)).toThrow()
    expect(() => validarReporteMermas(envelope(mermas), { ...filtrosMermas, pagina: 1 })).toThrow()
  })

  it('usa Bearer, la configuración v1 y filtros específicos para las dos lecturas', async () => {
    localStorage.setItem('authToken', 'reporte-local')
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(vivero))))
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(mermas))))
    vi.stubGlobal('fetch', fetcher)

    await expect(consultarVivero(filtrosVivero, 'reporte-local')).resolves.toEqual(vivero)
    await expect(consultarMermas(filtrosMermas, 'reporte-local')).resolves.toEqual(mermas)
    const privado = expect.objectContaining({ cache: 'no-store', credentials: 'omit', headers: { Authorization: 'Bearer reporte-local' } })
    expect(fetcher).toHaveBeenNthCalledWith(1, expect.stringContaining(`/api/v1/reportes/vivero?planta_id=${plantaId}&vivero_id=${viveroId}`), privado)
    expect(fetcher).toHaveBeenNthCalledWith(2, expect.stringContaining(`/api/v1/reportes/mermas?desde=2026-01-01&hasta=2026-11-19&pagina=2&planta_id=${plantaId}&vivero_id=${viveroId}`), privado)
  })

  it('distingue un rechazo de acceso y un fallo de red del saldo cero', async () => {
    localStorage.setItem('authToken', 'reporte-local')
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockRejectedValueOnce(new TypeError('Sin red'))
    vi.stubGlobal('fetch', fetcher)

    await expect(consultarVivero(filtrosVivero, 'reporte-local')).rejects.toMatchObject({ status: 403 })
    await expect(consultarMermas(filtrosMermas, 'reporte-local')).rejects.toMatchObject({ status: 0, message: 'No pudimos consultar las mermas de vivero. Intenta de nuevo.' })
  })
})
