import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImpactoApiError, ImpactoService } from '../impacto/api/impacto.api'
import type { ImpactoConsulta, ImpactoPunto, ImpactoSubcampania } from '../impacto/types'
import { ParticipacionService } from '../participacion/api/participacion.api'
import { RegistroParticipacionService } from '../participacion/api/registro.api'
import { context as registroContext } from '../participacion/api/registro.test-fixtures'
import type { ContextoRegistroLectura } from '../participacion/registroTypes'
import type { CapacidadesLectura, CapacidadSubcampania } from '../participacion/types'
import { useParticipacionAccountNavigation } from '../participacion/hooks/useParticipacionAccountNavigation'
import SubcampaniaDetailRoute from '../plantacion/screens/SubcampaniaDetailRoute'
import { ParticipacionCapabilitiesProvider } from '../participacion/components/ParticipacionCapabilitiesProvider'
import ParticipantHomeScreen from './ParticipantHomeScreen'

const auth = vi.hoisted(() => ({
  user: { id: '42', auth_id: 'ana', rol: 'VOLUNTARIO', nombre: 'Ana' } as { id: string; auth_id: string; rol: string; nombre: string } | null,
  hydrated: true, isAuthenticated: true, login: vi.fn(),
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../participacion/api/participacion.api', async importOriginal => {
  const original = await importOriginal<typeof import('../participacion/api/participacion.api')>()
  return { ...original, ParticipacionService: { capacidades: vi.fn(), miembros: vi.fn() } }
})
vi.mock('../participacion/api/registro.api', () => ({ RegistroParticipacionService: { contexto: vi.fn() } }))
vi.mock('../impacto/api/impacto.api', async importOriginal => {
  const original = await importOriginal<typeof import('../impacto/api/impacto.api')>()
  return { ...original, ImpactoService: { consultar: vi.fn() } }
})
vi.mock('../impacto/components/ImpactoMapPanel', () => ({
  default: ({ subcampanias, puntos, seleccion, onSelect }: { subcampanias: ImpactoSubcampania[]; puntos: ImpactoPunto[]; seleccion: string | null; onSelect: (value: string) => void }) => (
    <div data-testid="participant-map" data-scopes={subcampanias.map(scope => scope.id).join(',')} data-points={puntos.map(point => point.subcampania_id).join(',')} data-selection={seleccion ?? ''}>
      {subcampanias.map(scope => <button key={scope.id} onClick={() => onSelect(`s:${scope.id}`)}>Mapa: {scope.nombre}</button>)}
    </div>
  ),
}))

const members = vi.mocked(ParticipacionService.miembros)
const capabilities = vi.mocked(ParticipacionService.capacidades)
const impact = vi.mocked(ImpactoService.consultar)
const context = vi.mocked(RegistroParticipacionService.contexto)

function scope(id = '11', campaignId = '7', state: CapacidadSubcampania['estado'] = 'ACTIVA'): CapacidadSubcampania {
  return {
    campania_id: campaignId, campania_nombre: `Campaña ${campaignId}`, subcampania_id: id, nombre: `Zona ${id}`,
    estado: state, permiso_contextual: 'PLANTADOR', revision_permiso: '1', fuente_autoridad: 'CONTEXTUAL',
    acciones: { preparar_registro: state === 'ACTIVA', registrar_inicial: state === 'ACTIVA', incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false },
  }
}
function page(scopes = [scope('11'), scope('12'), scope('21', '8')], actorId = '42', cursor: string | null = null): CapacidadesLectura {
  return { data: { actor: { usuario_id: actorId, rol_global: 'VOLUNTARIO' }, capacidades_globales: { asignar_roles: false, designar_administradores: false, leer_plan: true }, subcampanias: scopes }, observado_en: '2026-10-24T12:00:00Z', siguiente_cursor: cursor }
}
function operational(id = '11', actorId = '42', stock = 15): ContextoRegistroLectura {
  const value = structuredClone(registroContext)
  value.data.actor.usuario_id = actorId
  value.data.subcampania = { ...value.data.subcampania, id, nombre: `Zona ${id}`, campania_id: id === '21' ? '8' : '7', campania_nombre: id === '21' ? 'Campaña 8' : 'Campaña 7' }
  value.data.disponibilidad = stock ? 'DISPONIBLE' : 'SIN_STOCK'
  value.data.especies = [{ ...value.data.especies[0], nombre: `Especie ${actorId}-${id}`, saldo_elegible: stock }]
  return value
}
function publicCampaign(campaignId = '7'): { data: ImpactoConsulta } {
  const ids = campaignId === '7' ? ['11', '12', '13'] : ['21']
  const subcampanias: ImpactoSubcampania[] = ids.map(id => ({
    id, campania_id: campaignId, nombre: `Zona ${id}`, estado: 'ACTIVA', zona: `Territorio ${id}`,
    poligono: structuredClone(registroContext.data.subcampania.poligono), meta_inicial: 40, faltantes: 30,
    plantacion_inicial: 10, avance_porcentaje: 25, reposiciones: 0, bajas_reportadas: 0, registros: 1,
    url_publica: `/impacto/subcampanias/${id}`,
  }))
  return { data: {
    indicadores: { plantacion_inicial: ids.length * 10, reposiciones: 0, bajas_reportadas: 0, registros: ids.length },
    campanias: [{ id: campaignId, nombre: `Campaña ${campaignId}`, plantacion_inicial: ids.length * 10, url_publica: `/impacto/campanias/${campaignId}` }],
    subcampanias,
    mapa: ids.map(id => ({ registro_id: `10${id}`, subcampania_id: id, latitud: -16.5, longitud: -68.1, cantidad_total_plantada: 10, es_reposicion: false, url_publica: `/impacto/registros/10${id}` })),
    registros: [], siguiente_cursor: null,
  } }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(complete => { resolve = complete })
  return { promise, resolve }
}
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><p data-testid="location">{location.pathname}{location.search}</p><p data-testid="location-state">{JSON.stringify(location.state)}</p><button onClick={() => navigate(-1)}>Atrás del navegador</button></> }
function TestCapabilities({ children }: { children: import('react').ReactNode }) { useParticipacionAccountNavigation(); return auth.user && auth.hydrated && auth.isAuthenticated ? <ParticipacionCapabilitiesProvider>{children}</ParticipacionCapabilitiesProvider> : children }
function tree(initialEntries = ['/participar?campania_id=7&subcampania_id=11']) { return <MemoryRouter initialEntries={initialEntries}><TestCapabilities><Routes><Route path="/participar" element={<ParticipantHomeScreen />} /><Route path="/app/planting/subcampanias/:subcampaniaId" element={<SubcampaniaDetailRoute />} /><Route path="*" element={<p>Destino público</p>} /></Routes><Location /></TestCapabilities></MemoryRouter> }
function selectScope(id: string) { fireEvent.click(screen.getByRole('button', { name: /^Volver(?: a mis subcampañas)?$/ })); fireEvent.click(screen.getByRole('button', { name: `Entrar a la subcampaña: Zona ${id}` })) }

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  localStorage.clear()
  localStorage.setItem('authToken', 'ana-token')
  auth.user = { id: '42', auth_id: 'ana', rol: 'VOLUNTARIO', nombre: 'Ana' }
  auth.hydrated = true
  auth.isAuthenticated = true
  members.mockReset().mockResolvedValue({ data: [], siguiente_cursor: null, observado_en: '2026-10-24T12:00:00Z' })
  capabilities.mockReset().mockResolvedValue(page())
  impact.mockReset().mockImplementation(async request => publicCampaign(request.tipo === 'campania' ? request.id : request.tipo === 'subcampania' && request.id === '21' ? '8' : '7'))
  context.mockReset().mockImplementation(async (actorId, id) => operational(id, actorId))
})

describe('UX-01: selección de subcampaña', () => {
  it('conserva un enlace directo mientras se verifica la primera sesión', async () => {
    auth.user = null
    auth.hydrated = false
    auth.isAuthenticated = false
    const view = render(tree())
    expect(screen.getByText('Comprobando tu sesión…')).toBeTruthy()
    expect(capabilities).not.toHaveBeenCalled()
    auth.user = { id: '42', auth_id: 'ana', rol: 'VOLUNTARIO', nombre: 'Ana' }
    auth.hydrated = true
    auth.isAuthenticated = true
    view.rerender(tree())
    expect((await screen.findByRole('link', { name: 'Registrar plantación' })).getAttribute('href')).toContain('/11/registrar')
  })

  it('Atrás del navegador conserva la tarjeta seleccionada', async () => {
    render(tree(['/participar']))
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 12' }))
    await screen.findByRole('link', { name: 'Registrar plantación' })
    fireEvent.click(screen.getByRole('button', { name: 'Atrás del navegador' }))
    expect(screen.getByTestId('location').textContent).toBe('/participar?seleccion=12')
    expect(screen.getByRole('button', { name: 'Entrar a la subcampaña: Zona 12' })).toBeTruthy()
  })

  it('agrupa tres zonas en dos campañas y entra directamente sin consultar mapa ni stock en el inicio', async () => {
    render(tree(['/participar']))
    const group = await screen.findByRole('region', { name: 'Campaña 7' })
    expect(within(group).getAllByRole('article')).toHaveLength(2)
    expect(within(screen.getByRole('region', { name: 'Campaña 8' })).getAllByRole('article')).toHaveLength(1)
    expect(context).not.toHaveBeenCalled()
    expect(impact).not.toHaveBeenCalled()
    fireEvent.click(within(group).getByRole('button', { name: 'Entrar a la subcampaña: Zona 12' }))
    const register = await screen.findByRole('link', { name: 'Registrar plantación' })
    const drafts = screen.getByRole('link', { name: 'Plantaciones en Borrador' })
    expect(register.getAttribute('href')).toContain('/12/registrar')
    expect(drafts.getAttribute('href')).toBe('/app/participacion/borradores')
    expect(Boolean(register.compareDocumentPosition(drafts) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(drafts.className).toContain('bg-white')
    expect(drafts.className).toContain('border-brand-600')
    expect(screen.getByTestId('location').textContent).toBe('/app/planting/subcampanias/12')
    fireEvent.click(screen.getByRole('button', { name: /^Volver(?: a mis subcampañas)?$/ }))
    expect(screen.getByTestId('location').textContent).toContain('seleccion=12')
  })

  it('no redirige automáticamente con una sola zona y distingue roles por ámbito', async () => {
    capabilities.mockResolvedValue(page([scope()]))
    render(tree(['/participar']))
    expect(await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 11' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/participar')
    expect(screen.getByText('Plantador')).toBeTruthy()
    expect(context).not.toHaveBeenCalled()
  })

  it('conserva estados no activos y ámbitos de ADMIN global sin acciones de escritura', async () => {
    const admin = scope('12', '7', 'BORRADOR')
    admin.permiso_contextual = 'ADMINISTRADOR_SUBCAMPANIA'
    const global = scope('21', '8', 'COMPLETADA')
    global.permiso_contextual = null
    global.fuente_autoridad = 'GLOBAL'
    capabilities.mockResolvedValue(page([admin, scope(), global]))
    render(tree(['/participar']))
    expect(await screen.findByText('Plantador')).toBeTruthy()
    const other = screen.getByRole('region', { name: 'Otras subcampañas' })
    expect(within(other).getByText('Administrador de subcampaña')).toBeTruthy()
    expect(within(other).getByText('Administrador · Acceso global')).toBeTruthy()
    expect(within(other).getAllByRole('article')).toHaveLength(2)
    fireEvent.click(within(other).getByRole('button', { name: 'Entrar a la subcampaña: Zona 21' }))
    expect(await screen.findByText(/El registro de plantaciones no está habilitado/)).toBeTruthy()
    expect(context).not.toHaveBeenCalled()
  })

  it('mapa completo contiene sólo zonas autorizadas, sin registros, y conserva modo y selección al volver', async () => {
    render(tree(['/participar']))
    const trigger = await screen.findByRole('button', { name: 'Ver mapa' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Mis subcampañas' })).toBeTruthy()
    const map = await screen.findByTestId('participant-map')
    expect(map.getAttribute('data-scopes')).toBe('11,12,21')
    expect(map.getAttribute('data-points')).toBe('')
    expect(screen.queryByRole('button', { name: 'Mapa: Zona 13' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa: Zona 21' }))
    expect(within(screen.getByRole('region', { name: 'Zona elegida' })).getByText('Campaña 8')).toBeTruthy()
    expect(context).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la subcampaña' }))
    expect((await screen.findByRole('link', { name: 'Registrar plantación' })).getAttribute('href')).toContain('/21/registrar')
    fireEvent.click(screen.getByRole('button', { name: /^Volver(?: a mis subcampañas)?$/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect((await screen.findByTestId('participant-map')).getAttribute('data-selection')).toBe('s:21')
    fireEvent.click(screen.getByRole('button', { name: 'Ver tarjetas' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('location').textContent).toContain('seleccion=21')
  })

  it('permite seleccionar zonas sin geometría por teclado y salir del mapa con Escape', async () => {
    const publicData = publicCampaign()
    publicData.data.subcampanias[0].poligono = null
    impact.mockImplementation(async request => request.tipo !== 'global' && request.id === '7' ? publicData : publicCampaign('8'))
    render(tree(['/participar']))
    const trigger = await screen.findByRole('button', { name: 'Ver mapa' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(await screen.findByText(/1 subcampaña sin ubicación disponible/)).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar subcampaña' }), { target: { value: '11' } })
    expect(screen.getByRole('region', { name: 'Zona elegida' }).textContent).toContain('Zona 11')
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(screen.getByRole('button', { name: 'Entrar a la subcampaña: Zona 11' })).toBeTruthy()
  })

  it('separa error de mapa de geometría no pública y permite reintentar o volver a tarjetas', async () => {
    impact.mockRejectedValueOnce(new Error('Sin conexión')).mockRejectedValueOnce(new ImpactoApiError(404, 'RECURSO_NO_VISIBLE', 'No público'))
    render(tree(['/participar']))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver mapa' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ubicaciones' }))
    await waitFor(() => expect(screen.getByTestId('participant-map').getAttribute('data-scopes')).toBe('11,12,21'))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ver tarjetas' }))
    expect(screen.getAllByRole('button', { name: /Entrar a la subcampaña:/ })).toHaveLength(3)
  })

  it('distingue error de capacidades de vacío sin otro acceso a borradores', async () => {
    capabilities.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(page([]))
    localStorage.setItem('r3foresta:participacion:acceso:v1:42', 'pendiente')
    render(tree(['/participar']))
    expect(await screen.findByText(/No pudimos consultar tus subcampañas/)).toBeTruthy()
    expect(screen.queryByText('Todavía no tienes subcampañas asignadas')).toBeNull()
    expect(screen.getByRole('link', { name: 'Recuperar envío pendiente de esta cuenta' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar campañas' }))
    expect(await screen.findByText('Todavía no tienes subcampañas asignadas')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Recuperar un borrador' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver todo mi historial' })).toBeTruthy()
    expect(impact).not.toHaveBeenCalled()
  })

  it('descarta mapa y selección privada de la cuenta anterior incluso si comparte la zona', async () => {
    const pending = deferred<{ data: ImpactoConsulta }>()
    impact.mockReturnValue(pending.promise)
    const view = render(tree(['/participar?vista=mapa&seleccion=11']))
    await waitFor(() => expect(impact).toHaveBeenCalledTimes(2))
    const signals = impact.mock.calls.map(call => call[2])
    auth.user = { id: '43', auth_id: 'bea', rol: 'VOLUNTARIO', nombre: 'Bea' }
    localStorage.setItem('authToken', 'bea-token')
    capabilities.mockResolvedValue(page([scope()], '43'))
    view.rerender(tree())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 11' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/participar')
    expect(signals.every(signal => signal?.aborted)).toBe(true)
    await act(async () => pending.resolve(publicCampaign()))
    expect(screen.queryByTestId('participant-map')).toBeNull()
    expect(context).not.toHaveBeenCalled()
  })
})

describe('Participar centrado en campañas y subcampañas habilitadas', () => {
  it('mantiene la orientación pública sin consultar stock ni capacidades para un visitante', () => {
    auth.user = null
    auth.isAuthenticated = false
    render(tree())
    expect(screen.getByRole('link', { name: 'Crear mi perfil' })).toBeTruthy()
    expect(capabilities).not.toHaveBeenCalled()
    expect(context).not.toHaveBeenCalled()
  })

  it('espera todas las páginas de capacidades antes de publicar las zonas de trabajo', async () => {
    const pending = deferred<CapacidadesLectura>()
    capabilities.mockResolvedValueOnce(page([scope('11')], '42', 'siguiente')).mockReturnValueOnce(pending.promise)
    render(tree(['/participar']))
    await waitFor(() => expect(capabilities).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: /Seleccionar subcampaña/ })).toBeNull()
    expect(context).not.toHaveBeenCalled()
    await act(async () => pending.resolve(page([scope('12'), scope('21', '8')])))
    expect(await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 12' })).toBeTruthy()
  })

  it('limita el mapa del detalle a su zona incluso si la lectura contiene otras', async () => {
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    expect(screen.queryByTestId('participant-map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    expect(screen.getByTestId('participant-map').getAttribute('data-scopes')).toBe('11')
    expect(screen.getByTestId('participant-map').getAttribute('data-points')).toBe('11')
    expect(screen.queryByRole('button', { name: 'Toda la campaña' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Explorar el impacto de toda la campaña' }).getAttribute('href')).toBe('/impacto/campanias/7')
    expect(context.mock.calls.every(([, id]) => id === '11')).toBe(true)
  })

  it('conserva el historial de una subcampaña cerrada sin consultar stock ni ofrecer registro', async () => {
    capabilities.mockResolvedValue(page([scope('11'), scope('12', '7', 'COMPLETADA')]))
    const publicData = publicCampaign()
    publicData.data.subcampanias[1].estado = 'COMPLETADA'
    impact.mockResolvedValue(publicData)
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    selectScope('12')
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sin stock para registrar' })).toBeNull()
    expect(screen.getByText(/El registro de plantaciones no está habilitado/)).toBeTruthy()
    expect((await screen.findByRole('link', { name: 'Ver historial de la subcampaña' })).getAttribute('href')).toBe('/impacto/subcampanias/12')
    expect(context.mock.calls.every(([, id]) => id !== '12')).toBe(true)
  })

  it('consulta el ámbito exacto y reemplaza sus indicadores al paginar', async () => {
    const first = publicCampaign()
    first.data.siguiente_cursor = '100'
    const next = structuredClone(first)
    next.data.siguiente_cursor = null
    next.data.subcampanias[0].plantacion_inicial = 35
    next.data.subcampanias[0].meta_inicial = 60
    impact.mockResolvedValueOnce(first).mockResolvedValueOnce(next)
    render(tree())
    const selected = await screen.findByRole('region', { name: 'Subcampaña seleccionada' })
    await screen.findByRole('button', { name: 'Cargar más registros colectivos' })
    expect(within(selected).getByLabelText('Plantados: 10. Meta: 40')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros colectivos' }))
    await waitFor(() => expect(within(selected).getByLabelText('Plantados: 35. Meta: 60')).toBeTruthy())
    expect(impact.mock.calls[0][0]).toEqual({ tipo: 'subcampania', id: '11' })
    expect(impact.mock.calls[1][1]).toEqual({ limite: 20, cursor: '100' })
  })

  it('actualiza los dos indicadores de la zona sin limitar registros por superar la meta', async () => {
    const publicData = publicCampaign()
    Object.assign(publicData.data.subcampanias[1], { plantacion_inicial: 50, meta_inicial: 40, faltantes: 0, avance_porcentaje: 125, reposiciones: 3, bajas_reportadas: 5 })
    publicData.data.indicadores.plantacion_inicial = 70
    impact.mockResolvedValue(publicData)
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    selectScope('12')
    const selected = screen.getByRole('region', { name: 'Subcampaña seleccionada' })
    await waitFor(() => expect(within(selected).getByLabelText('Plantados: 50. Meta: 40')).toBeTruthy())
    const register = await screen.findByRole('link', { name: 'Registrar plantación' })
    expect(register.getAttribute('href')).toBe('/app/participacion/subcampanias/12/registrar')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('125%')
  })

  it('permite registrar con stock confirmado aunque falle la consulta de avance público', async () => {
    impact.mockRejectedValueOnce(new Error('Consulta no disponible'))
    render(tree())
    expect(await screen.findByRole('link', { name: 'Registrar plantación' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'En toda la campaña' })).toBeNull()
    expect(screen.getByText(/El avance y la meta públicos no están disponibles/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa y avance' }))
    expect(await screen.findByRole('progressbar')).toBeTruthy()
    expect(context).toHaveBeenCalledTimes(1)
  })

  it('mantiene el registro accesible con stock plegado y deshabilita al reconsultar su disponibilidad', async () => {
    context.mockResolvedValueOnce(operational()).mockResolvedValueOnce(operational('11', '42', 0))
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    const stockDetails = screen.getByText('Disponibles para registrar').closest('details')!
    expect(stockDetails.open).toBe(false)
    fireEvent.click(screen.getByText('Disponibles para registrar'))
    expect(stockDetails.open).toBe(true)
    expect(screen.getByRole('list', { name: 'Stock por especie' }).textContent).toContain('15')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar stock' }))
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Registrar plantación' }) as HTMLButtonElement).disabled).toBe(true)
    expect(await screen.findByRole('button', { name: 'Sin stock para registrar' })).toBeTruthy()
    expect(context.mock.calls.every(([, id]) => id === '11')).toBe(true)
  })

  it.each(['13', '999'])('informa un enlace no autorizado u obsoleto (%s) sin elegir otra zona', async id => {
    render(tree([`/participar?campania_id=7&subcampania_id=${id}`]))
    expect(await screen.findByText(/La subcampaña del enlace no está disponible/)).toBeTruthy()
    expect(context).not.toHaveBeenCalled()
    expect(impact).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Volver(?: a mis subcampañas)?$/ }))
    expect(screen.getByRole('button', { name: 'Entrar a la subcampaña: Zona 11' })).toBeTruthy()
  })

  it('cambia campaña, ámbito y enlace de registro juntos y conserva el contexto en la URL', async () => {
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    selectScope('12')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Registrar plantación' }).getAttribute('href')).toBe('/app/participacion/subcampanias/12/registrar'))
    expect(screen.getByTestId('location').textContent).toContain('/subcampanias/12')
    fireEvent.click(screen.getByRole('button', { name: /^Volver(?: a mis subcampañas)?$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a la subcampaña: Zona 21' }))
    expect(screen.queryByRole('button', { name: 'Seleccionar subcampaña: Zona 11' })).toBeNull()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Registrar plantación' }).getAttribute('href')).toBe('/app/participacion/subcampanias/21/registrar'))
    expect(screen.getByTestId('location').textContent).toContain('/subcampanias/21')
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    expect(screen.getByTestId('participant-map').getAttribute('data-scopes')).toBe('21')
  })

  it('representa stock cero confirmado sin retirar la subcampaña asignada', async () => {
    context.mockResolvedValue(operational('11', '42', 0))
    render(tree())
    const disabled = await screen.findByRole('button', { name: 'Sin stock para registrar' })
    expect((disabled as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('heading', { name: 'Zona 11' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
  })

  it('distingue un error de stock de saldo cero y permite reconsultar', async () => {
    context.mockRejectedValueOnce(new Error('No se pudo consultar el stock.'))
    render(tree())
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar stock' }))
    expect(screen.queryByRole('button', { name: 'Sin stock para registrar' })).toBeNull()
    expect(await screen.findByRole('link', { name: 'Registrar plantación' })).toBeTruthy()
    expect(context).toHaveBeenCalledTimes(2)
  })

  it('no restaura stock antiguo al volver rápidamente a la subcampaña anterior', async () => {
    const other = deferred<ContextoRegistroLectura>(), repeated = deferred<ContextoRegistroLectura>()
    context.mockResolvedValueOnce(operational()).mockReturnValueOnce(other.promise).mockReturnValueOnce(repeated.promise)
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    selectScope('12')
    await waitFor(() => expect(context).toHaveBeenCalledTimes(2))
    const oldSignal = context.mock.calls[1][2]!
    selectScope('11')
    await waitFor(() => expect(context).toHaveBeenCalledTimes(3))
    expect(oldSignal.aborted).toBe(true)
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    await act(async () => { other.resolve(operational('12')); await other.promise })
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    await act(async () => { repeated.resolve(operational('11', '42', 0)); await repeated.promise })
    expect(screen.getByRole('button', { name: 'Sin stock para registrar' })).toBeTruthy()
  })

  it('cancela stock de la cuenta anterior y descarta su respuesta tardía al cambiar sesión', async () => {
    const oldContext = deferred<ContextoRegistroLectura>()
    context.mockReturnValueOnce(oldContext.promise)
    const view = render(tree())
    await waitFor(() => expect(context).toHaveBeenCalledTimes(1))
    const oldSignal = context.mock.calls[0][2]!
    auth.user = { id: '43', auth_id: 'bea', rol: 'VOLUNTARIO', nombre: 'Bea' }
    localStorage.setItem('authToken', 'bea-token')
    capabilities.mockResolvedValueOnce(page([scope('21', '8')], '43'))
    context.mockResolvedValueOnce(operational('21', '43', 0))
    view.rerender(tree())
    expect(oldSignal.aborted).toBe(true)
    expect(screen.queryByRole('button', { name: 'Seleccionar subcampaña: Zona 11' })).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 21' }))
    await screen.findByRole('button', { name: 'Sin stock para registrar' })
    await act(async () => { oldContext.resolve(operational()); await oldContext.promise })
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    expect(screen.queryByText('Especie 42-11')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sin stock para registrar' })).toBeTruthy()
  })
})


describe('UX-02: detalle compartido', () => {
  it('mantiene oculta la gestión para un plantador aunque reciba una acción de gestión', async () => {
    const area = scope()
    area.acciones.incorporar_plantador = true
    capabilities.mockResolvedValue(page([area]))
    render(tree(['/participar']))
    await screen.findByRole('button', { name: 'Entrar a la subcampaña: Zona 11' })
    expect(screen.queryByRole('link', { name: 'Gestionar plantadores' })).toBeNull()
  })

  it.each(['plantador', 'contextual'])('comparte encabezado y secciones para %s sin cargar el equipo al entrar', async profile => {
    const area = scope()
    if (profile === 'contextual') {
      area.permiso_contextual = 'ADMINISTRADOR_SUBCAMPANIA'
      area.acciones.incorporar_plantador = true
    }
    capabilities.mockResolvedValue(page([area]))
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    const heading = screen.getByRole('heading', { name: 'Zona 11' })
    expect(heading.closest('header')).toBeTruthy()
    for (const name of ['Resumen', 'Equipo', 'Mapa']) expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Especies de plantas' }).textContent).toContain('en el plan')
    expect(screen.getByText('Disponibles para registrar').closest('details')?.open).toBe(false)
    expect(members).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Abrir gestión interna y plan' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
    await screen.findByText('Todavía no hay participantes asignados')
    expect(members).toHaveBeenCalledExactlyOnceWith('11', { limite: 20 }, expect.any(AbortSignal))
    expect(Boolean(screen.queryByRole('button', { name: 'Agregar participante' }))).toBe(profile === 'contextual')
    expect(Boolean(screen.queryByRole('link', { name: 'Retirar o cambiar otros permisos' }))).toBe(profile === 'contextual')
    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }))
    expect(screen.getByRole('link', { name: 'Registrar plantación' })).toBeTruthy()
  })

  it('conserva polígono y registro autorizados si no existe detalle público; no comparte ni inventa historial vacío', async () => {
    impact.mockRejectedValue(new ImpactoApiError(404, 'RECURSO_NO_VISIBLE', 'No público'))
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    expect(screen.getByText(/Esto no significa que la subcampaña no exista/)).toBeTruthy()
    expect(screen.queryByText(/Todavía no hay plantaciones/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copiar enlace' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    expect(screen.getByTestId('participant-map').getAttribute('data-scopes')).toBe('11')
    expect(screen.queryByText('El polígono no está disponible en esta consulta.')).toBeNull()
  })

  it('conserva zona, pestaña y selección al volver del registro público', async () => {
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar plantación' }), { target: { value: '1011' } })
    expect(screen.getByTestId('participant-map').getAttribute('data-selection')).toBe('r:1011')
    fireEvent.click(screen.getByRole('link', { name: 'Ver esta plantación' }))
    expect(JSON.parse(screen.getByTestId('location-state').textContent!).impactoReturnTo).toBe('/app/planting/subcampanias/11?pestana=mapa&registro=1011')
    fireEvent.click(screen.getByRole('button', { name: 'Atrás del navegador' }))
    expect(screen.getByRole('button', { name: 'Mapa' }).getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(screen.getByTestId('participant-map').getAttribute('data-selection')).toBe('r:1011'))
  })

  it('comparte únicamente la URL pública sin selección ni parámetros privados', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(tree(['/participar?campania_id=7&subcampania_id=11&pestana=resumen&registro=1011']))
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar enlace' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/impacto/subcampanias/11`))
  })

  it('un fallo del equipo es local y la paginación conserva personas sin duplicarlas', async () => {
    const area = scope()
    area.permiso_contextual = 'ADMINISTRADOR_SUBCAMPANIA'
    capabilities.mockResolvedValue(page([area]))
    const member = { usuario_id: '50', nombre: 'Persona del equipo', organizacion: null, permiso_contextual: 'PLANTADOR' as const, revision_permiso: '1', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: null }
    members.mockRejectedValueOnce(new Error('Equipo no disponible')).mockResolvedValueOnce({ data: [member], siguiente_cursor: '50', observado_en: '2026-10-24T12:00:00Z' }).mockResolvedValueOnce({ data: [member, { ...member, usuario_id: '51', nombre: 'Segunda persona' }], siguiente_cursor: null, observado_en: '2026-10-24T12:00:00Z' })
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar equipo' }))
    expect(screen.queryByRole('link', { name: 'Registrar plantación' })).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más personas' }))
    await screen.findByText('Segunda persona')
    expect(screen.getAllByText('Persona del equipo')).toHaveLength(1)
    expect(members.mock.calls[2][1]).toEqual({ limite: 20, cursor: '50' })
  })

  it('cancela miembros al salir del ámbito y consulta por separado el equipo del plantador', async () => {
    const area = scope()
    area.permiso_contextual = 'ADMINISTRADOR_SUBCAMPANIA'
    capabilities.mockResolvedValue(page([area, scope('12')]))
    const pending = deferred<Awaited<ReturnType<typeof ParticipacionService.miembros>>>()
    members.mockReturnValueOnce(pending.promise)
    render(tree())
    await screen.findByRole('link', { name: 'Registrar plantación' })
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
    await waitFor(() => expect(members).toHaveBeenCalledTimes(1))
    const signal = members.mock.calls[0][2]!
    selectScope('12')
    await screen.findByRole('link', { name: 'Registrar plantación' })
    expect(signal.aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }))
    await act(async () => pending.resolve({ data: [], siguiente_cursor: null, observado_en: '2026-10-24T12:00:00Z' }))
    await screen.findByText('Todavía no hay participantes asignados')
    expect(members).toHaveBeenCalledTimes(2)
    expect(members.mock.calls[1][0]).toBe('12')
  })
})
