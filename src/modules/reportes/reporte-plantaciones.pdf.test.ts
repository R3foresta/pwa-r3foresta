import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { ReportePlantaciones } from './reporte-plantaciones.contract'
import { generarReportePlantacionesPdf } from './reporte-plantaciones.pdf'

const generadoEn = new Date('2026-06-03T00:30:00Z')
const empty: ReportePlantaciones = {
  observado_en: '2026-06-03T00:15:00Z',
  filtros: { desde: '2026-01-01', hasta: '2026-06-02', organizacion_id: null, campania_id: null, planta_id: null },
  totales: { registros: 0, iniciales: 0, reposiciones: 0, total: 0 },
  meses: [],
  especies: [],
  opciones: { organizaciones: [], campanias: [], especies: [] },
}

describe('PDF de plantaciones', () => {
  it('genera un PDF general legible al consultar un período sin registros', async () => {
    const pdf = await PDFDocument.load(await generarReportePlantacionesPdf(empty, generadoEn))
    expect(pdf.getTitle()).toBe('Reporte de plantaciones | R3Foresta')
    expect(pdf.getCreationDate()).toEqual(generadoEn)
    expect(pdf.getPageCount()).toBe(1)
  })

  it('continúa el detalle por especie en páginas adicionales', async () => {
    const reporte: ReportePlantaciones = {
      ...empty,
      filtros: { ...empty.filtros, organizacion_id: '12' },
      totales: { registros: 74, iniciales: 73, reposiciones: 1, total: 74 },
      meses: [{ mes: '2026-01', iniciales: 73, reposiciones: 1 }],
      especies: [
        { planta_id: null, nombre_comun: 'Sin desglose de especie', nombre_cientifico: null, iniciales: 1, reposiciones: 1, total: 2 },
        ...Array.from({ length: 72 }, (_, index) => ({
          planta_id: String(index + 1), nombre_comun: `Tajibo de la región ${index + 1}`,
          nombre_cientifico: 'Handroanthus impetiginosus', iniciales: 1, reposiciones: 0, total: 1,
        })),
      ],
      opciones: { ...empty.opciones, organizaciones: [{ id: '12', nombre: 'Fundación Ñandutí' }] },
    }
    const pdf = await PDFDocument.load(await generarReportePlantacionesPdf(reporte, generadoEn))
    expect(pdf.getTitle()).toBe('Plantaciones asociadas | R3Foresta')
    expect(pdf.getPageCount()).toBeGreaterThan(3)
  })
})
