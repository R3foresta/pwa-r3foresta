import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePlanMetaEspeciesForm } from './usePlanMetaEspeciesForm'
import { validatePlanForm, type PlanMetaEspeciesValue } from '../utils/planMetaEspeciesForm'

function initialValue(): PlanMetaEspeciesValue {
  return { meta: '40', especies: [
    { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '10', porcentaje: '33.33' },
    { planta_id: 2, especie: 'Tara', nombre_cientifico: '', cantidad: '30', porcentaje: '66.67' },
  ] }
}

describe('estado compartido de meta y especies', () => {
  it('carga cantidades exactas y calcula automáticamente solo después de cambiar la meta', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => usePlanMetaEspeciesForm(initialValue, { onChange }))
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['10', '30'])
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current.changeMeta('60'))
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['19', '41'])
    expect(validatePlanForm(result.current.value).proposal?.meta_total_arboles).toBe(60)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('recalcula al ajustar los porcentajes y representa las entradas intermedias incompletas', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(() => ({ meta: '40', especies: [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '20', porcentaje: '50' },
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', cantidad: '20', porcentaje: '50' },
    ] })))
    act(() => result.current.changePercentage(0, '40'))
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['16', '20'])
    expect(validatePlanForm(result.current.value).proposal).toBeNull()
    act(() => result.current.changePercentage(1, '60'))
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['16', '24'])
    expect(validatePlanForm(result.current.value).proposal?.metas.map(item => item.cantidad_objetivo)).toEqual([16, 24])
  })

  it('cambia 40 a 60 sin necesitar editar manualmente cantidades', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(() => ({ meta: '40', especies: [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '40', porcentaje: '100' },
    ] })))
    act(() => result.current.changeMeta('60'))
    expect(validatePlanForm(result.current.value).proposal).toEqual({ meta_total_arboles: 60,
      metas: [{ planta_id: 1, cantidad_objetivo: 60, porcentaje_objetivo: 100 }],
    })
  })

  it('conserva cantidades y texto inválido mientras el usuario corrige meta o porcentaje', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(initialValue))
    act(() => result.current.changeMeta('1.5'))
    expect(result.current.value.meta).toBe('1.5')
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['10', '30'])
    act(() => result.current.changeMeta('40'))
    const before = result.current.value.especies.map(item => item.cantidad)
    act(() => result.current.changePercentage(0, '33.333'))
    expect(result.current.value.especies[0].porcentaje).toBe('33.333')
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(before)
  })

  it('mantiene una cantidad manual hasta que cambie una entrada de cálculo', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(initialValue))
    act(() => result.current.changeQuantity(0, '11'))
    expect(result.current.value.especies.map(item => item.cantidad)).toEqual(['11', '30'])
    expect(validatePlanForm(result.current.value).proposal).toBeNull()
    act(() => result.current.changeMeta('60'))
    expect(validatePlanForm(result.current.value).proposal?.meta_total_arboles).toBe(60)
  })

  it('bloquea todos los controles cuando se pierde permiso o se está guardando', () => {
    const onChange = vi.fn()
    const { result, rerender } = renderHook(({ disabled }) => usePlanMetaEspeciesForm(initialValue, { disabled, onChange }),
      { initialProps: { disabled: true } })
    const original = result.current.value
    act(() => {
      result.current.changeMeta('60')
      result.current.changePercentage(0, '50')
      result.current.changeQuantity(0, '20')
      result.current.stepMeta(100)
      result.current.stepPercentage(0, 5)
      result.current.addSpecies([{ planta_id: 3, especie: 'Queñua', nombre_cientifico: '' }])
      result.current.removeSpecies(0)
      result.current.recalculate()
    })
    expect(result.current.value).toBe(original)
    expect(onChange).not.toHaveBeenCalled()
    rerender({ disabled: false })
    act(() => result.current.changeMeta('60'))
    expect(result.current.value.meta).toBe('60')
    expect(onChange).toHaveBeenCalledOnce()
    rerender({ disabled: true })
    act(() => result.current.changeMeta('70'))
    expect(result.current.value.meta).toBe('60')
  })

  it('los ajustes de porcentaje respetan decimales y límites sin rebalancear las otras especies', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(initialValue))
    act(() => result.current.stepPercentage(0, 5))
    expect(result.current.value.especies.map(item => item.porcentaje)).toEqual(['38.33', '66.67'])
    act(() => result.current.stepPercentage(0, -100))
    expect(result.current.value.especies[0].porcentaje).toBe('0')
    act(() => result.current.stepPercentage(0, 150))
    expect(result.current.value.especies[0].porcentaje).toBe('100')
    expect(result.current.value.especies[1].porcentaje).toBe('66.67')
  })

  it('aplica el máximo opcional al editar y nunca trunca el valor precargado', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(() => ({ meta: '2000000', especies: [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '2000000', porcentaje: '100' },
    ] }), { maxMeta: 1000000 }))
    expect(result.current.value.meta).toBe('2000000')
    expect(result.current.value.especies[0].cantidad).toBe('2000000')
    act(() => result.current.stepMeta(100))
    expect(result.current.value.meta).toBe('1000000')
    act(() => result.current.stepMeta(-1000001))
    expect(result.current.value.meta).toBe('')
    act(() => result.current.stepMeta(100))
    expect(result.current.value.meta).toBe('100')
    act(() => result.current.changeMeta('2000000'))
    expect(result.current.value.meta).toBe('1000000')
    act(() => result.current.changeMeta('1.5'))
    expect(result.current.value.meta).toBe('1.5')
  })

  it('sin máximo opcional permite ajustar metas mayores al límite del wizard', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(() => ({ meta: '2000000', especies: [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '2000000', porcentaje: '100' },
    ] })))
    act(() => result.current.stepMeta(100))
    expect(result.current.value.meta).toBe('2000100')
    expect(result.current.value.especies[0].cantidad).toBe('2000100')
  })

  it('agrega sin duplicados, calcula el porcentaje libre y mantiene el retiro como propuesta local', () => {
    const { result } = renderHook(() => usePlanMetaEspeciesForm(() => ({ meta: '40', especies: [
      { planta_id: 1, especie: 'Molle', nombre_cientifico: '', cantidad: '20', porcentaje: '50' },
    ] })))
    act(() => result.current.addSpecies([
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0 },
      { planta_id: 2, especie: 'Tara duplicada', nombre_cientifico: '' },
    ]))
    expect(result.current.value.especies.map(item => [item.porcentaje, item.cantidad])).toEqual([['50', '20'], ['50', '20']])
    act(() => result.current.removeSpecies(1))
    expect(result.current.value.especies.map(item => item.planta_id)).toEqual([1])
    expect(validatePlanForm(result.current.value).proposal).toBeNull()
    act(() => result.current.changePercentage(0, '100'))
    expect(validatePlanForm(result.current.value).proposal?.metas).toEqual([
      { planta_id: 1, cantidad_objetivo: 40, porcentaje_objetivo: 100 },
    ])
  })
})
