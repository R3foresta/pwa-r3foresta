import type { GetPlanData, PlanEspecieMetaInput } from '../types/contracts'
import { buildPlanMetasPayload } from './planMetas'
import type { SubcampaniaEspecieDraft } from './subcampaniaDraft'

export type PlanEspecieForm = {
  planta_id: number
  especie: string
  nombre_cientifico: string
  nombre_comun_principal?: string | null
  /** Referencia de vivero; no es stock asignado a la subcampaña. */
  saldo_disponible?: number
  cantidad: string
  porcentaje: string
}

export type PlanMetaEspeciesValue = { meta: string; especies: PlanEspecieForm[] }
export type PlanFormErrors = {
  meta?: string
  plan?: string
  especies: Array<{ cantidad?: string; porcentaje?: string }>
}
export type PlanFormProposal = { meta_total_arboles: number; metas: PlanEspecieMetaInput[] }
export const PERCENT_TOLERANCE = 0.000001

export function getPlanEspecieNombre(item: PlanEspecieForm): string {
  return item.nombre_comun_principal || item.especie || `Especie #${item.planta_id}`
}

export function positivePlanInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/** 0% permite preparar un mix incompleto; no es un objetivo persistible. */
export function planPercentage(raw: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
}

export function getPlanPercentageTotal(especies: PlanEspecieForm[]): number {
  return especies.reduce((sum, item) => sum + Math.round((planPercentage(item.porcentaje) ?? 0) * 100), 0) / 100
}

/** Mismo reparto que se guarda. No corrige entradas inválidas silenciosamente. */
export function recalculatePlanQuantities(value: PlanMetaEspeciesValue): PlanMetaEspeciesValue {
  const meta = positivePlanInteger(value.meta)
  const percentages = value.especies.map(item => planPercentage(item.porcentaje))
  if (meta === null || percentages.some(pct => pct === null) ||
    new Set(value.especies.map(item => item.planta_id)).size !== value.especies.length) return value
  const quantities = new Map(buildPlanMetasPayload(meta, value.especies.map((item, index) => ({
    planta_id: item.planta_id, pct: percentages[index]!,
  }))).map(item => [item.planta_id, item.cantidad_objetivo]))
  return { ...value, especies: value.especies.map(item => ({
    ...item, cantidad: String(quantities.get(item.planta_id) ?? 0),
  })) }
}

export function createPlanFormFromPlan(plan: GetPlanData): PlanMetaEspeciesValue {
  return { meta: String(plan.meta_total_arboles), especies: plan.metas.map(item => ({
    planta_id: item.planta_id, especie: item.planta?.especie || `Especie #${item.planta_id}`,
    nombre_cientifico: item.planta?.nombre_cientifico || '',
    cantidad: String(item.cantidad_objetivo), porcentaje: String(item.porcentaje_objetivo),
  })) }
}

export function createPlanFormFromDraft(meta: number, especies: SubcampaniaEspecieDraft[]): PlanMetaEspeciesValue {
  return recalculatePlanQuantities({ meta: meta === 0 ? '' : String(meta), especies: especies.map(item => ({
    ...item, cantidad: '', porcentaje: String(item.pct),
  })) })
}

export function planFormToDraft(value: PlanMetaEspeciesValue): SubcampaniaEspecieDraft[] {
  return value.especies.map(item => ({ planta_id: item.planta_id, especie: item.especie,
    nombre_cientifico: item.nombre_cientifico, nombre_comun_principal: item.nombre_comun_principal,
    saldo_disponible: item.saldo_disponible, pct: planPercentage(item.porcentaje) ?? 0,
  }))
}

/** Distribuye únicamente el porcentaje libre en centésimas, sin alterar el mix anterior. */
export function addPlanCatalogSpecies(value: PlanMetaEspeciesValue, items: Omit<PlanEspecieForm, 'cantidad' | 'porcentaje'>[]): PlanMetaEspeciesValue {
  const existing = new Set(value.especies.map(item => item.planta_id))
  const unique = items.filter(item => {
    if (existing.has(item.planta_id)) return false
    existing.add(item.planta_id)
    return true
  })
  if (unique.length === 0) return value
  const remaining = Math.max(0, 10000 - Math.round(getPlanPercentageTotal(value.especies) * 100))
  const share = Math.floor(remaining / unique.length)
  const remainder = remaining % unique.length
  return recalculatePlanQuantities({ ...value, especies: [...value.especies, ...unique.map((item, index) => ({
    ...item, cantidad: '0', porcentaje: String((share + (index < remainder ? 1 : 0)) / 100),
  }))] })
}

export function validatePlanForm(value: PlanMetaEspeciesValue, options: { omitZeroPercent?: boolean } = {}) {
  const errors: PlanFormErrors = { especies: [] }
  const goal = positivePlanInteger(value.meta)
  if (goal === null) errors.meta = 'La meta debe ser un número entero positivo.'
  const metas: PlanEspecieMetaInput[] = []
  for (const item of value.especies) {
    const qty = positivePlanInteger(item.cantidad)
    const pct = planPercentage(item.porcentaje)
    const omit = options.omitZeroPercent && pct === 0
    errors.especies.push(omit ? {} : {
      ...(qty === null ? { cantidad: 'Indica una cantidad entera positiva.' } : {}),
      ...(pct === null || pct === 0 ? { porcentaje: 'Indica un porcentaje mayor que 0 y hasta 100, con máximo 2 decimales.' } : {}),
    })
    if (!omit && qty !== null && pct !== null && pct > 0) metas.push({
      planta_id: item.planta_id, cantidad_objetivo: qty, porcentaje_objetivo: pct,
    })
  }
  if (value.especies.length === 0) errors.plan = 'Agrega al menos una especie al plan.'
  else if (new Set(value.especies.map(item => item.planta_id)).size !== value.especies.length) errors.plan = 'El plan no puede contener especies duplicadas.'
  else if (errors.especies.every(item => !item.cantidad && !item.porcentaje)) {
    if (metas.length === 0 || Math.abs(getPlanPercentageTotal(value.especies) - 100) > PERCENT_TOLERANCE) {
      errors.plan = 'Los porcentajes de las especies deben sumar 100%.'
    } else if (goal !== null && metas.reduce((sum, item) => sum + item.cantidad_objetivo, 0) !== goal) {
      errors.plan = 'Las cantidades por especie deben sumar la meta total.'
    }
  }
  const valid = !errors.meta && !errors.plan && errors.especies.every(item => !item.cantidad && !item.porcentaje)
  const proposal: PlanFormProposal | null = valid && goal !== null ? { meta_total_arboles: goal, metas } : null
  return { errors, proposal }
}
