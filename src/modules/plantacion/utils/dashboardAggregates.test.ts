import { describe, expect, it } from 'vitest'
import type { Campania, Subcampania } from '../types/contracts'
import {
  aggregateDashboard,
  applyResumenGlobal,
  avancePctDe,
  getCampaniaAggregatedTotals,
} from './dashboardAggregates'

function campania(overrides: Partial<Campania> = {}): Campania {
  return {
    id: 1,
    nombre: 'Campaña de prueba',
    tipo: 'REFORESTACION',
    codigo_trazabilidad: 'CAM-1',
    created_at: '2026-10-09',
    updated_at: '2026-10-09',
    meta_planificada_campania: 40,
    arboles_plantados: 50,
    ...overrides,
  }
}

describe('avance de metas orientativas en el dashboard', () => {
  it('muestra el porcentaje real entregado por el backend aunque supere 100%', () => {
    expect(avancePctDe(campania({ avance_pct: 125 }))).toBe(125)
  })

  it('calcula 125% para 50 plantados sobre meta 40 y usa la meta revisada', () => {
    expect(avancePctDe(campania())).toBe(125)
    expect(avancePctDe(campania({ meta_planificada_campania: 60 }))).toBe(83)
  })

  it('conserva el avance real en el agregado del programa', () => {
    expect(aggregateDashboard([campania()])).toMatchObject({
      arbolesPlantados: 50,
      metaArboles: 40,
      avancePct: 125,
    })
  })

  it('prioriza la meta agregada entregada por el backend y refleja su revisión', () => {
    expect(getCampaniaAggregatedTotals(campania(), [])).toEqual({
      planted: 50,
      target: 40,
      progress: 125,
    })
    expect(getCampaniaAggregatedTotals(campania({ meta_planificada_campania: 60 }), []))
      .toEqual({ planted: 50, target: 60, progress: 83 })
  })

  it('incluye borradores y cierres parciales en la meta interna, excluyendo canceladas', () => {
    const subcampanias = [
      { estado: 'ACTIVA', meta_total_arboles: 40, total_plantado_inicial: 50 },
      { estado: 'BORRADOR', meta_total_arboles: 20, total_plantado_inicial: 0 },
      { estado: 'FINALIZADA_PARCIAL', meta_total_arboles: 30, total_plantado_inicial: 15 },
      { estado: 'CANCELADA', meta_total_arboles: 100, total_plantado_inicial: 0 },
    ] as Subcampania[]
    expect(getCampaniaAggregatedTotals(campania({
      meta_planificada_campania: undefined,
      arboles_plantados: undefined,
    }), subcampanias)).toEqual({ planted: 65, target: 90, progress: 72 })
  })

  it('mantiene el avance global sobre 100% sin ampliar el rango de supervivencia', () => {
    const totals = applyResumenGlobal(aggregateDashboard([campania()]), {
      arboles_plantados_total: 50,
      avance_meta_pct: 125,
      supervivencia_pct: 120,
      hectareas_total: 1,
      campanias_activas: 1,
      campanias_totales: 1,
      subcampanias_activas: 1,
      subcampanias_totales: 1,
    })
    expect(totals.avancePct).toBe(125)
    expect(totals.supervivenciaPct).toBe(100)
  })
})
