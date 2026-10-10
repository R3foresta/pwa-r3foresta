import { useState } from 'react'
import {
  addPlanCatalogSpecies, planPercentage, positivePlanInteger, recalculatePlanQuantities,
  type PlanEspecieForm, type PlanMetaEspeciesValue,
} from '../utils/planMetaEspeciesForm'

type Options = { disabled?: boolean; maxMeta?: number; onChange?: () => void }

/** Estado de UI compartido; carga y persistencia pertenecen a cada flujo. */
export function usePlanMetaEspeciesForm(initial: () => PlanMetaEspeciesValue, options: Options = {}) {
  const [value, setValue] = useState(initial)
  const update = (transform: (current: PlanMetaEspeciesValue) => PlanMetaEspeciesValue) => {
    if (options.disabled) return
    setValue(transform)
    options.onChange?.()
  }
  const changeMeta = (raw: string) => update(current => {
    const parsed = positivePlanInteger(raw)
    const meta = options.maxMeta !== undefined && parsed !== null ? String(Math.min(parsed, options.maxMeta)) : raw
    return recalculatePlanQuantities({ ...current, meta })
  })
  const changePercentage = (index: number, porcentaje: string) => update(current => recalculatePlanQuantities({
    ...current, especies: current.especies.map((item, position) => position === index ? { ...item, porcentaje } : item),
  }))
  const changeQuantity = (index: number, cantidad: string) => update(current => ({
    ...current, especies: current.especies.map((item, position) => position === index ? { ...item, cantidad } : item),
  }))
  const stepMeta = (delta: number) => update(current => {
    const meta = Math.max(0, Math.min(options.maxMeta ?? Number.MAX_SAFE_INTEGER, (positivePlanInteger(current.meta) ?? 0) + delta))
    return recalculatePlanQuantities({ ...current, meta: meta === 0 ? '' : String(meta) })
  })
  const stepPercentage = (index: number, delta: number) => update(current => recalculatePlanQuantities({
    ...current, especies: current.especies.map((item, position) => position === index ? {
      ...item, porcentaje: String(Math.max(0, Math.min(100, Math.round(((planPercentage(item.porcentaje) ?? 0) + delta) * 100) / 100))),
    } : item),
  }))
  const addSpecies = (items: Omit<PlanEspecieForm, 'cantidad' | 'porcentaje'>[]) => update(current => addPlanCatalogSpecies(current, items))
  const removeSpecies = (index: number) => update(current => recalculatePlanQuantities({
    ...current, especies: current.especies.filter((_, position) => position !== index),
  }))
  const recalculate = () => update(recalculatePlanQuantities)
  return { value, setValue, changeMeta, changePercentage, changeQuantity, stepMeta, stepPercentage, addSpecies, removeSpecies, recalculate }
}
