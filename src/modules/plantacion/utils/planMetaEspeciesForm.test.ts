import { describe, expect, it } from 'vitest'
import type { GetPlanData } from '../types/contracts'
import {
  addPlanCatalogSpecies,
  createPlanFormFromDraft,
  createPlanFormFromPlan,
  getPlanPercentageTotal,
  planFormToDraft,
  recalculatePlanQuantities,
  validatePlanForm,
  type PlanEspecieForm,
  type PlanMetaEspeciesValue,
} from './planMetaEspeciesForm'

function species(planta_id: number, porcentaje: string, cantidad: string): PlanEspecieForm {
  return { planta_id, especie: planta_id === 1 ? 'Molle' : 'Tara', nombre_cientifico: '', porcentaje, cantidad }
}

function form(meta: string, especies: PlanEspecieForm[]): PlanMetaEspeciesValue {
  return { meta, especies }
}

const savedPlan: GetPlanData = {
  subcampania_id: 54,
  estado: 'ACTIVA',
  meta_total_arboles: 40,
  plan_revision: 3,
  metas: [
    { planta_id: 1, cantidad_objetivo: 10, porcentaje_objetivo: 33.33, planta: { id: 1, especie: 'Molle' } },
    { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 66.67, planta: { id: 2, especie: 'Tara' } },
  ],
}

describe('formulario compartido de meta y especies', () => {
  it('conserva exactamente el plan persistido sin inferir cantidades ni stock', () => {
    const value = createPlanFormFromPlan(savedPlan)
    expect(value.meta).toBe('40')
    expect(value.especies.map(item => [item.cantidad, item.porcentaje])).toEqual([
      ['10', '33.33'], ['30', '66.67'],
    ])
    expect(value.especies.every(item => !Object.hasOwn(item, 'saldo_disponible'))).toBe(true)
    expect(validatePlanForm(value).proposal).toEqual({ meta_total_arboles: 40, metas: [
      { planta_id: 1, cantidad_objetivo: 10, porcentaje_objetivo: 33.33 },
      { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 66.67 },
    ] })
  })

  it.each([
    ['10', ['33', '33', '34'], ['3', '3', '4']],
    ['3', ['33.33', '33.33', '33.34'], ['1', '1', '1']],
  ])('las cantidades visibles y guardadas cierran la meta %s con el mismo reparto', (meta, percentages, quantities) => {
    const value = recalculatePlanQuantities(form(meta, percentages.map((pct, index) => species(index + 1, pct, ''))))
    expect(value.especies.map(item => item.cantidad)).toEqual(quantities)
    const proposal = validatePlanForm(value).proposal
    expect(proposal?.metas.map(item => String(item.cantidad_objetivo))).toEqual(quantities)
    expect(proposal?.metas.reduce((sum, item) => sum + item.cantidad_objetivo, 0)).toBe(Number(meta))
  })

  it('distribuye las centésimas libres al agregar una o varias especies', () => {
    const current = form('100', [species(1, '33.33', '33')])
    const catalog = (planta_id: number) => ({ planta_id, especie: `Especie ${planta_id}`, nombre_cientifico: '', saldo_disponible: 0 })
    const single = addPlanCatalogSpecies(current, [catalog(2)])
    expect(single.especies.map(item => item.porcentaje)).toEqual(['33.33', '66.67'])
    const multiple = addPlanCatalogSpecies(current, [catalog(2), catalog(3), catalog(4)])
    expect(multiple.especies.map(item => item.porcentaje)).toEqual(['33.33', '22.23', '22.22', '22.22'])
    expect(getPlanPercentageTotal(multiple.especies)).toBe(100)
    expect(validatePlanForm(multiple).proposal?.meta_total_arboles).toBe(100)
    expect(current.especies).toEqual([species(1, '33.33', '33')])
  })

  it('excluye especies ya seleccionadas y repeticiones dentro de una selección', () => {
    const current = form('40', [species(1, '50', '20')])
    const value = addPlanCatalogSpecies(current, [
      { planta_id: 1, especie: 'Molle duplicado', nombre_cientifico: '' },
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0 },
      { planta_id: 2, especie: 'Tara duplicada', nombre_cientifico: '', saldo_disponible: 99 },
    ])
    expect(value.especies.map(item => item.planta_id)).toEqual([1, 2])
    expect(value.especies[1]).toMatchObject({ especie: 'Tara', porcentaje: '50', cantidad: '20', saldo_disponible: 0 })
  })

  it('agrega a 0% cuando el mix completo no tiene porcentaje libre', () => {
    const value = addPlanCatalogSpecies(form('40', [species(1, '100', '40')]), [
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0 },
    ])
    expect(value.especies[1]).toMatchObject({ porcentaje: '0', cantidad: '0', saldo_disponible: 0 })
    expect(validatePlanForm(value).proposal).toBeNull()
    expect(validatePlanForm(value, { omitZeroPercent: true }).proposal?.metas).toEqual([
      { planta_id: 1, cantidad_objetivo: 40, porcentaje_objetivo: 100 },
    ])
  })

  it.each(['', '0', '1.5', '9007199254740992'])('no recalcula ni borra cantidades con meta inválida %s', meta => {
    const value = form(meta, [species(1, '33.33', '10'), species(2, '66.67', '30')])
    expect(recalculatePlanQuantities(value)).toBe(value)
    expect(validatePlanForm(value).proposal).toBeNull()
    expect(validatePlanForm(value).errors.meta).toBeTruthy()
  })

  it.each(['', '-1', '100.01', '33.333'])('conserva cantidades si se introduce un porcentaje inválido %s', pct => {
    const value = form('40', [species(1, pct, '10'), species(2, '66.67', '30')])
    expect(recalculatePlanQuantities(value)).toBe(value)
    expect(validatePlanForm(value).errors.especies[0].porcentaje).toBeTruthy()
  })

  it('valida cantidades positivas enteras, unicidad y ambos totales antes de guardar', () => {
    expect(validatePlanForm(form('40', [species(1, '100', '39.5')])).errors.especies[0].cantidad).toBeTruthy()
    expect(validatePlanForm(form('40', [species(1, '100', '0')])).errors.especies[0].cantidad).toBeTruthy()
    expect(validatePlanForm(form('40', [species(1, '100', '39')])).errors.plan).toBe('Las cantidades por especie deben sumar la meta total.')
    expect(validatePlanForm(form('40', [species(1, '99', '40')])).errors.plan).toBe('Los porcentajes de las especies deben sumar 100%.')
    const duplicate = form('40', [species(1, '50', '20'), species(1, '50', '20')])
    expect(recalculatePlanQuantities(duplicate)).toBe(duplicate)
    expect(validatePlanForm(duplicate, { omitZeroPercent: true }).errors.plan).toBe('El plan no puede contener especies duplicadas.')
    expect(validatePlanForm(form('40', [])).proposal).toBeNull()
  })

  it('omite 0% solo al solicitarlo y nunca admite un plan compuesto únicamente por ceros', () => {
    const value = form('40', [species(1, '100', '40'), species(2, '0', '')])
    expect(validatePlanForm(value).proposal).toBeNull()
    expect(validatePlanForm(value, { omitZeroPercent: true }).proposal?.metas).toHaveLength(1)
    expect(validatePlanForm(form('40', [species(1, '0', '')]), { omitZeroPercent: true }).proposal).toBeNull()
  })

  it('mantiene porcentajes decimales y la referencia de vivero al preparar y recuperar un draft', () => {
    const value = createPlanFormFromDraft(3, [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', saldo_disponible: 7, pct: 33.33 },
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0, pct: 66.67 },
    ])
    expect(getPlanPercentageTotal(value.especies)).toBe(100)
    expect(planFormToDraft(value).map(item => [item.pct, item.saldo_disponible])).toEqual([[33.33, 7], [66.67, 0]])
    expect(value.especies.reduce((sum, item) => sum + Number(item.cantidad), 0)).toBe(3)
  })

  it('acepta la coma decimal sin perder precisión en el payload', () => {
    const value = form('3', [species(1, '33,33', '1'), species(2, '66,67', '2')])
    expect(validatePlanForm(value).proposal?.metas.map(item => item.porcentaje_objetivo)).toEqual([33.33, 66.67])
    expect(getPlanPercentageTotal(value.especies)).toBe(100)
  })
})
