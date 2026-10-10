import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import type { GetPlanData, PlantacionContext, RevisarPlanData, Subcampania } from '../types/contracts'
import DetalleSubcampanaScreen from './DetalleSubcampanaScreen'

const authState = vi.hoisted(() => ({
  user: { auth_id: 'auth-1', rol: 'ADMIN' }, login: vi.fn(), logout: vi.fn(),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authState }))
vi.mock('../../../services/plantacion.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/plantacion.service')>()
  return { ...actual, PlantacionService: {
    ...actual.PlantacionService,
    getSubcampania: vi.fn(),
    getSubcampaniaEquipo: vi.fn(),
    getSubcampaniaPlan: vi.fn(),
    revisarSubcampaniaPlan: vi.fn(),
    getCampania: vi.fn(),
    getCampaniaMetrics: vi.fn(),
    getCampaniasResumen: vi.fn(),
    getPlantacionContext: vi.fn(),
  } }
})
vi.mock('react-leaflet', () => ({
  MapContainer: () => null, Polygon: () => null, TileLayer: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const subcampania: Subcampania = {
  id: 54, campania_id: 20, nombre: 'Subcampaña Palca', zona_id: 1,
  meta_total_arboles: 40, total_plantado_inicial: 50, saldo_vivo_actual: 50,
  estado: 'ACTIVA', created_at: '2026-10-09',
}
const plan: GetPlanData = {
  subcampania_id: 54, estado: 'ACTIVA', meta_total_arboles: 40, plan_revision: 2,
  metas: [{ planta_id: 5, cantidad_objetivo: 40, porcentaje_objetivo: 100,
    planta: { id: 5, especie: 'Aliso', nombre_cientifico: 'Alnus acuminata' } }],
}
const saved: RevisarPlanData = {
  ...plan, plan_revision: 3, meta_total_arboles: 60,
  metas: [{ ...plan.metas[0], cantidad_objetivo: 60 }],
}
const context: PlantacionContext = {
  subcampania: { ...subcampania, meta_total_arboles: 60, plan_revision: 3 },
  usuario: { id: 1, rol_global: 'ADMIN', puede_registrar: true }, equipo: [],
  plan_por_especie: [{ planta_id: 5, cantidad_objetivo: 60, plantado_inicial: 50, pendiente_meta: 10 }],
  stock_por_especie: [{ planta_id: 5, stock_asignado_disponible: 12, asignaciones: [] }],
  reglas: { permite_exceder_meta_especie: true },
}

function DetailRoute() {
  return <MemoryRouter initialEntries={['/subcampanias/54']}>
    <Routes><Route path="/subcampanias/:subcampaniaId" element={<DetalleSubcampanaScreen />} /></Routes>
  </MemoryRouter>
}

function renderDetail() {
  return render(<DetailRoute />)
}

async function openEditor() {
  const user = userEvent.setup()
  const card = await screen.findByRole('region', { name: 'Mix de especies planificado' })
  await user.click(within(card).getByRole('button', { name: 'Editar meta y especies' }))
  await screen.findByLabelText(/Meta total propuesta/)
  return user
}

async function reviewGoal60() {
  const user = await openEditor()
  fireEvent.change(screen.getByLabelText(/Meta total propuesta/), { target: { value: '60' } })
  fireEvent.change(screen.getByLabelText(/Cantidad propuesta de Aliso/), { target: { value: '60' } })
  await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
  return user
}

beforeEach(() => {
  authState.user.auth_id = 'auth-1'
  authState.user.rol = 'ADMIN'
  authState.login.mockReset().mockResolvedValue(undefined)
  authState.logout.mockReset()
  vi.mocked(PlantacionService.getSubcampania).mockReset().mockResolvedValue(subcampania)
  vi.mocked(PlantacionService.getSubcampaniaEquipo).mockReset().mockResolvedValue([])
  vi.mocked(PlantacionService.getSubcampaniaPlan).mockReset().mockResolvedValue(plan)
  vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockReset().mockResolvedValue(saved)
  vi.mocked(PlantacionService.getCampania).mockReset().mockResolvedValue({
    id: 20, nombre: 'Campaña Palca', tipo: 'REFORESTACION', codigo_trazabilidad: 'CAM-20',
    meta_planificada_campania: 60, created_at: '2026-10-09', updated_at: '2026-10-09',
  })
  vi.mocked(PlantacionService.getCampaniaMetrics).mockReset().mockResolvedValue(null)
  vi.mocked(PlantacionService.getCampaniasResumen).mockReset().mockResolvedValue(null)
  vi.mocked(PlantacionService.getPlantacionContext).mockReset().mockResolvedValue(context)
})

describe('revisión del plan desde el detalle de subcampaña', () => {
  it.each(['GENERAL', 'VALIDADOR', 'VOLUNTARIO'])('permite a %s consultar el plan sin pertenecer al equipo', async (rol) => {
    authState.user.rol = rol
    renderDetail()
    expect(await screen.findByText('Mix de especies planificado')).toBeTruthy()
    expect(screen.getByText('Aliso')).toBeTruthy()
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledExactlyOnceWith(54, 'auth-1')
    expect(PlantacionService.getSubcampaniaEquipo).toHaveBeenCalledExactlyOnceWith(54, 'auth-1')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('button', { name: /Editar meta y especies/ })).toBeNull()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it.each([
    { rol: 'ADMIN', estado: 'BORRADOR', available: true },
    { rol: 'ADMIN', estado: 'ACTIVA', available: true },
    { rol: 'ADMIN', estado: 'COMPLETADA', available: false },
    { rol: 'ADMIN', estado: 'FINALIZADA_PARCIAL', available: false },
    { rol: 'ADMIN', estado: 'CANCELADA', available: false },
    { rol: 'ADMIN', estado: 'PAUSADA', available: false },
    { rol: 'COORDINADOR', estado: 'ACTIVA', available: false },
    { rol: 'GENERAL', estado: 'BORRADOR', available: false },
    { rol: 'VALIDADOR', estado: 'ACTIVA', available: false },
    { rol: 'VOLUNTARIO', estado: 'ACTIVA', available: false },
  ] as const)('muestra la acción para $rol en $estado: $available', async ({ rol, estado, available }) => {
    const user = userEvent.setup()
    authState.user.rol = rol
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, estado })
    renderDetail()
    const card = await screen.findByRole('region', { name: 'Mix de especies planificado' })
    expect(Boolean(within(card).queryByRole('button', { name: 'Editar meta y especies' }))).toBe(available)
    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    const actions = within(screen.getByRole('heading', { name: 'Acciones de subcampaña' }).parentElement!)
    expect(Boolean(actions.queryByRole('button', { name: /Editar meta y especies/ }))).toBe(available)
    expect(screen.queryAllByRole('button', { name: /Editar meta y especies/ })).toHaveLength(available ? 2 : 0)
    if (available) {
      await user.click(actions.getByRole('button', { name: /Editar meta y especies/ }))
      expect(await screen.findByLabelText(/Meta total propuesta/)).toBeTruthy()
      expect(screen.queryByRole('heading', { name: 'Acciones de subcampaña' })).toBeNull()
    }
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('hace visible el 401, bloquea edición y recupera la consulta con el inicio de sesión existente', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(Object.assign(new Error('Falta JWT'), { status: 401 }))
    renderDetail()
    expect(await screen.findByText('Tu sesión no es válida para consultar el plan. Inicia sesión nuevamente.')).toBeTruthy()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('button', { name: /Editar meta y especies/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Cerrar$/ }))
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Mix de especies planificado')).toBeTruthy()
    expect(screen.queryByText('No se pudo consultar el plan vigente')).toBeNull()
    expect(authState.login).toHaveBeenCalledTimes(1)
    expect(authState.logout).not.toHaveBeenCalled()
    expect(PlantacionService.getSubcampania).toHaveBeenCalledTimes(1)
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(2)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(screen.getAllByRole('button', { name: /Editar meta y especies/ })).toHaveLength(2)
  })

  it('conserva el bloqueo y permite reintentar si el inicio de sesión falla', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(Object.assign(new Error('JWT expirado'), { status: 401 }))
    authState.login.mockRejectedValueOnce(new Error('Se canceló el inicio de sesión.'))
    renderDetail()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Se canceló el inicio de sesión.')).toBeTruthy()
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Mix de especies planificado')).toBeTruthy()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('invalida la recuperación de lectura anterior si el inicio de sesión cambia la identidad', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(Object.assign(new Error('JWT expirado'), { status: 401 }))
    const view = renderDetail()
    authState.login.mockImplementationOnce(async () => {
      authState.user.auth_id = 'auth-2'
      view.rerender(<DetailRoute />)
    })
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('Mix de especies planificado')).toBeTruthy()
    expect(screen.queryByText('Consultando plan…')).toBeNull()
    expect(screen.queryByText('Cargando subcampaña...')).toBeNull()
    expect(PlantacionService.getSubcampania).toHaveBeenLastCalledWith(54, 'auth-2')
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenLastCalledWith(54, 'auth-2')
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(2)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it.each([
    { status: 403, message: 'No tienes permiso para consultar este plan.' },
    { status: 404, message: 'La subcampaña no existe.' },
  ])('muestra el error $status y bloquea edición sin cerrar la sesión', async ({ status, message }) => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(Object.assign(new Error('Lectura rechazada'), { status }))
    renderDetail()
    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('button', { name: /Editar meta y especies/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Cerrar$/ }))
    await user.click(screen.getByRole('button', { name: 'Reintentar consulta del plan' }))
    expect(await screen.findByText('Mix de especies planificado')).toBeTruthy()
    expect(authState.login).not.toHaveBeenCalled()
    expect(authState.logout).not.toHaveBeenCalled()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('comunica fallos de conexión del plan sin ocultar el detalle', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(new Error('No hay conexión para consultar el plan.'))
    renderDetail()
    expect(await screen.findByText('No hay conexión para consultar el plan.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Subcampaña Palca', level: 1 })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar consulta del plan' })).toBeTruthy()
    expect(screen.queryByText('Mix de especies planificado')).toBeNull()
  })

  it('actualiza 50/40 a 50/60 tras confirmar y consulta todos los indicadores conservando ACTIVA', async () => {
    const { container } = renderDetail()
    expect(await screen.findByText('125%')).toBeTruthy()
    const user = await reviewGoal60()
    expect(PlantacionService.getCampania).not.toHaveBeenCalled()
    expect(PlantacionService.getPlantacionContext).not.toHaveBeenCalled()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, meta_total_arboles: 60 })
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue(saved)
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const header = container.querySelector('header')!
    expect(within(header).getByText('ACTIVA')).toBeTruthy()
    expect(within(header).getByText('83%')).toBeTruthy()
    expect(within(header).getByText('/ 60')).toBeTruthy()
    expect(within(header).getByText('50', { exact: false }).textContent?.replace(/\s/g, '')).toBe('50/60')
    expect(screen.getByRole('button', { name: 'Registrar plantación' })).toBeTruthy()
    expect(screen.getByText('Plan actualizado. Los registros de plantación y el stock físico se conservan.')).toBeTruthy()
    expect(PlantacionService.getSubcampania).toHaveBeenLastCalledWith(54, 'auth-1')
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(3)
    expect(PlantacionService.getCampania).toHaveBeenCalledExactlyOnceWith(20)
    expect(PlantacionService.getCampaniaMetrics).toHaveBeenCalledExactlyOnceWith(20)
    expect(PlantacionService.getCampaniasResumen).toHaveBeenCalledTimes(1)
    expect(PlantacionService.getPlantacionContext).toHaveBeenCalledExactlyOnceWith(54, 'auth-1')
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledExactlyOnceWith(54, {
      meta_total_arboles: 60, revision_esperada: 2,
      metas: [{ planta_id: 5, cantidad_objetivo: 60, porcentaje_objetivo: 100 }],
    }, 'auth-1')
    expect(context.stock_por_especie[0].stock_asignado_disponible).toBe(12)
    await user.click(screen.getByRole('button', { name: 'Más opciones' }))
    await user.click(screen.getByRole('button', { name: /Cerrar subcampaña/ }))
    expect(screen.getByText('50 plantados / meta 60')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirmar cierre completo' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre parcial' }))
    expect(screen.getByText('Selecciona un motivo para el cierre parcial.')).toBeTruthy()
    expect(screen.getByLabelText(/Motivo del cierre parcial/).tagName).toBe('SELECT')
    await user.click(screen.getByRole('button', { name: 'Seguir plantando' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(header).getByText('ACTIVA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registrar plantación' })).toBeTruthy()
  })

  it('conserva el guardado confirmado y ofrece recuperar una lectura de indicadores fallida', async () => {
    renderDetail()
    const user = await reviewGoal60()
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, meta_total_arboles: 60 })
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue(saved)
    vi.mocked(PlantacionService.getCampaniaMetrics).mockRejectedValueOnce(new Error('No hay conexión para métricas.'))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('El plan se guardó, pero no se pudieron actualizar todos los indicadores. Recarga el detalle antes de continuar.')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('83%')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Recargar detalle' }))
    await waitFor(() => expect(screen.queryByText('El plan se guardó, pero no se pudieron actualizar todos los indicadores. Recarga el detalle antes de continuar.')).toBeNull())
    expect(screen.getByRole('button', { name: 'Registrar plantación' })).toBeTruthy()
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
    expect(PlantacionService.getSubcampania).toHaveBeenCalledTimes(3)
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(4)
    expect(PlantacionService.getCampania).toHaveBeenCalledTimes(2)
    expect(PlantacionService.getCampaniaMetrics).toHaveBeenCalledTimes(2)
    expect(PlantacionService.getCampaniasResumen).toHaveBeenCalledTimes(2)
    expect(PlantacionService.getPlantacionContext).toHaveBeenCalledTimes(2)
  })

  it('conserva el plan confirmado cuando falla la lectura posterior y recupera solo con GET', async () => {
    const { container } = renderDetail()
    const user = await reviewGoal60()
    vi.mocked(PlantacionService.getSubcampania).mockRejectedValueOnce(new Error('No hay conexión para el detalle.'))
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(Object.assign(new Error('JWT expirado'), { status: 401 }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('Se muestra el último plan confirmado. Vuelve a consultar para obtener el plan vigente.')).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const header = container.querySelector('header')!
    expect(within(header).getByText('/ 60')).toBeTruthy()
    expect(within(header).getByText('83%')).toBeTruthy()
    expect(screen.getByText('Aliso')).toBeTruthy()
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue(saved)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => expect(screen.queryByText('No se pudo consultar el plan vigente')).toBeNull())
    expect(within(header).getByText('/ 60')).toBeTruthy()
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(4)
    expect(PlantacionService.getSubcampania).toHaveBeenCalledTimes(2)
  })
})
