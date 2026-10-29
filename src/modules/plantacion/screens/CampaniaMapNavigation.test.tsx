import { Suspense } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, parsePath, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import { ImpactoService } from '../../impacto/api/impacto.api'
import publicExamples from '../../impacto/api/impacto.test-fixtures.json'
import ImpactoRegistroScreen from '../../impacto/pages/ImpactoRegistroScreen'
import type { ImpactoConsulta, ImpactoRegistro } from '../../impacto/types'
import { RegistroParticipacionService } from '../../participacion/api/registro.api'
import { context as registroContext } from '../../participacion/api/registro.test-fixtures'
import type { Campania, GeoJsonPolygon, Subcampania } from '../types/contracts'
import CampaniaAdminDashboardScreen from './CampaniaAdminDashboardScreen'
import SubcampaniaDetailRoute from './SubcampaniaDetailRoute'

const auth = vi.hoisted(() => ({
  user: { id: '801', auth_id: 'admin-801', rol: 'ADMIN', nombre: 'Interno' },
  hydrated: true, isAuthenticated: true, login: vi.fn(),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../../components/map/OpenFreeMapBaseLayer', () => ({ default: () => null }))
vi.mock('react-leaflet', () => ({ MapContainer: () => <div />, Polygon: () => null, useMap: () => ({ fitBounds: vi.fn() }) }))

// Únicamente se sustituye el motor gráfico; mapa, controlador, popup y enlaces son reales.
const gpu = vi.hoisted(() => {
  type Event = { features?: { properties: { id: string } }[] }
  type Listener = (event: Event) => void
  class FakeMap {
    container: HTMLElement
    handlers = new Map<string, Listener[]>()
    sources = new Map<string, { setData: (data: unknown) => void }>()
    constructor(options: { container: HTMLElement }) {
      this.container = options.container
      queueMicrotask(() => this.handlers.get('load')?.forEach(handler => handler({})))
    }
    on(event: string, layerOrListener: string | Listener, listener?: Listener) {
      const key = typeof layerOrListener === 'string' ? `${event}:${layerOrListener}` : event
      const handler = typeof layerOrListener === 'function' ? layerOrListener : listener!
      this.handlers.set(key, [...(this.handlers.get(key) ?? []), handler])
      return this
    }
    off(event: string, layerOrListener: string | Listener, listener?: Listener) {
      const key = typeof layerOrListener === 'string' ? `${event}:${layerOrListener}` : event
      const handler = typeof layerOrListener === 'function' ? layerOrListener : listener
      this.handlers.set(key, (this.handlers.get(key) ?? []).filter(item => item !== handler))
      return this
    }
    addSource(id: string) { this.sources.set(id, { setData: vi.fn() }); return this }
    getSource(id: string) { return this.sources.get(id) }
    addLayer = vi.fn()
    getCanvas = () => document.createElement('canvas')
    getZoom = () => 12
    resize = vi.fn()
    fitBounds = vi.fn()
    easeTo = vi.fn()
    panBy = vi.fn()
    remove = vi.fn()
    touchZoomRotate = { disableRotation: vi.fn() }
  }
  class FakeMarker {
    element: HTMLElement
    constructor(options: { element: HTMLElement }) { this.element = options.element }
    setLngLat() { return this }
    addTo(map: FakeMap) { map.container.append(this.element); return this }
    remove() { this.element.remove(); return this }
  }
  class FakePopup {
    element = document.createElement('div')
    handlers = new Map<string, (() => void)[]>()
    setDOMContent(content: HTMLElement) { this.element.replaceChildren(content); return this }
    setLngLat() { return this }
    setMaxWidth() { return this }
    getElement() { return this.element }
    addTo(map: FakeMap) { map.container.append(this.element); return this }
    remove() { this.element.remove(); this.handlers.get('close')?.forEach(handler => handler()); return this }
    on(event: string, handler: () => void) { this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this }
  }
  return { api: { Map: FakeMap, Marker: FakeMarker, Popup: FakePopup, setWorkerUrl: vi.fn() } }
})
vi.mock('maplibre-gl', () => ({ ...gpu.api, default: gpu.api }))

const recordId = '9007199254740993'
const campaignPath = '/app/planting/campanias/800'
const selectedCampaignPath = `${campaignPath}?pestana=mapa&subcampania=826&registro=${recordId}`
const detailMapPath = `/app/planting/subcampanias/826?pestana=mapa&registro=${recordId}`
const polygon: GeoJsonPolygon = structuredClone(registroContext.data.subcampania.poligono)
const campaign: Campania = { id: 800, nombre: 'Campaña de navegación', tipo: 'REFORESTACION', codigo_trazabilidad: 'CAM-NAV', created_at: '2026-10-28', updated_at: '2026-10-28' }
const sub: Subcampania = { id: 826, campania_id: 800, nombre: 'Zona de navegación', zona_id: 1, meta_total_arboles: 40, total_plantado_inicial: 25, estado: 'ACTIVA', created_at: '2026-10-28', poligono: polygon }

function publicData(): { data: ImpactoConsulta } {
  const data = structuredClone(publicExamples.subcampania.data) as ImpactoConsulta
  const source = data.registros[0]
  const record: ImpactoRegistro = { ...source, id: recordId, codigo_trazabilidad: 'PLT-NAVEGACION', campania_id: '800', subcampania_id: '826', campania_nombre: campaign.nombre, subcampania_nombre: sub.nombre, fotos: [] }
  data.registros = [record]
  data.mapa = [{ ...data.mapa[0], registro_id: recordId, subcampania_id: '826' }]
  data.subcampanias = [{ ...data.subcampanias[0], id: '826', campania_id: '800', nombre: sub.nombre, poligono: polygon, registros: 1 }]
  data.campanias = [{ id: '800', nombre: campaign.nombre, plantacion_inicial: 25, url_publica: '/impacto/campanias/800' }]
  return { data }
}

function NavigationSnapshot() {
  const location = useLocation()
  return <><output data-testid="path">{location.pathname + location.search}</output><output data-testid="state">{JSON.stringify(location.state)}</output></>
}

function Tree({ initialPath = selectedCampaignPath, state = null }: { initialPath?: string; state?: unknown }) {
  return <MemoryRouter initialEntries={[{ ...parsePath(initialPath), state }]}>
    <Suspense fallback={<p>Cargando ruta</p>}><Routes>
      <Route path="/app/planting/campanias/:campaniaId" element={<CampaniaAdminDashboardScreen />} />
      <Route path="/app/planting/subcampanias/:subcampaniaId" element={<SubcampaniaDetailRoute />} />
      <Route path="/impacto/registros/:registroId" element={<ImpactoRegistroScreen />} />
    </Routes></Suspense>
    <NavigationSnapshot />
  </MemoryRouter>
}

function routeState() { return JSON.parse(screen.getByTestId('state').textContent || 'null') as unknown }

async function openPublicRecord(source: 'panel' | 'popup') {
  if (source === 'panel') {
    const selector = await screen.findByRole('combobox', { name: 'Seleccionar plantación' })
    fireEvent.change(selector, { target: { value: recordId } })
    fireEvent.click(await screen.findByRole('link', { name: 'Abrir ficha pública' }))
  } else {
    fireEvent.click(await screen.findByRole('button', { name: `Ver registro ${recordId}` }))
    fireEvent.click(await screen.findByRole('link', { name: `Ver plantación ${recordId}` }))
  }
  await screen.findByRole('heading', { name: 'Registro público' })
  await screen.findByText('PLT-NAVEGACION')
}

beforeEach(() => {
  auth.user = { id: '801', auth_id: 'admin-801', rol: 'ADMIN', nombre: 'Interno' }
  localStorage.setItem('authToken', 'jwt-801')
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(PlantacionService, 'getCampania').mockResolvedValue(campaign)
  vi.spyOn(PlantacionService, 'listSubcampaniasByCampania').mockResolvedValue([sub])
  vi.spyOn(PlantacionService, 'getCampaniaMetrics').mockResolvedValue(null)
  vi.spyOn(PlantacionService, 'getCampaniaActivity').mockResolvedValue([])
  vi.spyOn(PlantacionService, 'getSubcampania').mockResolvedValue(sub)
  vi.spyOn(PlantacionService, 'getSubcampaniaEquipo').mockResolvedValue([])
  vi.spyOn(PlantacionService, 'getSubcampaniaPlan').mockResolvedValue({ subcampania_id: 826, estado: 'ACTIVA', meta_total_arboles: 40, plan_revision: 1, metas: [] })
  vi.spyOn(RegistroParticipacionService, 'contexto').mockImplementation(async () => {
    const context = structuredClone(registroContext)
    context.data.actor = { usuario_id: '801', fuente_autoridad: 'GLOBAL' }
    context.data.subcampania.id = '826'
    return context
  })
  vi.spyOn(ImpactoService, 'consultar').mockImplementation(async () => publicData())
  vi.spyOn(ImpactoService, 'registro').mockImplementation(async () => ({ data: publicData().data.registros[0] }))
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Petición no esperada'))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Retorno encadenado desde el mapa de campaña', () => {
  it.each([
    { rol: 'ADMIN', source: 'panel' as const }, { rol: 'ADMIN', source: 'popup' as const },
    { rol: 'GENERAL', source: 'panel' as const }, { rol: 'GENERAL', source: 'popup' as const },
  ])('conserva campaña y selección al volver ficha → detalle → campaña para $rol desde $source real', async ({ rol, source }) => {
    auth.user.rol = rol
    render(<Tree />)
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Seleccionar plantación' }) as HTMLSelectElement).value).toBe(recordId))
    fireEvent.click(await screen.findByRole('link', { name: 'Abrir detalle de subcampaña' }))
    await screen.findByRole('heading', { name: sub.nombre }, { timeout: 5000 })
    expect(routeState()).toEqual({ campaniaReturnTo: selectedCampaignPath })
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    await openPublicRecord(source)
    expect(routeState()).toEqual({ impactoReturnTo: detailMapPath, campaniaReturnTo: selectedCampaignPath })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: sub.nombre })
    expect(screen.getByTestId('path').textContent).toBe(detailMapPath)
    expect(routeState()).toEqual({ campaniaReturnTo: selectedCampaignPath })
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Seleccionar plantación' }) as HTMLSelectElement).value).toBe(recordId))
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: `Mapa de ${campaign.nombre}` })
    expect(screen.getByTestId('path').textContent).toBe(selectedCampaignPath)
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Seleccionar plantación' }) as HTMLSelectElement).value).toBe(recordId))
  })

  it('conserva únicamente el retorno de campaña válido al abrir la tarjeta real desde un state con datos adicionales', async () => {
    auth.user.rol = 'GENERAL'
    render(<Tree initialPath={detailMapPath} state={{ campaniaReturnTo: selectedCampaignPath, privateSnapshot: 'no propagar', otroRetorno: '/privado' }} />)
    await screen.findByRole('heading', { name: sub.nombre })
    await openPublicRecord('popup')
    expect(routeState()).toEqual({ impactoReturnTo: detailMapPath, campaniaReturnTo: selectedCampaignPath })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: sub.nombre })
    expect(routeState()).toEqual({ campaniaReturnTo: selectedCampaignPath })
  })

  it.each([
    '/app/planting/campanias/999?pestana=mapa&subcampania=826',
    '/app/planting/campanias/800?pestana=mapa&subcampania=827',
    '/app/planting/campanias/800?pestana=mapa&subcampania=826&token=privado',
    'https://otro.test/app/planting/campanias/800?pestana=mapa&subcampania=826',
  ])('descarta contexto ajeno o malformado y state arbitrario al abrir y volver de ficha: %s', async campaniaReturnTo => {
    auth.user.rol = 'GENERAL'
    render(<Tree initialPath={detailMapPath} state={{ campaniaReturnTo, privateSnapshot: 'dato que no debe propagarse' }} />)
    await screen.findByRole('heading', { name: sub.nombre })
    await openPublicRecord('panel')
    expect(routeState()).toEqual({ impactoReturnTo: detailMapPath })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: sub.nombre })
    expect(routeState()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: campaign.nombre })
    expect(screen.getByTestId('path').textContent).toBe(campaignPath)
  })

  it.each([{ campania_id: '999' }, { subcampania_id: '827' }])('contrasta el contexto recibido en ficha con el registro cargado: %j', async changedScope => {
    auth.user.rol = 'GENERAL'
    vi.mocked(ImpactoService.registro).mockResolvedValue({ data: { ...publicData().data.registros[0], ...changedScope } })
    render(<Tree initialPath={`/impacto/registros/${recordId}`} state={{ impactoReturnTo: detailMapPath, campaniaReturnTo: selectedCampaignPath, privateSnapshot: 'no conservar' }} />)
    await screen.findByText('PLT-NAVEGACION')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: sub.nombre })
    expect(screen.getByTestId('path').textContent).toBe(detailMapPath)
    expect(routeState()).toBeNull()
  })

  it.each([
    { outcome: 'carga indefinida', campaniaReturnTo: selectedCampaignPath, expectedPath: selectedCampaignPath },
    { outcome: 'error 404', campaniaReturnTo: selectedCampaignPath, expectedPath: selectedCampaignPath },
    { outcome: 'carga con campaña ajena', campaniaReturnTo: '/app/planting/campanias/999?pestana=mapa&subcampania=826', expectedPath: campaignPath },
  ])('conserva el retorno sin datos públicos y el detalle interno valida el padre: $outcome', async ({ outcome, campaniaReturnTo, expectedPath }) => {
    auth.user.rol = 'GENERAL'
    if (outcome === 'error 404') {
      vi.mocked(ImpactoService.registro).mockRejectedValue(Object.assign(new Error('No publicado'), { status: 404 }))
    } else {
      vi.mocked(ImpactoService.registro).mockReturnValue(new Promise<never>(() => {}))
    }
    render(<Tree initialPath={`/impacto/registros/${recordId}`} state={{ impactoReturnTo: detailMapPath, campaniaReturnTo, privateSnapshot: 'no conservar' }} />)
    if (outcome === 'error 404') await screen.findByRole('heading', { name: 'Registro público no disponible' })
    else await screen.findByText('Consultando registro público…')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: sub.nombre })
    expect(screen.getByTestId('path').textContent).toBe(detailMapPath)
    expect(routeState()).toEqual({ campaniaReturnTo })
    expect(PlantacionService.getSubcampania).toHaveBeenCalledWith(826, 'admin-801')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('heading', { name: campaign.nombre })
    expect(screen.getByTestId('path').textContent).toBe(expectedPath)
  })
})
