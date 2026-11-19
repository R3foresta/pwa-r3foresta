import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { ReporteMovimientosSemillas, ReporteSaldoSemillas } from './reporte-semillas.contract'
import { generarReporteSemillasPdf } from './reporte-semillas.pdf'

const generado = new Date('2026-11-19T18:00:00Z')
const nombreVivero = 'Vivero Ñandutí'
const ambito = { planta_id: '19', especie: 'Toborochi', vivero_id: '4', vivero: nombreVivero }
const filtros = { planta_id: '19', vivero_id: '4' }
const opciones = { viveros: [{ id: '4', nombre: nombreVivero }], especies: [{ id: '19', nombre: ambito.especie }] }
const gramos = '10000000000000000.123456'
const saldo: ReporteSaldoSemillas = {
  observado_en: '2026-11-19T17:50:00Z', filtros, opciones,
  totales: { G: gramos, UNIDAD: '69' },
  filas: [
    { ...ambito, unidad: 'G', saldo: gramos },
    { ...ambito, unidad: 'UNIDAD', saldo: '69' },
  ],
}
const base = { ...ambito, fecha: '2026-11-18', recoleccion_id: '9', codigo_recoleccion: 'REC-9' }
const movimientos: ReporteMovimientosSemillas = {
  observado_en: '2026-11-19T17:55:00Z',
  filtros: { ...filtros, desde: '2026-11-01', hasta: '2026-11-19', pagina: 1 },
  opciones, tamano_pagina: 25,
  totales: {
    G: { recibido: gramos, consumido: '0', descartado: '0' },
    UNIDAD: { recibido: '0', consumido: '69', descartado: '0' },
    eventos: 71, eventos_sin_cantidad: 1,
  },
  detalle: [
    { ...base, id: '1', tipo: 'RECEPCION_CONFORME', vivero_destino: null, unidad: 'G', cantidad: gramos },
    ...Array.from({ length: 69 }, (_, index) => ({
      ...base, id: String(index + 2), tipo: 'CONSUMO_A_VIVERO' as const,
      vivero_destino: 'Vivero de Investigación y Restauración', unidad: 'UNIDAD' as const, cantidad: '1',
    })),
    { ...base, id: '1', tipo: 'DESECHO', vivero_destino: null, unidad: null, cantidad: null },
  ],
}

describe('PDF de semillas', () => {
  it('genera el saldo y el historial completo multipágina con dos unidades', async () => {
    const pdf = await PDFDocument.load(await generarReporteSemillasPdf(saldo, movimientos, generado))
    expect(pdf.getTitle()).toBe('Semillas | R3Foresta')
    expect(pdf.getCreationDate()).toEqual(generado)
    expect(pdf.getPageCount()).toBeGreaterThan(2)
  })

  it('rechaza una página parcial, filas duplicadas y totales con decimales incorrectos', async () => {
    const intentos = [
      { ...movimientos, detalle: movimientos.detalle.slice(0, 25) },
      { ...movimientos, detalle: [...movimientos.detalle.slice(0, 69), movimientos.detalle[68], movimientos.detalle[70]] },
      { ...movimientos, totales: { ...movimientos.totales, G: { ...movimientos.totales.G, recibido: '10000000000000000.123455' } } },
    ]
    for (const reporte of intentos) await expect(generarReporteSemillasPdf(saldo, reporte, generado)).rejects.toThrow(/incompleto/)
  })

  it('rechaza combinar lecturas de distinto alcance', async () => {
    const otroVivero = { ...saldo, filtros: { ...filtros, vivero_id: '5' } }
    await expect(generarReporteSemillasPdf(otroVivero, movimientos, generado)).rejects.toThrow(/filtros diferentes/)
  })

  it('genera una consulta confirmada sin existencias ni movimientos', async () => {
    const porUnidad = { recibido: '0', consumido: '0', descartado: '0' }
    const pdf = await PDFDocument.load(await generarReporteSemillasPdf(
      { ...saldo, totales: { G: '0', UNIDAD: '0' }, filas: [] },
      { ...movimientos, totales: { G: porUnidad, UNIDAD: porUnidad, eventos: 0, eventos_sin_cantidad: 0 }, detalle: [] },
      generado,
    ))
    expect(pdf.getPageCount()).toBe(1)
  })
})
