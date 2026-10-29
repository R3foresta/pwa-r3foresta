import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ImpactoMapProps } from '../../impacto/components/ImpactoMap'
import type { ImpactoPunto } from '../../impacto/types'
import { safeImpactoReturn } from '../../impacto/utils/consulta'
import type { GeoJsonPolygon, Subcampania } from '../types/contracts'
import CampaniaMapPanel from './CampaniaMapPanel'

vi.mock('../../impacto/components/ImpactoMapPanel', () => ({
  default: ({ subcampanias, puntos, seleccion, onSelect, recordReturnTo }: ImpactoMapProps) => <div
    data-testid="mapa-campania" data-scopes={subcampanias.map(scope => scope.id).join(',')}
    data-points={puntos.map(point => point.registro_id).join(',')} data-selection={seleccion}
    data-poligonos={JSON.stringify(subcampanias.map(scope => scope.poligono))}
    data-return={typeof recordReturnTo === 'function' ? puntos[0] ? recordReturnTo(puntos[0].registro_id) : undefined : recordReturnTo}>
    {subcampanias.map(scope => <button key={scope.id} onClick={() => onSelect(`s:${scope.id}`)}>Zona {scope.id}</button>)}
    {puntos.map(point => <button key={point.registro_id} onClick={() => onSelect(`r:${point.registro_id}`)}>Punto {point.registro_id}</button>)}
  </div>,
}))

const campaignId = '9007199254740993'
const recordId = '9007199254740995'
const secondRecordId = '9007199254740997'
const basePath = `/app/planting/campanias/${campaignId}`
const polygon: GeoJsonPolygon = { type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]]] }

function subcampania(id: number, nombre: string): Subcampania {
  return { id, nombre, campania_id: 800, zona_id: 1, zona_nombre: 'Zona territorial', estado: 'ACTIVA',
    meta_total_arboles: 40, created_at: '2026-10-28', poligono: polygon }
}

function point(id: string, scopeId: string, reposicion = false): ImpactoPunto {
  return { registro_id: id, subcampania_id: scopeId, longitud: -68.15, latitud: -16.55,
    cantidad_total_plantada: 10, es_reposicion: reposicion, url_publica: `/impacto/registros/${id}` }
}

function props(): ComponentProps<typeof CampaniaMapPanel> {
  const subcampanias = [subcampania(826, 'Zona norte'), subcampania(827, 'Zona sur')]
  return { campaniaId: campaignId, nombre: 'Campaña interna', subcampanias,
    zonas: subcampanias.map(sub => ({ id: String(sub.id), nombre: sub.nombre, poligono: sub.poligono ?? null })),
    puntos: [point(recordId, '826'), point(secondRecordId, '827', true)], loading: false, error: null, onRetry: vi.fn() }
}

function Destination({ kind }: { kind: 'record' | 'subcampania' }) {
  const { state } = useLocation()
  const returnTo = safeImpactoReturn(kind === 'record' ? state?.impactoReturnTo : state?.campaniaReturnTo)
  return <><p data-testid="return">{returnTo}</p><Link to={returnTo ?? '/impacto'}>Volver a campaña</Link></>
}

function LocationOutput() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

function Tree({ current = props(), initialPath = `${basePath}?pestana=mapa` }: {
  current?: ReturnType<typeof props>; initialPath?: string
}) {
  return <MemoryRouter initialEntries={[initialPath]}><Routes>
    <Route path="/app/planting/campanias/:campaniaId" element={<CampaniaMapPanel {...current} />} />
    <Route path="/app/planting/subcampanias/:subcampaniaId" element={<Destination kind="subcampania" />} />
    <Route path="/impacto/registros/:registroId" element={<Destination kind="record" />} />
  </Routes><LocationOutput /></MemoryRouter>
}

describe('Mapa interno de campaña', () => {
  it('selecciona una zona, filtra sus puntos y permite volver a toda la campaña', () => {
    render(<Tree />)
    const map = screen.getByTestId('mapa-campania')
    expect(map.getAttribute('data-scopes')).toBe('826,827')
    expect(map.getAttribute('data-points')).toBe(`${recordId},${secondRecordId}`)
    fireEvent.click(screen.getByRole('button', { name: 'Zona 826' }))
    expect(map.getAttribute('data-scopes')).toBe('826')
    expect(map.getAttribute('data-points')).toBe(recordId)
    expect(map.getAttribute('data-selection')).toBe('s:826')
    expect((screen.getByRole('combobox', { name: 'Ver subcampaña' }) as HTMLSelectElement).value).toBe('826')
    expect(screen.getByRole('heading', { name: 'Zona norte' })).toBeTruthy()
    expect(screen.getByText('Meta: 40 árboles')).toBeTruthy()
    expect(screen.getByText('Zona territorial')).toBeTruthy()
    expect(screen.queryByRole('option', { name: new RegExp(secondRecordId) })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ver toda la campaña' }))
    expect(map.getAttribute('data-scopes')).toBe('826,827')
    expect(map.getAttribute('data-points')).toBe(`${recordId},${secondRecordId}`)
    expect(map.getAttribute('data-selection')).toBeNull()
    expect(screen.getByTestId('location').textContent).toBe(`${basePath}?pestana=mapa`)
    expect(screen.queryByRole('link', { name: 'Abrir detalle de subcampaña' })).toBeNull()
  })

  it('abre la ficha desde un punto y vuelve al mismo registro conservando BIGINT exacto', () => {
    render(<Tree />)
    fireEvent.click(screen.getByRole('button', { name: `Punto ${secondRecordId}` }))
    const map = screen.getByTestId('mapa-campania')
    const returnTo = `${basePath}?pestana=mapa&subcampania=827&registro=${secondRecordId}`
    expect(map.getAttribute('data-scopes')).toBe('827')
    expect(map.getAttribute('data-selection')).toBe(`r:${secondRecordId}`)
    expect(map.getAttribute('data-return')).toBe(returnTo)
    expect(safeImpactoReturn(map.getAttribute('data-return'))).toBe(returnTo)
    expect(screen.getByText('10 plantas de reposición · Registro grupal')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir ficha pública' }).getAttribute('href')).toBe(`/impacto/registros/${secondRecordId}`)
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('return').textContent).toBe(returnTo)
    fireEvent.click(screen.getByRole('link', { name: 'Volver a campaña' }))
    expect(screen.getByTestId('mapa-campania').getAttribute('data-selection')).toBe(`r:${secondRecordId}`)
    expect((screen.getByRole('combobox', { name: 'Seleccionar plantación' }) as HTMLSelectElement).value).toBe(secondRecordId)
  })

  it('abre el detalle de subcampaña con retorno a campaña y selección de registro', () => {
    const returnTo = `${basePath}?pestana=mapa&subcampania=826&registro=${recordId}`
    render(<Tree initialPath={returnTo} />)
    const link = screen.getByRole('link', { name: 'Abrir detalle de subcampaña' })
    expect(link.getAttribute('href')).toBe('/app/planting/subcampanias/826')
    fireEvent.click(link)
    expect(screen.getByTestId('return').textContent).toBe(returnTo)
    fireEvent.click(screen.getByRole('link', { name: 'Volver a campaña' }))
    expect(screen.getByTestId('mapa-campania').getAttribute('data-selection')).toBe(`r:${recordId}`)
  })

  it('selecciona desde listas una zona sin geometría y conserva el acceso a su detalle', () => {
    const current = props()
    current.zonas[1].poligono = null
    current.subcampanias[1].poligono = null
    current.puntos = []
    render(<Tree current={current} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Ver subcampaña' }), { target: { value: '827' } })
    expect(screen.getByTestId('mapa-campania').getAttribute('data-poligonos')).toBe('[null]')
    expect(screen.getByText('El polígono de esta subcampaña no está disponible en las consultas actuales.')).toBeTruthy()
    expect(screen.getByText('No hay ubicaciones de plantaciones publicadas disponibles en este alcance.')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Abrir detalle de subcampaña' }))
    expect(screen.getByTestId('return').textContent).toBe(`${basePath}?pestana=mapa&subcampania=827`)
  })

  it('infiere la subcampaña desde un registro enlazado y puede quitar la selección de plantación', () => {
    render(<Tree initialPath={`${basePath}?pestana=mapa&registro=${recordId}`} />)
    const map = screen.getByTestId('mapa-campania')
    expect(map.getAttribute('data-scopes')).toBe('826')
    expect(map.getAttribute('data-selection')).toBe(`r:${recordId}`)
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar plantación' }), { target: { value: '' } })
    expect(map.getAttribute('data-selection')).toBe('s:826')
    expect(screen.getByTestId('location').textContent).toBe(`${basePath}?pestana=mapa&subcampania=826`)
    expect(screen.queryByRole('link', { name: 'Abrir ficha pública' })).toBeNull()
  })

  it('informa una subcampaña inexistente sin elegir otra en su lugar', () => {
    render(<Tree initialPath={`${basePath}?pestana=mapa&subcampania=999&registro=${recordId}`} />)
    expect(screen.getByText('La subcampaña seleccionada no está disponible en esta campaña.')).toBeTruthy()
    expect(screen.getByText('La plantación seleccionada no está disponible en esta consulta del mapa.')).toBeTruthy()
    expect(screen.getByTestId('mapa-campania').getAttribute('data-selection')).toBeNull()
    expect(screen.getByTestId('mapa-campania').getAttribute('data-scopes')).toBe('826,827')
    expect(screen.queryByRole('link', { name: 'Abrir detalle de subcampaña' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Abrir ficha pública' })).toBeNull()
  })

  it('rechaza la selección de un registro de otra subcampaña', () => {
    render(<Tree initialPath={`${basePath}?pestana=mapa&subcampania=826&registro=${secondRecordId}`} />)
    expect(screen.getByTestId('mapa-campania').getAttribute('data-selection')).toBe('s:826')
    expect(screen.getByTestId('mapa-campania').getAttribute('data-points')).toBe(recordId)
    expect(screen.getByText('La plantación seleccionada no está disponible en esta consulta del mapa.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Abrir ficha pública' })).toBeNull()
  })

  it('distingue carga, 404 y fallo de lectura de un mapa vacío y conserva sus polígonos al reintentar', () => {
    const retry = vi.fn()
    const current = { ...props(), puntos: [], onRetry: retry }
    const view = render(<Tree current={{ ...current, loading: true }} />)
    expect(screen.getByText('Consultando las ubicaciones publicadas de la campaña…')).toBeTruthy()
    expect(screen.queryByText(/No hay ubicaciones de plantaciones publicadas/)).toBeNull()
    view.rerender(<Tree current={{ ...current, error: Object.assign(new Error('No publicado'), { status: 404 }) }} />)
    expect(screen.getByText(/Esto no significa que no existan polígonos o plantaciones internas/).getAttribute('role')).toBe('status')
    expect(screen.queryByText(/No hay ubicaciones de plantaciones publicadas/)).toBeNull()
    expect(screen.getByTestId('mapa-campania').getAttribute('data-scopes')).toBe('826,827')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ubicaciones' }))
    expect(retry).toHaveBeenCalledOnce()
    view.rerender(<Tree current={{ ...current, error: new Error('Sin conexión') }} />)
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    expect(screen.queryByText(/No hay ubicaciones de plantaciones publicadas/)).toBeNull()
    view.rerender(<Tree current={current} />)
    expect(screen.getByText(/No hay ubicaciones de plantaciones publicadas/)).toBeTruthy()
  })

  it('muestra campaña sin subcampañas sin inventar posiciones ni seleccionar registros', () => {
    render(<Tree current={{ ...props(), subcampanias: [], zonas: [], puntos: [] }} />)
    expect(screen.getByText('No hay subcampañas disponibles en esta campaña.')).toBeTruthy()
    expect(screen.getByTestId('mapa-campania').getAttribute('data-scopes')).toBe('')
    expect(screen.getByTestId('mapa-campania').getAttribute('data-points')).toBe('')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Abrir detalle de subcampaña' })).toBeNull()
  })
})
