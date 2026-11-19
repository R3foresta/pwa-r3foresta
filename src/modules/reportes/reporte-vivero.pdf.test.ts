import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { DetalleMerma, ReporteMermas, ReporteVivero } from './reporte-vivero.contract'
import { generarReporteMermasPdf, generarReporteViveroPdf } from './reporte-vivero.pdf'

const observado_en = '2026-11-20T00:30:00Z'
const generadoEn = new Date('2026-11-20T00:35:00Z')
const ambito = { planta_id: '19', especie: 'Toborochi', vivero_id: '4', vivero: 'Vivero Ñandutí' }
const opciones = { viveros: [{ id: '4', nombre: ambito.vivero }], especies: [{ id: '19', nombre: ambito.especie }] }
const filtros = { vivero_id: '4', planta_id: '19' }
const inventario: ReporteVivero = {
  observado_en, filtros, opciones,
  totales: { plantas: 23, especies: 1, viveros: 1 },
  filas: [{ ...ambito, plantas: 23 }],
  por_vivero: [{ vivero_id: '4', vivero: ambito.vivero, plantas: 23 }],
}
const eventos: DetalleMerma[] = Array.from({ length: 72 }, (_, index) => ({
  ...ambito,
  fecha: '2026-11-18',
  lote_id: String(index + 1),
  codigo_lote: `LOTE-${index + 1}`,
  id: String(index + 1),
  causa: index === 71 ? null : 'DANO_FISICO',
  cantidad: index === 71 ? null : 5,
}))
const mermas: ReporteMermas = {
  observado_en, filtros: { ...filtros, desde: '2026-10-01', hasta: '2026-11-19', pagina: 1 }, opciones,
  totales: { plantas: 355, eventos: 72, eventos_sin_cantidad: 1 },
  tamano_pagina: 25, detalle: eventos.slice(0, 25),
  por_causa: [{ causa: 'DANO_FISICO', plantas: 355, eventos: 71 }, { causa: null, plantas: 0, eventos: 1 }],
  meses: [{ mes: '2026-11', plantas: 355 }],
}

describe('PDF de vivero y mermas', () => {
  it('genera el PDF de inventario en una página con metadatos', async () => {
    const pdf = await PDFDocument.load(await generarReporteViveroPdf(inventario, generadoEn))
    expect(pdf.getTitle()).toBe('Inventario de vivero | R3Foresta')
    expect(pdf.getCreationDate()).toEqual(generadoEn)
    expect(pdf.getPageCount()).toBe(1)
  })

  it('genera el historial completo en varias páginas y distingue faltantes', async () => {
    const pdf = await PDFDocument.load(await generarReporteMermasPdf(mermas, eventos, generadoEn))
    expect(pdf.getTitle()).toBe('Mermas en vivero | R3Foresta')
    expect(pdf.getPageCount()).toBeGreaterThan(2)
    await expect(generarReporteMermasPdf(mermas, mermas.detalle, generadoEn)).rejects.toThrow(/incompleto/)
    await expect(generarReporteMermasPdf(mermas, [...eventos.slice(0, 71), eventos[70]], generadoEn)).rejects.toThrow(/incompleto/)
  })

  it('permite exportar una consulta de mermas confirmada sin eventos', async () => {
    const vacio: ReporteMermas = {
      ...mermas, totales: { plantas: 0, eventos: 0, eventos_sin_cantidad: 0 },
      meses: [], por_causa: [], detalle: [],
    }
    const pdf = await PDFDocument.load(await generarReporteMermasPdf(vacio, [], generadoEn))
    expect(pdf.getPageCount()).toBe(1)
  })
})
