import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PolygonMapPreviewProps } from '../../../components/map/PolygonMapPreview'
import { PlantacionService } from '../../../services/plantacion.service'
import { ImpactoService } from '../../impacto/api/impacto.api'
import type { ImpactoMapProps } from '../../impacto/components/ImpactoMap'
import type { ImpactoConsulta, ImpactoPunto, ImpactoSubcampania } from '../../impacto/types'
import type { Campania, GeoJsonPolygon, Subcampania } from '../types/contracts'
import CampaniaAdminDashboardScreen from './CampaniaAdminDashboardScreen'

const auth = vi.hoisted(() => ({ user: { id: '1', auth_id: 'auth-1', rol: 'ADMIN' } }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../../services/plantacion.service', () => ({ PlantacionService: {
  getCampania: vi.fn(), listSubcampaniasByCampania: vi.fn(), getSubcampania: vi.fn(),
  getCampaniaMetrics: vi.fn(), getCampaniaActivity: vi.fn(),
} }))
vi.mock('../../impacto/api/impacto.api', () => ({ ImpactoService: { consultar: vi.fn() } }))
vi.mock('../../../components/map/PolygonMapPreview', () => ({
  default: ({ polygons, label, onClick }: PolygonMapPreviewProps) => <button
    type="button" onClick={onClick} aria-label="Ver mapa completo" data-testid="preview"
    data-polygons={JSON.stringify(polygons)}>{label}</button>,
}))
vi.mock('../../impacto/components/ImpactoMapPanel', () => ({
  default: ({ subcampanias, puntos, seleccion, onSelect }: ImpactoMapProps) => <div
    data-testid="map" data-zones={JSON.stringify(subcampanias)} data-selection={seleccion}
    data-points={puntos.map(point => point.registro_id).join(',')}>
    {subcampanias.map(zone => <button key={zone.id} onClick={() => onSelect(`s:${zone.id}`)}>Zona {zone.id}</button>)}
    {puntos.map(point => <button key={point.registro_id} onClick={() => onSelect(`r:${point.registro_id}`)}>Punto {point.registro_id}</button>)}
  </div>,
}))

const request = vi.mocked(ImpactoService.consultar)
const polygon = (longitude: number): GeoJsonPolygon => ({
  type: 'Polygon', coordinates: [[[longitude, -16.6], [longitude + 0.1, -16.6], [longitude + 0.1, -16.5], [longitude, -16.6]]],
})
const internalPolygon = polygon(-68.2)
const fallbackPolygon = polygon(-67.2)
const draftPolygon = polygon(-66.2)
const campania = (id = 20): Campania => ({
  id, nombre: `Campaña ${id}`, tipo: 'REFORESTACION', codigo_trazabilidad: `CAM-${id}`,
  created_at: '2026-10-28', updated_at: '2026-10-28',
})
const subs: Subcampania[] = [
  { id: 51, campania_id: 20, nombre: 'Zona interna', zona_id: 1, estado: 'ACTIVA', meta_total_arboles: 100, created_at: '2026-10-28', poligono: internalPolygon },
  { id: 52, campania_id: 20, nombre: 'Zona con polígono público', zona_id: 2, estado: 'ACTIVA', meta_total_arboles: 80, created_at: '2026-10-28', poligono: null },
  { id: 53, campania_id: 20, nombre: 'Zona borrador', zona_id: 3, estado: 'BORRADOR', meta_total_arboles: 60, created_at: '2026-10-28', poligono: draftPolygon },
]
function publicZone(id: string, campaniaId = '20', poligono = fallbackPolygon): ImpactoSubcampania {
  return { id, campania_id: campaniaId, nombre: `Pública ${id}`, estado: 'ACTIVA', zona: null, poligono,
    meta_inicial: 100, faltantes: 80, avance_porcentaje: 20, plantacion_inicial: 20, reposiciones: 0,
    bajas_reportadas: 0, registros: 1, url_publica: `/impacto/subcampanias/${id}` }
}
function point(id: string, subcampaniaId = '51'): ImpactoPunto {
  return { registro_id: id, subcampania_id: subcampaniaId, latitud: -16.55, longitud: -68.15,
    cantidad_total_plantada: 20, es_reposicion: false, url_publica: `/impacto/registros/${id}` }
}
function publicPage(): { data: ImpactoConsulta } {
  return { data: {
    indicadores: { plantacion_inicial: 60, reposiciones: 0, bajas_reportadas: 0, registros: 3 },
    campanias: [{ id: '20', nombre: 'Campaña 20', plantacion_inicial: 60, url_publica: '/impacto/campanias/20' }],
    subcampanias: [publicZone('51', '20', polygon(-60)), publicZone('52'), publicZone('99', '21')],
    mapa: [point('100'), point('101'), point('200', '52'), point('999', '99')],
    registros: [], siguiente_cursor: '100',
  } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(complete => { resolve = complete })
  return { promise, resolve }
}
function Destination() {
  const location = useLocation()
  return <><p>Detalle de subcampaña abierto</p><p data-testid="return">{location.state?.campaniaReturnTo}</p></>
}
function Tree({ path = '/app/planting/campanias/20' }: { path?: string }) {
  return <MemoryRouter initialEntries={[path]}>
    <Link to="/app/planting/campanias/21?pestana=mapa">Ir a campaña 21</Link>
    <Routes>
      <Route path="/app/planting/campanias/:campaniaId" element={<CampaniaAdminDashboardScreen />} />
      <Route path="/app/planting/subcampanias/:subcampaniaId" element={<Destination />} />
    </Routes>
  </MemoryRouter>
}
function previewPolygons() {
  return JSON.parse(screen.getByTestId('preview').getAttribute('data-polygons') ?? '[]') as PolygonMapPreviewProps['polygons']
}

beforeEach(() => {
  auth.user = { id: '1', auth_id: 'auth-1', rol: 'ADMIN' }
  vi.mocked(PlantacionService.getCampania).mockReset().mockImplementation(async id => campania(id))
  vi.mocked(PlantacionService.listSubcampaniasByCampania).mockReset().mockResolvedValue(subs)
  vi.mocked(PlantacionService.getSubcampania).mockReset().mockImplementation(async id => ({
    ...(subs.find(sub => sub.id === id) ?? subs[0]), id, poligono: null,
  }))
  vi.mocked(PlantacionService.getCampaniaMetrics).mockReset().mockResolvedValue(null)
  vi.mocked(PlantacionService.getCampaniaActivity).mockReset().mockResolvedValue([])
  request.mockReset().mockResolvedValue(publicPage())
})

describe('Mapas de campaña para el equipo interno', () => {
  it('recupera el polígono de un BORRADOR desde su detalle aunque no esté en el listado ni en Impacto', async () => {
    vi.mocked(PlantacionService.listSubcampaniasByCampania).mockResolvedValue(subs.map(sub => sub.id === 53 ? { ...sub, poligono: null } : sub))
    vi.mocked(PlantacionService.getSubcampania).mockImplementation(async id => ({
      ...(subs.find(sub => sub.id === id) ?? subs[0]), id,
    }))
    request.mockRejectedValue(Object.assign(new Error('Campaña sin proyección pública'), { status: 404 }))
    render(<Tree />)
    await waitFor(() => expect(previewPolygons()).toEqual([
      { id: '51', poligono: internalPolygon }, { id: '53', poligono: draftPolygon },
    ]))
    const detailIds = vi.mocked(PlantacionService.getSubcampania).mock.calls.map(call => call[0])
    expect(detailIds).toContain(52)
    expect(detailIds).toContain(53)
    expect(detailIds).not.toContain(51)
    expect(screen.getByText(/Esto no significa que no existan polígonos o plantaciones internas/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa completo' }))
    const map = await screen.findByTestId('map')
    const zones = JSON.parse(map.getAttribute('data-zones') ?? '[]') as { id: string; poligono: GeoJsonPolygon | null }[]
    expect(zones.find(zone => zone.id === '53')?.poligono).toEqual(draftPolygon)
    expect(map.getAttribute('data-points')).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Zona 53' }))
    expect(screen.getByRole('heading', { name: 'Zona borrador' })).toBeTruthy()
    expect(screen.getByText('BORRADOR')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir detalle de subcampaña' }).getAttribute('href')).toBe('/app/planting/subcampanias/53')
  })

  it('conserva los polígonos disponibles ante un error parcial interno y reintenta únicamente los faltantes', async () => {
    vi.mocked(PlantacionService.listSubcampaniasByCampania).mockResolvedValue(subs.map(sub => sub.id === 53 ? { ...sub, poligono: null } : sub))
    let missingAttempts = 0
    vi.mocked(PlantacionService.getSubcampania).mockImplementation(async id => {
      if (id === 52 && missingAttempts++ === 0) throw new Error('Detalle temporalmente no disponible')
      return { ...(subs.find(sub => sub.id === id) ?? subs[0]), id, poligono: id === 52 ? fallbackPolygon : draftPolygon }
    })
    request.mockRejectedValue(Object.assign(new Error('Campaña sin proyección pública'), { status: 404 }))
    render(<Tree path="/app/planting/campanias/20?pestana=mapa" />)
    expect(await screen.findByText(/No pudimos consultar el polígono de 1 subcampaña/)).toBeTruthy()
    const zones = () => JSON.parse(screen.getByTestId('map').getAttribute('data-zones') ?? '[]') as { id: string; poligono: GeoJsonPolygon | null }[]
    expect(zones().find(zone => zone.id === '51')?.poligono).toEqual(internalPolygon)
    expect(zones().find(zone => zone.id === '52')?.poligono).toBeNull()
    expect(zones().find(zone => zone.id === '53')?.poligono).toEqual(draftPolygon)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar polígonos' }))
    await waitFor(() => expect(zones().find(zone => zone.id === '52')?.poligono).toEqual(fallbackPolygon))
    expect(zones().find(zone => zone.id === '53')?.poligono).toEqual(draftPolygon)
    expect(screen.queryByText(/No pudimos consultar el polígono/)).toBeNull()
    const detailIds = vi.mocked(PlantacionService.getSubcampania).mock.calls.map(call => call[0])
    expect(detailIds.filter(id => id === 52)).toHaveLength(2)
    expect(detailIds.filter(id => id === 53)).toHaveLength(1)
    expect(detailIds).not.toContain(51)
    expect(screen.getByTestId('map').getAttribute('data-points')).toBe('')
  })

  it('muestra geometría interna y respaldo público de las subcampañas accesibles, sin zonas ajenas', async () => {
    render(<Tree />)
    await waitFor(() => expect(previewPolygons()).toHaveLength(3))
    expect(previewPolygons()).toEqual([
      { id: '51', poligono: internalPolygon }, { id: '52', poligono: fallbackPolygon }, { id: '53', poligono: draftPolygon },
    ])
    expect(request).toHaveBeenCalledExactlyOnceWith({ tipo: 'campania', id: '20' }, { limite: 20 }, expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa completo' }))
    expect(await screen.findByRole('heading', { name: 'Mapa de Campaña 20' })).toBeTruthy()
    expect(screen.getByTestId('map').getAttribute('data-points')).toBe('100,101,200')
    expect(JSON.parse(screen.getByTestId('map').getAttribute('data-zones') ?? '[]').map((zone: { id: string }) => zone.id)).toEqual(['51', '52', '53'])
    expect(screen.queryByRole('button', { name: 'Zona 99' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Punto 999' })).toBeNull()
    // El mapa completo llega con la primera consulta aunque la lista de registros tenga cursor.
    expect(request).toHaveBeenCalledTimes(1)
  })

  it.each(['ADMIN', 'GENERAL', 'VALIDADOR'])('permite a %s abrir el mapa y navegar a la subcampaña sin ampliar gestión', async rol => {
    auth.user.rol = rol
    render(<Tree />)
    await screen.findByRole('button', { name: 'Ver mapa completo' })
    expect(Boolean(screen.queryByRole('button', { name: 'Más acciones' }))).toBe(rol === 'ADMIN')
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    const map = await screen.findByTestId('map')
    await waitFor(() => expect(map.getAttribute('data-points')).toBe('100,101,200'))
    fireEvent.click(screen.getByRole('button', { name: 'Zona 52' }))
    expect(map.getAttribute('data-points')).toBe('200')
    fireEvent.click(screen.getByRole('button', { name: 'Punto 200' }))
    expect(map.getAttribute('data-selection')).toBe('r:200')
    fireEvent.click(screen.getByRole('link', { name: 'Abrir detalle de subcampaña' }))
    expect(screen.getByText('Detalle de subcampaña abierto')).toBeTruthy()
    expect(screen.getByTestId('return').textContent).toBe('/app/planting/campanias/20?pestana=mapa&subcampania=52&registro=200')
  })

  it('conserva los polígonos internos ante error público y recupera ubicaciones con reintento', async () => {
    request.mockRejectedValueOnce(Object.assign(new Error('No publicada'), { status: 404 }))
    render(<Tree path="/app/planting/campanias/20?pestana=mapa" />)
    expect(await screen.findByText(/Esto no significa que no existan polígonos o plantaciones internas/)).toBeTruthy()
    const map = screen.getByTestId('map')
    const zones = JSON.parse(map.getAttribute('data-zones') ?? '[]')
    expect(zones[0].poligono).toEqual(internalPolygon)
    expect(zones[2].poligono).toEqual(draftPolygon)
    expect(map.getAttribute('data-points')).toBe('')
    expect(screen.queryByText('No hay ubicaciones de plantaciones publicadas disponibles en este alcance.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ubicaciones' }))
    await waitFor(() => expect(map.getAttribute('data-points')).toBe('100,101,200'))
    expect(request).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(/Esto no significa que no existan polígonos o plantaciones internas/)).toBeNull()
  })

  it('descarta una respuesta pública tardía cuando cambia la campaña', async () => {
    const old = deferred<{ data: ImpactoConsulta }>()
    const current = publicPage()
    current.data.subcampanias = [publicZone('61', '21')]
    current.data.mapa = [point('300', '61')]
    request.mockReturnValueOnce(old.promise).mockResolvedValueOnce(current)
    vi.mocked(PlantacionService.listSubcampaniasByCampania).mockImplementation(async id => id === 20 ? subs : [
      { ...subs[0], id: 61, campania_id: 21, nombre: 'Nueva zona', poligono: polygon(-65) },
    ])
    render(<Tree path="/app/planting/campanias/20?pestana=mapa" />)
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const oldSignal = request.mock.calls[0][2]!
    fireEvent.click(screen.getByRole('link', { name: 'Ir a campaña 21' }))
    await screen.findByRole('heading', { name: 'Mapa de Campaña 21' })
    await waitFor(() => expect(screen.getByTestId('map').getAttribute('data-points')).toBe('300'))
    expect(oldSignal.aborted).toBe(true)
    await act(async () => { old.resolve(publicPage()); await old.promise })
    expect(screen.getByTestId('map').getAttribute('data-points')).toBe('300')
    expect(screen.queryByRole('button', { name: 'Zona 51' })).toBeNull()
    expect(request).toHaveBeenLastCalledWith({ tipo: 'campania', id: '21' }, { limite: 20 }, expect.any(AbortSignal))
  })

  it('retira las zonas y selección de la cuenta anterior mientras consulta la cuenta nueva', async () => {
    const nextDashboard = deferred<Subcampania[]>()
    const view = render(<Tree path="/app/planting/campanias/20?pestana=mapa&subcampania=51" />)
    await waitFor(() => expect(screen.getByTestId('map').getAttribute('data-points')).toBe('100,101'))
    vi.mocked(PlantacionService.listSubcampaniasByCampania).mockReturnValueOnce(nextDashboard.promise)
    auth.user = { id: '2', auth_id: 'auth-2', rol: 'GENERAL' }
    view.rerender(<Tree path="/app/planting/campanias/20?pestana=mapa&subcampania=51" />)
    expect(screen.queryByTestId('map')).toBeNull()
    expect(screen.getByText('Cargando campaña...')).toBeTruthy()
    await act(async () => { nextDashboard.resolve([subs[1]]); await nextDashboard.promise })
    await waitFor(() => expect(screen.getByTestId('map').getAttribute('data-points')).toBe('200'))
    expect(screen.queryByRole('button', { name: 'Zona 51' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Abrir detalle de subcampaña' })).toBeNull()
    expect(screen.getByText('La subcampaña seleccionada no está disponible en esta campaña.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Más acciones' })).toBeNull()
  })
})
