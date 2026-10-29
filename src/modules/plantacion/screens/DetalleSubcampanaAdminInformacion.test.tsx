import { Suspense } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { ImpactoService } from '../../impacto/api/impacto.api'
import publicExamples from '../../impacto/api/impacto.test-fixtures.json'
import type { ImpactoMapProps } from '../../impacto/components/ImpactoMap'
import type { ImpactoConsulta } from '../../impacto/types'
import { RegistroParticipacionService } from '../../participacion/api/registro.api'
import { context as registroContext } from '../../participacion/api/registro.test-fixtures'
import type { ContextoRegistroLectura } from '../../participacion/registroTypes'
import type { GeoJsonPolygon, GetPlanData, Subcampania } from '../types/contracts'
import SubcampaniaDetailRoute from './SubcampaniaDetailRoute'

const auth = vi.hoisted(() => ({
  user: { id: '801', auth_id: 'admin-801', rol: 'ADMIN', nombre: 'Admin' },
  hydrated: true, isAuthenticated: true, login: vi.fn(),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../../components/map/OpenFreeMapBaseLayer', () => ({ default: () => null }))
vi.mock('react-leaflet', () => ({
  MapContainer: () => <div data-testid="minimapa" />, Polygon: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}))
vi.mock('../../impacto/components/ImpactoMapPanel', () => ({
  default: ({ subcampanias, puntos, seleccion }: ImpactoMapProps) => <div data-testid="mapa-compartido"
    data-scopes={subcampanias.map(scope => scope.id).join(',')}
    data-poligono={JSON.stringify(subcampanias[0]?.poligono)}
    data-points={puntos.map(point => point.registro_id).join(',')}
    data-selection={seleccion ?? ''} />,
}))

const registroId = '9007199254740993'
const officialPolygon: GeoJsonPolygon = structuredClone(registroContext.data.subcampania.poligono)

function subcampania(id = 826, estado: Subcampania['estado'] = 'ACTIVA'): Subcampania {
  return { id, campania_id: 800, nombre: `Subcampaña ${id}`, zona_id: 1, meta_total_arboles: 40,
    total_plantado_inicial: 25, saldo_vivo_actual: 25, estado, created_at: '2026-10-15', poligono: officialPolygon }
}
function plan(id: number): GetPlanData {
  return { subcampania_id: id, estado: 'ACTIVA', meta_total_arboles: 40, plan_revision: 1,
    metas: [{ planta_id: 8, cantidad_objetivo: 40, porcentaje_objetivo: 100, planta: { id: 8, especie: 'Tara del plan' } }] }
}
function contexto(actorId = '801', id = '826'): ContextoRegistroLectura {
  const result = structuredClone(registroContext)
  result.data.actor = { usuario_id: actorId, fuente_autoridad: 'GLOBAL' }
  result.data.subcampania = { ...result.data.subcampania, id, nombre: `Subcampaña ${id}` }
  result.data.especies = [{ ...result.data.especies[0], nombre: `Stock ${actorId}-${id}`, saldo_elegible: 20 }]
  return result
}
function publicData(id = '826'): { data: ImpactoConsulta } {
  const data = structuredClone(publicExamples.subcampania.data) as ImpactoConsulta
  const source = data.registros.find(record => !record.es_reposicion)!
  const record = { ...source, id: registroId, subcampania_id: id, codigo_trazabilidad: `PLT-${id}-HIST`,
    personas: [{ ...source.personas[0], nombre: `Responsable histórico ${id}`, es_responsable: true }] }
  data.registros = [record]
  data.mapa = [{ ...data.mapa[0], registro_id: registroId, subcampania_id: id }]
  data.subcampanias = [{ ...data.subcampanias[0], id, registros: 1,
    poligono: { type: 'Polygon', coordinates: [[[-65, -17], [-64, -17], [-64, -16], [-65, -17]]] } }]
  return { data }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(complete => { resolve = complete })
  return { promise, resolve }
}
function SwitchScope() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/app/planting/subcampanias/827')}>Cambiar subcampaña</button>
}
function PublicRecordDestination() {
  const state = useLocation().state as { impactoReturnTo?: string } | null
  return <><p data-testid="ficha-return">{state?.impactoReturnTo}</p><Link to={state?.impactoReturnTo ?? '/'}>Volver al mapa</Link></>
}
function CampaignDestination() {
  const location = useLocation()
  return <p data-testid="campania-destination">{location.pathname + location.search}</p>
}
function Tree({ initialPath = '/app/planting/subcampanias/826', initialState = null }: {
  initialPath?: string; initialState?: { campaniaReturnTo: string } | null
}) {
  return <MemoryRouter initialEntries={[{ pathname: initialPath.split('?')[0], search: initialPath.includes('?') ? `?${initialPath.split('?')[1]}` : '', state: initialState }]}>
    <Suspense fallback={<p>Cargando ruta</p>}><Routes>
      <Route path="/app/planting/subcampanias/:subcampaniaId" element={<SubcampaniaDetailRoute />} />
      <Route path="/app/planting/campanias/:campaniaId" element={<CampaignDestination />} />
      <Route path="/impacto/registros/:registroId" element={<PublicRecordDestination />} />
    </Routes></Suspense>
    <SwitchScope />
  </MemoryRouter>
}

beforeEach(() => {
  auth.user = { id: '801', auth_id: 'admin-801', rol: 'ADMIN', nombre: 'Admin' }
  auth.login.mockReset()
  localStorage.setItem('authToken', 'token-admin-801')
  vi.spyOn(PlantacionService, 'getSubcampania').mockImplementation(async id => subcampania(id))
  vi.spyOn(PlantacionService, 'getSubcampaniaEquipo').mockResolvedValue([])
  vi.spyOn(PlantacionService, 'getSubcampaniaPlan').mockImplementation(async id => plan(id))
  vi.spyOn(RegistroParticipacionService, 'contexto').mockImplementation(async (actor, id) => contexto(actor, id))
  vi.spyOn(ImpactoService, 'consultar').mockImplementation(async scope => publicData(scope.tipo === 'subcampania' ? scope.id : '826'))
  vi.spyOn(LotesViveroService, 'crearAsignacion').mockRejectedValue(new Error('No se debe asignar stock desde este detalle'))
  vi.spyOn(PlantacionService, 'setSubcampaniaPoligono').mockRejectedValue(new Error('No se debe editar el polígono'))
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Petición sin mock'))
})
afterEach(() => { vi.restoreAllMocks() })

describe('Información de Plantación para ADMIN interno', () => {
  it('vuelve al mapa de su campaña conservando la subcampaña y el registro BIGINT seleccionados', async () => {
    const campaniaReturnTo = `/app/planting/campanias/800?pestana=mapa&subcampania=826&registro=${registroId}`
    render(<Tree initialState={{ campaniaReturnTo }} />)
    await screen.findByRole('heading', { name: 'Subcampaña 826' }, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByTestId('campania-destination').textContent).toBe(campaniaReturnTo)
  })

  it.each([
    `/app/planting/campanias/999?pestana=mapa&subcampania=826&registro=${registroId}`,
    `https://otro.test/app/planting/campanias/800?pestana=mapa&subcampania=826&registro=${registroId}`,
  ])('descarta el retorno a una campaña ajena o destino externo: %s', async campaniaReturnTo => {
    render(<Tree initialState={{ campaniaReturnTo }} />)
    await screen.findByRole('heading', { name: 'Subcampaña 826' })
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByTestId('campania-destination').textContent).toBe('/app/planting/campanias/800')
  })

  it('muestra en Resumen los agregados del ámbito completo y lleva el detalle a Registros', async () => {
    const response = publicData()
    response.data.subcampanias[0] = { ...response.data.subcampanias[0], registros: 27, plantacion_inicial: 150, reposiciones: 12 }
    response.data.indicadores = { registros: 99, plantacion_inicial: 999, reposiciones: 99, bajas_reportadas: 0 }
    response.data.siguiente_cursor = '500'
    vi.mocked(ImpactoService.consultar).mockResolvedValue(response)
    render(<Tree />)

    const activity = await screen.findByRole('region', { name: 'Actividad de plantación' }, { timeout: 5000 })
    await waitFor(() => expect(within(activity).getByText('Registros').parentElement?.querySelector('dd')?.textContent).toBe('27'))
    expect(within(activity).getByText('Plantación inicial').parentElement?.querySelector('dd')?.textContent).toBe('150')
    expect(within(activity).getByText('Reposiciones').parentElement?.querySelector('dd')?.textContent).toBe('12')
    expect(screen.queryByRole('region', { name: 'Historial de plantaciones' })).toBeNull()
    expect(screen.queryByText('PLT-826-HIST')).toBeNull()
    expect(screen.queryByText('Responsable histórico 826')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cargar más plantaciones' })).toBeNull()

    fireEvent.click(within(activity).getByRole('button', { name: 'Ver registros' }))
    const history = await screen.findByRole('region', { name: 'Historial de plantaciones' })
    expect(await within(history).findByText('Responsable histórico 826')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registros' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('region', { name: 'Actividad de plantación' })).toBeNull()
    expect(within(history).getByRole('button', { name: 'Cargar más plantaciones' })).toBeTruthy()
    expect(ImpactoService.consultar).toHaveBeenCalledOnce()
  })

  it('consulta stock sin membresía, conserva asignación deshabilitada y comparte mapa con el historial', async () => {
    render(<Tree />)
    const stock = await screen.findByRole('region', { name: 'Stock de la subcampaña' })
    expect(await within(stock).findByText('Stock 801-826')).toBeTruthy()
    expect(RegistroParticipacionService.contexto).toHaveBeenCalledExactlyOnceWith('801', '826', expect.any(AbortSignal))
    expect(PlantacionService.getSubcampaniaEquipo).toHaveBeenCalledExactlyOnceWith(826, 'admin-801')
    const assign = within(stock).getByRole('button', { name: 'Asignar stock' })
    expect((assign as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(assign)
    expect(LotesViveroService.crearAsignacion).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    const history = await screen.findByRole('region', { name: 'Historial de plantaciones' })
    expect(await within(history).findByText('Responsable histórico 826')).toBeTruthy()
    fireEvent.click(within(history).getByRole('button', { name: 'Ver en mapa' }))
    const map = await screen.findByTestId('mapa-compartido')
    expect(map.getAttribute('data-scopes')).toBe('826')
    expect(map.getAttribute('data-points')).toBe(registroId)
    expect(map.getAttribute('data-selection')).toBe(`r:${registroId}`)
    expect(JSON.parse(map.getAttribute('data-poligono')!)).toEqual(officialPolygon)
    expect(ImpactoService.consultar).toHaveBeenCalledExactlyOnceWith({ tipo: 'subcampania', id: '826' }, { limite: 20 }, expect.any(AbortSignal))
    expect(screen.queryByRole('button', { name: /editar.*(?:mapa|polígono)/i })).toBeNull()
    expect(PlantacionService.setSubcampaniaPoligono).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('abre un enlace directo al mapa con selección BIGINT y conserva ambos al volver de la ficha pública', async () => {
    const destination = `/app/planting/subcampanias/821?pestana=mapa&registro=${registroId}`
    render(<Tree initialPath={destination} />)
    await screen.findByTestId('mapa-compartido')
    await waitFor(() => expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`r:${registroId}`))
    expect(screen.getByRole('button', { name: 'Mapa' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('mapa-compartido').getAttribute('data-scopes')).toBe('821')
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('ficha-return').textContent).toBe(destination)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al mapa' }))
    await waitFor(() => expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`r:${registroId}`))
    expect(screen.getByRole('button', { name: 'Mapa' }).getAttribute('aria-pressed')).toBe('true')
    expect(PlantacionService.setSubcampaniaPoligono).not.toHaveBeenCalled()
  })

  it('conserva la plantación elegida desde el historial en la ruta de retorno de la ficha pública', async () => {
    render(<Tree />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registros' }))
    const history = await screen.findByRole('region', { name: 'Historial de plantaciones' })
    fireEvent.click(await within(history).findByRole('button', { name: 'Ver en mapa' }))
    await waitFor(() => expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`r:${registroId}`))
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('ficha-return').textContent).toBe(`/app/planting/subcampanias/826?pestana=mapa&registro=${registroId}`)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al mapa' }))
    await waitFor(() => expect(screen.getByTestId('mapa-compartido').getAttribute('data-selection')).toBe(`r:${registroId}`))
    expect(screen.getByRole('button', { name: 'Mapa' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('abre Registros desde la URL y conserva esa sección al volver de la ficha pública', async () => {
    const destination = '/app/planting/subcampanias/826?pestana=registros'
    render(<Tree initialPath={destination} />)
    const history = await screen.findByRole('region', { name: 'Historial de plantaciones' })
    expect(await within(history).findByText('Responsable histórico 826')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registros' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('region', { name: 'Actividad de plantación' })).toBeNull()
    fireEvent.click(within(history).getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('ficha-return').textContent).toBe(destination)
    fireEvent.click(screen.getByRole('link', { name: 'Volver al mapa' }))
    const returnedHistory = await screen.findByRole('region', { name: 'Historial de plantaciones' })
    expect(await within(returnedHistory).findByText('Responsable histórico 826')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registros' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('conserva las páginas cargadas al alternar Registros, Resumen y Mapa', async () => {
    const first = publicData()
    first.data.siguiente_cursor = '500'
    const next = publicData()
    const secondRecord = { ...next.data.registros[0], id: '499', codigo_trazabilidad: 'PLT-826-SEGUNDO' }
    next.data.registros = [secondRecord]
    next.data.mapa.push({ ...next.data.mapa[0], registro_id: secondRecord.id })
    next.data.siguiente_cursor = null
    vi.mocked(ImpactoService.consultar).mockResolvedValueOnce(first).mockResolvedValueOnce(next)
    render(<Tree initialPath="/app/planting/subcampanias/826?pestana=registros" />)
    await screen.findByText('PLT-826-HIST')
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más plantaciones' }))
    expect(await screen.findByText('PLT-826-SEGUNDO')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }))
    expect(await screen.findByRole('region', { name: 'Actividad de plantación' })).toBeTruthy()
    expect(screen.queryByText('PLT-826-SEGUNDO')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    expect((await screen.findByTestId('mapa-compartido')).getAttribute('data-points')).toBe(`${registroId},499`)
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    expect(await screen.findByText('PLT-826-HIST')).toBeTruthy()
    expect(screen.getByText('PLT-826-SEGUNDO')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cargar más plantaciones' })).toBeNull()
    expect(ImpactoService.consultar).toHaveBeenCalledTimes(2)
    expect(ImpactoService.consultar).toHaveBeenLastCalledWith({ tipo: 'subcampania', id: '826' }, { limite: 20, cursor: '500' }, expect.any(AbortSignal))
  })

  it('un 404 público conserva stock y polígono oficial sin afirmar que el historial está vacío', async () => {
    vi.mocked(ImpactoService.consultar).mockRejectedValue(Object.assign(new Error('No publicado'), { status: 404 }))
    render(<Tree />)
    expect(await screen.findByText('Stock 801-826')).toBeTruthy()
    expect(await screen.findByText(/Esto no significa que no existan plantaciones/)).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones registradas/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Reintentar resumen de actividad' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    expect(await screen.findByText(/El historial público no está disponible/)).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones registradas/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    const map = await screen.findByTestId('mapa-compartido')
    expect(JSON.parse(map.getAttribute('data-poligono')!)).toEqual(officialPolygon)
    expect(map.getAttribute('data-points')).toBe('')
    expect(screen.getByText(/Esto no significa que no existan registros/)).toBeTruthy()
  })

  it('un fallo de stock conserva historial y no se presenta como saldo agotado', async () => {
    vi.mocked(RegistroParticipacionService.contexto).mockRejectedValue(new Error('Stock temporalmente no disponible'))
    render(<Tree />)
    const stock = await screen.findByRole('region', { name: 'Stock de la subcampaña' })
    expect(await within(stock).findByRole('alert')).toBeTruthy()
    expect(within(stock).queryByText('Sin stock')).toBeNull()
    expect(within(stock).getByRole('button', { name: 'Reintentar stock' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    expect(await screen.findByText('Responsable histórico 826')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver en mapa' })).toBeTruthy()
  })

  it('usa el polígono autorizado del contexto cuando falta en el detalle y falla la consulta pública', async () => {
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania(), poligono: null })
    vi.mocked(ImpactoService.consultar).mockRejectedValue(Object.assign(new Error('No publicado'), { status: 404 }))
    render(<Tree />)
    expect(await screen.findByText('Stock 801-826')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    const map = await screen.findByTestId('mapa-compartido')
    expect(JSON.parse(map.getAttribute('data-poligono')!)).toEqual(registroContext.data.subcampania.poligono)
    expect(screen.queryByText(/El polígono no está disponible/)).toBeNull()
    expect(screen.getByText(/Esto no significa que no existan registros/)).toBeTruthy()
  })

  it.each(['BORRADOR', 'COMPLETADA', 'FINALIZADA_PARCIAL', 'CANCELADA', 'PAUSADA'] as const)('no consulta el contexto operativo en %s', async estado => {
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue(subcampania(826, estado))
    render(<Tree />)
    const stock = await screen.findByRole('region', { name: 'Stock de la subcampaña' })
    expect(within(stock).getByText(/El stock no se ha consultado/)).toBeTruthy()
    expect(RegistroParticipacionService.contexto).not.toHaveBeenCalled()
    expect(within(stock).queryByText('Sin stock')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    expect(await screen.findByText('Responsable histórico 826')).toBeTruthy()
  })

  it.each(['GENERAL', 'VALIDADOR'])('comparte el mapa de plantaciones con %s sin habilitar herramientas de ADMIN', async rol => {
    auth.user.rol = rol
    render(<Tree initialPath="/app/planting/subcampanias/826?pestana=registros" />)
    expect(await screen.findByRole('heading', { name: 'Subcampaña 826' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resumen' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Registros' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Stock de la subcampaña' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Historial de plantaciones' })).toBeNull()
    expect(RegistroParticipacionService.contexto).not.toHaveBeenCalled()
    expect(ImpactoService.consultar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    const map = await screen.findByTestId('mapa-compartido')
    await waitFor(() => expect(map.getAttribute('data-points')).toBe(registroId))
    expect(map.getAttribute('data-scopes')).toBe('826')
    expect(JSON.parse(map.getAttribute('data-poligono')!)).toEqual(officialPolygon)
    expect(ImpactoService.consultar).toHaveBeenCalledExactlyOnceWith({ tipo: 'subcampania', id: '826' }, { limite: 20 }, expect.any(AbortSignal))
    expect(screen.queryByRole('button', { name: 'Registros' })).toBeNull()
    expect(RegistroParticipacionService.contexto).not.toHaveBeenCalled()
    expect(PlantacionService.setSubcampaniaPoligono).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar plantación' }), { target: { value: registroId } })
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('ficha-return').textContent).toBe(`/app/planting/subcampanias/826?pestana=mapa&registro=${registroId}`)
  })

  it('cancela stock e historial al cambiar subcampaña y descarta respuestas tardías del ámbito anterior', async () => {
    const previousStock = deferred<ContextoRegistroLectura>()
    const previousHistory = deferred<{ data: ImpactoConsulta }>()
    vi.mocked(RegistroParticipacionService.contexto).mockReturnValueOnce(previousStock.promise)
    vi.mocked(ImpactoService.consultar).mockReturnValueOnce(previousHistory.promise)
    render(<Tree />)
    await waitFor(() => expect(RegistroParticipacionService.contexto).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(ImpactoService.consultar).toHaveBeenCalledTimes(1))
    const stockSignal = vi.mocked(RegistroParticipacionService.contexto).mock.calls[0][2]!
    const historySignal = vi.mocked(ImpactoService.consultar).mock.calls[0][2]!
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar subcampaña' }))
    expect(await screen.findByText('Stock 801-827')).toBeTruthy()
    expect(stockSignal.aborted).toBe(true)
    expect(historySignal.aborted).toBe(true)
    await act(async () => {
      previousStock.resolve(contexto())
      previousHistory.resolve(publicData())
      await Promise.all([previousStock.promise, previousHistory.promise])
    })
    expect(screen.queryByText('Stock 801-826')).toBeNull()
    expect(screen.queryByText('Responsable histórico 826')).toBeNull()
    expect(screen.getByText('Stock 801-827')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }))
    expect(await screen.findByText('Responsable histórico 827')).toBeTruthy()
    expect(screen.queryByText('Responsable histórico 826')).toBeNull()
  })

  it('cancela lecturas al cambiar cuenta y no restaura información del ADMIN anterior', async () => {
    const previousStock = deferred<ContextoRegistroLectura>()
    const previousHistory = deferred<{ data: ImpactoConsulta }>()
    vi.mocked(RegistroParticipacionService.contexto).mockReturnValueOnce(previousStock.promise)
    vi.mocked(ImpactoService.consultar).mockReturnValueOnce(previousHistory.promise)
    const view = render(<Tree />)
    await waitFor(() => expect(RegistroParticipacionService.contexto).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(ImpactoService.consultar).toHaveBeenCalledTimes(1))
    const stockSignal = vi.mocked(RegistroParticipacionService.contexto).mock.calls[0][2]!
    const historySignal = vi.mocked(ImpactoService.consultar).mock.calls[0][2]!
    auth.user = { id: '802', auth_id: 'admin-802', rol: 'ADMIN', nombre: 'Otra cuenta' }
    localStorage.setItem('authToken', 'token-admin-802')
    view.rerender(<Tree />)
    expect(await screen.findByText('Stock 802-826')).toBeTruthy()
    expect(stockSignal.aborted).toBe(true)
    expect(historySignal.aborted).toBe(true)
    await act(async () => {
      previousStock.resolve(contexto())
      previousHistory.resolve(publicData())
      await Promise.all([previousStock.promise, previousHistory.promise])
    })
    expect(screen.queryByText('Stock 801-826')).toBeNull()
    expect(screen.getByText('Stock 802-826')).toBeTruthy()
    expect(RegistroParticipacionService.contexto).toHaveBeenLastCalledWith('802', '826', expect.any(AbortSignal))
  })
})
