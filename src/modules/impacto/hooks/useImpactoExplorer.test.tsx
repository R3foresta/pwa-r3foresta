import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { validarImpactoConsulta } from '../api/impacto.contract'
import examples from '../api/impacto.test-fixtures.json'
import type { ImpactoConsulta } from '../types'
import { useImpactoExplorer } from './useImpactoExplorer'
import type { ImpactoExplorerView } from './useImpactoExplorer'

const consultation = () => validarImpactoConsulta(structuredClone(examples.global)).data

// La pantalla persiste estos valores en la URL. Este harness reproduce la misma
// actualización atómica de vista/selección sin acoplar la lógica al router.
function useControlledExplorer(data: ImpactoConsulta, initialView: ImpactoExplorerView, initialSelected: string | null = null) {
  const [view, setView] = useState(initialView)
  const [selected, setSelected] = useState<string | null>(initialSelected)
  const explorer = useImpactoExplorer({
    data, scope: { tipo: 'global' }, queryKey: '/impacto', selected, view,
    onViewChange(next) { setView(next); setSelected(null) },
    onSelectionChange: setSelected,
  })
  return { explorer, view, selected }
}

describe('exploración pública de Impacto', () => {
  it('distingue dos zonas de una misma localidad por su nombre específico', () => {
    const data = consultation()
    data.subcampanias[0].nombre = 'Calle 32'
    data.subcampanias[1].nombre = 'Laguna de Cotacota'
    data.subcampanias[0].zona = data.subcampanias[1].zona = 'Cota Cota'
    const { result } = renderHook(() => useControlledExplorer(data, { level: 'subcampania', focusId: null }))
    expect(result.current.explorer.choices.map(item => item.nombre)).toEqual(expect.arrayContaining(['Calle 32', 'Laguna de Cotacota']))
    const street = result.current.explorer.choices.find(item => item.nombre === 'Calle 32')!
    expect(street.context).toContain('Cota Cota')
    expect(street.context).toContain(data.campanias.find(item => item.id === data.subcampanias[0].campania_id)!.nombre)
  })

  it('restaura el nivel y el foco visual guardados al volver a montar', () => {
    const data = consultation()
    const campaign = data.campanias[1]
    const first = renderHook(() => useControlledExplorer(data, { level: 'subcampania', focusId: null }))
    act(() => first.result.current.explorer.setBrowseLevel('campania'))
    act(() => first.result.current.explorer.focusCard(campaign.id))
    const sharedView = first.result.current.view
    const visiblePoints = first.result.current.explorer.points.map(point => point.registro_id)
    first.unmount()

    const restored = renderHook(() => useControlledExplorer(data, sharedView))
    expect(restored.result.current.explorer.campaigns).toBe(true)
    expect(restored.result.current.explorer.choice?.nombre).toBe(campaign.nombre)
    expect(restored.result.current.explorer.zones.every(zone => zone.campania_id === campaign.id)).toBe(true)
    expect(restored.result.current.explorer.points.map(point => point.registro_id)).toEqual(visiblePoints)
  })

  it('seleccionar un punto conserva el foco del mapa y cambiar tarjeta retira esa selección', () => {
    const data = consultation()
    const firstZone = data.subcampanias[0]
    const point = data.mapa.find(item => item.subcampania_id === firstZone.id)!
    const nextZone = data.subcampanias[1]
    const { result } = renderHook(() => useControlledExplorer(data, { level: 'subcampania', focusId: firstZone.id }))
    act(() => result.current.explorer.select(`r:${point.registro_id}`))
    expect(result.current.selected).toBe(`r:${point.registro_id}`)
    expect(result.current.view.focusId).toBe(firstZone.id)
    act(() => result.current.explorer.focusCard(nextZone.id))
    expect(result.current.selected).toBeNull()
    expect(result.current.view.focusId).toBe(nextZone.id)
    expect(result.current.explorer.zones.map(zone => zone.id)).toEqual([nextZone.id])
    act(() => result.current.explorer.showAll())
    expect(result.current.view.focusId).toBeNull()
    expect(result.current.explorer.points).toHaveLength(data.mapa.length)
  })

  it('informa un foco que ya no está disponible y conserva las ubicaciones de la consulta', () => {
    const data = consultation()
    const { result } = renderHook(() => useControlledExplorer(data, { level: 'subcampania', focusId: '999999999' }))
    expect(result.current.explorer.unavailableFocus).toBe(true)
    expect(result.current.explorer.choice).toBeUndefined()
    expect(result.current.explorer.zones).toHaveLength(data.subcampanias.length)
    expect(result.current.explorer.points).toHaveLength(data.mapa.length)
  })

  it('mantiene visible la selección si un enlace conserva el foco de otra zona', () => {
    const data = consultation()
    const focusedZone = data.subcampanias[0]
    const selectedZone = data.subcampanias[1]
    const { result } = renderHook(() => useControlledExplorer(data, { level: 'subcampania', focusId: focusedZone.id }, `s:${selectedZone.id}`))
    expect(result.current.explorer.incompatibleFocus).toBe(true)
    expect(result.current.explorer.unavailableFocus).toBe(false)
    expect(result.current.explorer.choice?.id).toBe(selectedZone.id)
    expect(result.current.explorer.mapChoice).toBeUndefined()
    expect(result.current.explorer.zones).toHaveLength(data.subcampanias.length)
    expect(result.current.explorer.points).toHaveLength(data.mapa.length)
  })
})
