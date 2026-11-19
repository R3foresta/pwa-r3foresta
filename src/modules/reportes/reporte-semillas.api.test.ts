import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarMovimientosSemillas, consultarSaldoSemillas } from './reporte-semillas.api'
import { formatearCantidadSemilla } from './reporte-semillas.presentacion'

const token = 'admin-sintetico'
const planta_id = '9007199254740995'
const vivero_id = '9007199254740997'
const filtros = { planta_id, vivero_id }
const periodo = { ...filtros, desde: '2026-01-01', hasta: '2026-01-31', pagina: 1 }
const cabecera = {
  observado_en: '2026-02-01T03:45:00.000Z',
  opciones: { especies: [{ id: planta_id, nombre: 'Tajibo' }], viveros: [{ id: vivero_id, nombre: 'Vivero Central' }] },
}
const alcance = { ...filtros, especie: 'Tajibo', vivero: 'Vivero Central' }
const saldo = {
  ...cabecera, filtros, totales: { G: '9007199254740993.125001', UNIDAD: '4' },
  filas: [
    { ...alcance, unidad: 'G', saldo: '9007199254740993.125001' },
    { ...alcance, unidad: 'UNIDAD', saldo: '4' },
  ],
}
const evento = {
  ...alcance, id: '1', tipo: 'CONSUMO_A_VIVERO', recoleccion_id: '7',
  codigo_recoleccion: 'REC-7', vivero_destino: 'Vivero Norte', fecha: '2026-01-01',
  unidad: 'G', cantidad: '0.000001',
}
const historico = {
  ...cabecera, filtros: periodo, tamano_pagina: 25,
  totales: {
    G: { recibido: '0', consumido: '0.000001', descartado: '0' },
    UNIDAD: { recibido: '0', consumido: '0', descartado: '0' },
    eventos: 2, eventos_sin_cantidad: 1,
  },
  detalle: [evento, { ...evento, tipo: 'DESECHO', vivero_destino: null, cantidad: null }],
}

function responder(data: unknown, estado = 200) {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: estado === 200, data }), { status: estado }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

beforeEach(() => localStorage.setItem('authToken', token))
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Lecturas administrativas de semillas', () => {
  it('preserva los BIGINT y decimales exactos y consulta saldo sin período', async () => {
    const fetcher = responder(saldo)
    const resultado = await consultarSaldoSemillas(filtros, token)
    expect(resultado.filas[0].saldo).toBe('9007199254740993.125001')
    expect(formatearCantidadSemilla(resultado.filas[0].saldo)).toBe('9.007.199.254.740.993,125001')
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/reportes/semillas?planta_id=${planta_id}&vivero_id=${vivero_id}`),
      expect.objectContaining({ cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
    )
  })

  it('conserva el historial con la custodia, el vivero destino y una cantidad ausente', async () => {
    const fetcher = responder(historico)
    const resultado = await consultarMovimientosSemillas(periodo, token)
    expect(resultado.detalle).toEqual(historico.detalle)
    expect(resultado.totales.eventos_sin_cantidad).toBe(1)
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/reportes/semillas/movimientos?'),
      expect.anything(),
    )
  })

  it('rechaza un saldo inconsistente y un detalle incompleto en vez de mostrar cero', async () => {
    responder({ ...saldo, filas: saldo.filas.slice(0, 1) })
    await expect(consultarSaldoSemillas(filtros, token)).rejects.toThrow(/incompleto/)
    responder({ ...historico, detalle: [evento] })
    await expect(consultarMovimientosSemillas(periodo, token)).rejects.toThrow(/incompleto/)
  })

  it('distingue una consulta caída de un saldo válido de cero', async () => {
    responder({ ...saldo, filas: [], totales: { G: '0', UNIDAD: '0' } })
    await expect(consultarSaldoSemillas(filtros, token)).resolves.toMatchObject({ totales: { G: '0', UNIDAD: '0' } })
    responder(null, 503)
    await expect(consultarSaldoSemillas(filtros, token)).rejects.toThrow(/saldo de semillas/)
  })
})
