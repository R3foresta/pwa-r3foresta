import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ImpactoMapProps } from '../../impacto/components/ImpactoMap'
import publicExamples from '../../impacto/api/impacto.test-fixtures.json'
import type { ImpactoRegistro } from '../../impacto/types'
import { safeImpactoReturn } from '../../impacto/utils/consulta'
import SubcampaniaPlantacionesMap from './SubcampaniaPlantacionesMap'

vi.mock('../../impacto/components/ImpactoMapPanel', () => ({
  default: ({ subcampanias, puntos, seleccion, onSelect, recordReturnTo }: ImpactoMapProps) => <div
    data-testid="mapa-compartido" data-scopes={subcampanias.map(scope => scope.id).join(',')}
    data-points={puntos.map(point => point.registro_id).join(',')} data-selection={seleccion}
    data-poligono={JSON.stringify(subcampanias[0]?.poligono)} data-return={typeof recordReturnTo === 'function' ? recordReturnTo(puntos[0]?.registro_id ?? '') : recordReturnTo}>
    {puntos.map(point => <button key={point.registro_id} onClick={() => onSelect(`r:${point.registro_id}`)}>Punto {point.registro_id}</button>)}
    <button onClick={() => onSelect(`s:${subcampanias[0].id}`)}>Zona del mapa</button>
  </div>,
}))

const scopeId = '9007199254740993'
const recordId = '9007199254740995'
const foreignRecordId = '9007199254740997'
const source = publicExamples.subcampania.data.registros[0] as ImpactoRegistro
const record = { ...source, id: recordId, subcampania_id: scopeId, codigo_trazabilidad: 'PLT-DEL-AMBITO' }
const point = {
  registro_id: recordId, subcampania_id: scopeId, longitud: -68.15, latitud: -16.55,
  cantidad_total_plantada: 10, es_reposicion: false, url_publica: `/impacto/registros/${recordId}`,
}

function props(): ComponentProps<typeof SubcampaniaPlantacionesMap> {
  return {
    subcampania: { id: scopeId, nombre: 'Zona compartida', poligono: null },
    puntos: [point], registros: [record], loading: false, error: null, onRetry: vi.fn(), publishedRecords: 1,
  }
}

function Destination() {
  const location = useLocation()
  const returnTo = safeImpactoReturn(location.state?.impactoReturnTo)
  return <><p data-testid="return">{returnTo}</p><Link to={returnTo ?? '/impacto'}>Volver al mapa</Link></>
}

function Tree({ current = props(), initialPath = `/app/planting/subcampanias/${scopeId}?pestana=mapa` }: {
  current?: ReturnType<typeof props>; initialPath?: string
}) {
  return <MemoryRouter initialEntries={[initialPath]}><Routes>
    <Route path="/app/planting/subcampanias/:subcampaniaId" element={<SubcampaniaPlantacionesMap {...current} />} />
    <Route path="/impacto/registros/:registroId" element={<Destination />} />
  </Routes></MemoryRouter>
}

describe('Mapa de plantaciones compartido por las audiencias de subcampaña', () => {
  it('limita puntos, selección y snapshots al ámbito abierto sin perder IDs BIGINT', () => {
    const current = props()
    current.puntos.push({ ...point, registro_id: foreignRecordId, subcampania_id: '901' })
    current.registros = [{ ...record, subcampania_id: '901', codigo_trazabilidad: 'SNAPSHOT-AJENO' }]
    render(<Tree current={current} />)
    const map = screen.getByTestId('mapa-compartido')
    expect(map.getAttribute('data-scopes')).toBe(scopeId)
    expect(map.getAttribute('data-points')).toBe(recordId)
    expect(screen.queryByRole('button', { name: `Punto ${foreignRecordId}` })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: `Punto ${recordId}` }))
    expect(map.getAttribute('data-selection')).toBe(`r:${recordId}`)
    expect((screen.getByRole('combobox', { name: 'Seleccionar plantación' }) as HTMLSelectElement).value).toBe(recordId)
    expect(screen.queryByText('SNAPSHOT-AJENO')).toBeNull()
    expect(screen.getByRole('link', { name: 'Abrir ficha pública' }).getAttribute('href')).toBe(`/impacto/registros/${recordId}`)
  })

  it('abre la ficha pública y vuelve a la misma pestaña y selección desde un retorno validado', () => {
    render(<Tree />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar plantación' }), { target: { value: recordId } })
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('return').textContent).toBe(`/app/planting/subcampanias/${scopeId}?pestana=mapa&registro=${recordId}`)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al mapa' }))
    expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`r:${recordId}`)
    expect(screen.getByText('PLT-DEL-AMBITO')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Zona del mapa' }))
    expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`s:${scopeId}`)
    expect(screen.queryByRole('link', { name: 'Abrir ficha pública' })).toBeNull()
  })

  it('conserva puntos y acceso al detalle aunque el polígono no esté disponible', () => {
    render(<Tree initialPath={`/app/planting/subcampanias/${scopeId}?pestana=mapa&registro=${recordId}`} />)
    expect(screen.getByTestId('mapa-compartido').getAttribute('data-points')).toBe(recordId)
    expect(screen.getByTestId('mapa-compartido').getAttribute('data-poligono')).toBe('null')
    expect(screen.getByText(/El polígono no está disponible/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir ficha pública' })).toBeTruthy()
    expect(safeImpactoReturn(screen.getByTestId('mapa-compartido').getAttribute('data-return'))).toBeTruthy()
  })

  it('no trata la carga ni un error de lectura como ausencia confirmada de plantaciones y permite reintentar', () => {
    const retry = vi.fn()
    const base = { ...props(), puntos: [], registros: [], publishedRecords: 0 }
    const view = render(<Tree current={{ ...base, loading: true }} />)
    expect(screen.getByText('Consultando las plantaciones del mapa…')).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    view.rerender(<Tree current={{ ...base, error: Object.assign(new Error('No publicado'), { status: 404 }), onRetry: retry }} />)
    expect(screen.getByText(/Esto no significa que no existan registros/)).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar plantaciones del mapa' }))
    expect(retry).toHaveBeenCalledOnce()
    view.rerender(<Tree current={base} />)
    expect(screen.getByText(/Todavía no hay plantaciones/)).toBeTruthy()
  })

  it('no muestra la ficha de una selección que dejó de estar en el mapa', () => {
    render(<Tree current={{ ...props(), puntos: [], registros: [] }} initialPath={`/app/planting/subcampanias/${scopeId}?pestana=mapa&registro=${recordId}`} />)
    expect(screen.getByText(/plantación seleccionada no está disponible/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Abrir ficha pública' })).toBeNull()
  })
})
