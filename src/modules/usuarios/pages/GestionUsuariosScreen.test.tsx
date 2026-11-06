import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapabilitiesState } from '../../participacion/hooks/capabilitiesContext'
import { ParticipacionApiError, UsuariosService } from '../api/usuarios.api'
import type { useRoleCommand } from '../commands/useRoleCommand'
import type { IntentoRol, ReciboRol, UsuarioAdministracion, UsuariosLectura } from '../types'
import GestionUsuariosScreen from './GestionUsuariosScreen'

const mocks = vi.hoisted(() => ({
  actorId: '42' as string | null,
  capabilities: {} as CapabilitiesState,
  command: {} as ReturnType<typeof useRoleCommand>,
  hook: vi.fn(), login: vi.fn(), refresh: vi.fn(), updateUser: vi.fn(),
  confirm: vi.fn(), recover: vi.fn(), retrySame: vi.fn(), resetTerminal: vi.fn(),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.actorId ? { id: mocks.actorId } : null, login: mocks.login, updateUserFromBackend: mocks.updateUser }) }))
vi.mock('../../participacion/hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => mocks.capabilities }))
vi.mock('../commands/useRoleCommand', () => ({ useRoleCommand: (actorId: string | null) => { mocks.hook(actorId); return mocks.command } }))

const observed = '2026-11-03T12:00:00Z'
const ana: UsuarioAdministracion = { usuario_id: '9007199254740995', nombre: 'Ana Pérez', username: 'ana', rol_global: 'VOLUNTARIO', activo: true, revision_autoridad: '0' }
const luis: UsuarioAdministracion = { ...ana, usuario_id: '9007199254740996', nombre: 'Luis Prado', username: null }
const page = (data: UsuarioAdministracion[], cursor: string | null = null): UsuariosLectura => ({ data, siguiente_cursor: cursor, observado_en: observed })
const pending: IntentoRol = { actor_id: '42', operacion: 'CAMBIAR_ROL_GLOBAL', usuario_id: ana.usuario_id, payload: { comando_id: 'a0c976ce-2b10-4f2c-a88e-7db287fc3454', rol_global: 'GENERAL', revision_esperada: '0', motivo: 'Funciones de campo' } }
function receipt(target = ana.usuario_id): ReciboRol {
  return { comando_id: pending.payload.comando_id, operacion: 'CAMBIAR_ROL_GLOBAL', finalizado_en: observed, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'ROL_GLOBAL', usuario_id: target, rol_anterior: 'VOLUNTARIO', rol_nuevo: 'GENERAL', revision_anterior: '0', revision_nueva: '1', cambio: 'CAMBIO_APLICADO' } }
}
function open() { return render(<MemoryRouter><GestionUsuariosScreen /></MemoryRouter>) }

beforeEach(() => {
  mocks.actorId = '42'
  for (const mock of [mocks.login, mocks.refresh, mocks.updateUser, mocks.confirm, mocks.recover, mocks.retrySame, mocks.resetTerminal]) mock.mockResolvedValue(undefined)
  mocks.command = { state: 'idle', busy: false, pending: null, receipt: null, error: null, confirm: mocks.confirm, recover: mocks.recover, retrySame: mocks.retrySame, resetTerminal: mocks.resetTerminal }
  mocks.capabilities = { status: 'ready', error: null, refresh: mocks.refresh, data: { data: { actor: { usuario_id: '42', rol_global: 'ADMIN' }, capacidades_globales: { asignar_roles: true, designar_administradores: true, leer_plan: true }, subcampanias: [] }, observado_en: observed, siguiente_cursor: null } }
  vi.spyOn(UsuariosService, 'listar').mockResolvedValue(page([ana]))
  vi.spyOn(UsuariosService, 'autoridad').mockResolvedValue({ data: { usuario_id: ana.usuario_id, nombre: ana.nombre, rol_global: 'GENERAL', activo: true, revision_autoridad: '9007199254740997' }, observado_en: observed })
})

async function selectAna() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Seleccionar a Ana Pérez (ana)' }))
  return user
}

type ReadOperation = 'listado' | 'autoridad' | 'paginación'
function rejectRead(operation: ReadOperation, status: 401 | 403) {
  const error = new ParticipacionApiError(status, {
    codigo: status === 401 ? 'SESION_INVALIDA' : 'CAPACIDAD_INSUFICIENTE',
    mensaje: status === 401 ? 'La sesión venció al consultar usuarios.' : 'Ya no puedes gestionar roles.',
    campos: [], ambitos: [], reintento: status === 401 ? 'RECUPERAR_SESION' : 'NO_APLICA',
  })
  if (operation === 'autoridad') vi.mocked(UsuariosService.autoridad).mockRejectedValueOnce(error)
  else if (operation === 'paginación') vi.mocked(UsuariosService.listar).mockResolvedValueOnce(page([ana], 'cursor-firmado')).mockRejectedValueOnce(error)
  else vi.mocked(UsuariosService.listar).mockRejectedValueOnce(error)
}

async function attemptRead(operation: ReadOperation) {
  const user = userEvent.setup()
  if (operation === 'autoridad') {
    await user.click(await screen.findByRole('button', { name: 'Seleccionar a Ana Pérez (ana)' }))
    await user.type(screen.getByLabelText('Motivo del cambio'), 'Asignación de funciones')
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
  } else if (operation === 'paginación') await user.click(await screen.findByRole('button', { name: 'Cargar más usuarios' }))
  return user
}

describe('Usuarios y permisos', () => {
  it.each(['rol', 'capacidad', 'actor'] as const)('exige ADMIN, capacidad y cuenta correctos: %s', (caseName) => {
    if (caseName === 'rol') mocks.capabilities.data!.data.actor.rol_global = 'GENERAL'
    if (caseName === 'capacidad') mocks.capabilities.data!.data.capacidades_globales.asignar_roles = false
    if (caseName === 'actor') mocks.capabilities.data!.data.actor.usuario_id = '43'
    open()
    expect(screen.getByText(/Solo los administradores globales/)).toBeTruthy()
    expect(UsuariosService.listar).not.toHaveBeenCalled()
    expect(mocks.hook).toHaveBeenCalledWith('42')
  })

  it('distingue fallo de capacidades de autorización denegada', () => {
    mocks.capabilities = { ...mocks.capabilities, status: 'error', data: null, error: 'Sin conexión para comprobar permisos' }
    open()
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    expect(screen.queryByText(/Solo los administradores globales/)).toBeNull()
    expect(UsuariosService.listar).not.toHaveBeenCalled()
  })

  it.each<ReadOperation>(['listado', 'autoridad', 'paginación'])('permite recuperar sesión tras 401 de %s sin confirmar cambios', async (operation) => {
    rejectRead(operation, 401)
    open()
    const user = await attemptRead(operation)
    expect((await screen.findByRole('alert')).textContent).toContain('La sesión venció al consultar usuarios.')
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Recuperar sesión con passkey' }))
    await screen.findByLabelText('Buscar por nombre o usuario')
    expect(mocks.login).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it.each<ReadOperation>(['listado', 'autoridad', 'paginación'])('bloquea asignaciones tras 403 de %s hasta reconsultar permisos', async (operation) => {
    rejectRead(operation, 403)
    let resolveRefresh!: () => void
    mocks.refresh.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveRefresh = resolve }))
    open()
    const user = await attemptRead(operation)
    expect((await screen.findByRole('alert')).textContent).toContain('Ya no puedes gestionar roles.')
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect(screen.queryByLabelText('Nuevo rol')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
    const readsBeforeRefresh = vi.mocked(UsuariosService.listar).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Revisar permisos' }))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect(UsuariosService.listar).toHaveBeenCalledTimes(readsBeforeRefresh)
    await act(async () => resolveRefresh())
    await screen.findByLabelText('Buscar por nombre o usuario')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('relee autoridad, muestra antes/después y confirma IDs y revisión sin pérdida', async () => {
    open()
    const user = await selectAna()
    await user.selectOptions(screen.getByLabelText('Nuevo rol'), 'VALIDADOR')
    await user.type(screen.getByLabelText('Motivo del cambio'), '  Validación de campo  ')
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('General')).toBeTruthy()
    expect(within(dialog).getByText('Validador')).toBeTruthy()
    expect(mocks.confirm).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect((screen.getByLabelText('Motivo del cambio') as HTMLTextAreaElement).value).toBe('  Validación de campo  ')
    await user.selectOptions(screen.getByLabelText('Nuevo rol'), 'ADMIN')
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar rol' }))
    expect(UsuariosService.autoridad).toHaveBeenCalledTimes(2)
    expect(mocks.confirm).toHaveBeenCalledWith({ usuario_id: ana.usuario_id, rol_global: 'ADMIN', revision_esperada: '9007199254740997', motivo: 'Validación de campo' })
  })

  it('invalida la revisión si cambia el motivo durante una lectura tardía', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof UsuariosService.autoridad>>) => void
    vi.mocked(UsuariosService.autoridad).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    open()
    const user = await selectAna()
    await user.type(screen.getByLabelText('Motivo del cambio'), 'Revisar campo')
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
    await user.type(screen.getByLabelText('Motivo del cambio'), ' actualizado')
    await act(async () => resolve({ data: { usuario_id: ana.usuario_id, nombre: ana.nombre, rol_global: 'VOLUNTARIO', activo: true, revision_autoridad: '9' }, observado_en: observed }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(vi.mocked(UsuariosService.autoridad).mock.calls[0][2]?.aborted).toBe(true)
  })

  it('los filtros limpian selección y descartan resultados tardíos de la búsqueda anterior', async () => {
    let resolve!: (value: UsuariosLectura) => void
    vi.mocked(UsuariosService.listar).mockImplementationOnce(() => new Promise((done) => { resolve = done })).mockResolvedValue(page([luis]))
    open()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Buscar por nombre o usuario'), 'Luis')
    await user.selectOptions(screen.getByLabelText('Filtrar por rol'), 'VOLUNTARIO')
    await user.click(screen.getByRole('button', { name: 'Buscar usuarios' }))
    await screen.findByText('Luis Prado')
    await act(async () => resolve(page([ana])))
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(UsuariosService.listar).toHaveBeenLastCalledWith('42', { consulta: 'Luis', rol_global: 'VOLUNTARIO', limite: 20 }, expect.any(AbortSignal))
    await user.click(screen.getByRole('button', { name: /Seleccionar a Luis Prado/ }))
    expect(screen.getByLabelText('Nuevo rol')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cambiar usuario' }))
    await user.type(screen.getByLabelText('Buscar por nombre o usuario'), ' nuevo')
    expect(screen.queryByLabelText('Nuevo rol')).toBeNull()
    expect((screen.getByRole('button', { name: /Seleccionar a Luis Prado/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('pagina sin perder la lista y muestra errores de lectura con reintento', async () => {
    vi.mocked(UsuariosService.listar).mockRejectedValueOnce(new Error('No hay conexión para listar')).mockResolvedValueOnce(page([ana], 'cursor-firmado')).mockResolvedValue(page([luis]))
    open()
    const user = userEvent.setup()
    expect((await screen.findByRole('alert')).textContent).toContain('No hay conexión')
    expect(screen.queryByText(/No hay usuarios activos/)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Reintentar lista' }))
    await screen.findByText('Ana Pérez')
    await user.click(screen.getByRole('button', { name: 'Cargar más usuarios' }))
    await screen.findByText('Luis Prado')
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(UsuariosService.listar).toHaveBeenLastCalledWith('42', { limite: 20, cursor: 'cursor-firmado' }, expect.any(AbortSignal))
  })

  it('seleccionar una cuenta oculta las demás y lleva el foco al formulario', async () => {
    vi.mocked(UsuariosService.listar).mockResolvedValue(page([ana, luis]))
    open()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Seleccionar a Luis Prado/ }))
    expect(screen.getByText('Luis Prado')).toBeTruthy()
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect(screen.queryByLabelText('Filtrar por rol')).toBeNull()
    expect(screen.queryByRole('button', { name: /Seleccionar a/ })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Cambiar rol' }))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('cambiar usuario conserva búsqueda, filtro y páginas sin enviar ni repetir el listado', async () => {
    vi.mocked(UsuariosService.listar)
      .mockResolvedValueOnce(page([ana]))
      .mockResolvedValueOnce(page([ana], 'cursor-firmado'))
      .mockResolvedValueOnce(page([luis]))
    open()
    const user = userEvent.setup()
    await screen.findByText('Ana Pérez')
    await user.type(screen.getByLabelText('Buscar por nombre o usuario'), 'Prado')
    await user.selectOptions(screen.getByLabelText('Filtrar por rol'), 'VOLUNTARIO')
    await user.click(screen.getByRole('button', { name: 'Buscar usuarios' }))
    await user.click(await screen.findByRole('button', { name: 'Cargar más usuarios' }))
    await user.click(await screen.findByRole('button', { name: /Seleccionar a Luis Prado/ }))
    await user.type(screen.getByLabelText('Motivo del cambio'), 'Asignación propuesta')
    const reads = vi.mocked(UsuariosService.listar).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Cambiar usuario' }))
    const search = screen.getByLabelText('Buscar por nombre o usuario') as HTMLInputElement
    expect(search.value).toBe('Prado')
    expect((screen.getByLabelText('Filtrar por rol') as HTMLSelectElement).value).toBe('VOLUNTARIO')
    expect(document.activeElement).toBe(search)
    expect(screen.getByRole('button', { name: /Seleccionar a Ana Pérez/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Seleccionar a Luis Prado/ })).toBeTruthy()
    expect(UsuariosService.listar).toHaveBeenCalledTimes(reads)
    expect(mocks.confirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Seleccionar a Ana Pérez/ }))
    expect((screen.getByLabelText('Motivo del cambio') as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByLabelText('Nuevo rol') as HTMLSelectElement).value).toBe(ana.rol_global)
  })

  it('cambiar usuario cancela la autoridad pendiente y limpia el motivo antes de otra selección', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof UsuariosService.autoridad>>) => void
    vi.mocked(UsuariosService.listar).mockResolvedValue(page([ana, luis]))
    vi.mocked(UsuariosService.autoridad).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    open()
    const user = await selectAna()
    await user.type(screen.getByLabelText('Motivo del cambio'), 'Asignación anterior')
    await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
    await user.click(screen.getByRole('button', { name: 'Cambiar usuario' }))
    expect(vi.mocked(UsuariosService.autoridad).mock.calls[0][2]?.aborted).toBe(true)
    await user.click(screen.getByRole('button', { name: /Seleccionar a Luis Prado/ }))
    await act(async () => resolve({ data: { usuario_id: ana.usuario_id, nombre: ana.nombre, rol_global: 'ADMIN', activo: true, revision_autoridad: '9' }, observado_en: observed }))
    expect(screen.getByText('Luis Prado')).toBeTruthy()
    expect((screen.getByLabelText('Motivo del cambio') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it.each(['unconfirmed', 'confirmed'] as const)('ADMIN ve solo el estado del comando %s sin selector ni formulario', async (state) => {
    mocks.command = { ...mocks.command, state, pending, receipt: state === 'confirmed' ? receipt() : null }
    open()
    if (state === 'confirmed') await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    expect(screen.queryByLabelText('Filtrar por rol')).toBeNull()
    expect(screen.queryByLabelText('Nuevo rol')).toBeNull()
    expect(screen.queryByRole('button', { name: /Seleccionar a/ })).toBeNull()
    expect(screen.getByText(state === 'confirmed' ? 'Cambio de rol confirmado' : 'Cambio de rol sin confirmar')).toBeTruthy()
  })

  it('conserva recuperación propia tras perder ADMIN y nunca muestra éxito incierto', async () => {
    mocks.capabilities.data!.data.actor.rol_global = 'VOLUNTARIO'
    mocks.capabilities.data!.data.capacidades_globales.asignar_roles = false
    mocks.command = { ...mocks.command, state: 'unconfirmed', pending, error: 'El resultado todavía no está confirmado' }
    open()
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Consultar resultado original' }))
    await user.click(screen.getByRole('button', { name: 'Reenviar el mismo cambio' }))
    expect(mocks.recover).toHaveBeenCalledTimes(1)
    expect(mocks.retrySame).toHaveBeenCalledTimes(1)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('un rechazo conserva su mensaje y exige otra revisión sin mostrar éxito', async () => {
    const confirmed = receipt()
    mocks.command = { ...mocks.command, state: 'rejected', pending, receipt: { comando_id: confirmed.comando_id, operacion: confirmed.operacion, finalizado_en: observed, estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA', mensaje: 'La revisión cambió; revisa la cuenta.', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' } } }
    open()
    const user = userEvent.setup()
    expect(screen.getByText('Cambio de rol rechazado')).toBeTruthy()
    expect(screen.getByText(/La revisión cambió/)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Preparar otro cambio' }))
    await waitFor(() => expect(mocks.resetTerminal).toHaveBeenCalledTimes(1))
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('un terminal propio refresca capacidades y perfil sin borrar el recibo ante fallo', async () => {
    mocks.command = { ...mocks.command, state: 'confirmed', pending: { ...pending, usuario_id: '42' }, receipt: receipt('42') }
    mocks.updateUser.mockRejectedValueOnce(new Error('Perfil temporalmente no disponible'))
    open()
    const user = userEvent.setup()
    expect(within(screen.getByRole('dialog')).getByText('Rol confirmado')).toBeTruthy()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ver resultado' }))
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('El resultado se conserva'))
    expect(screen.getByText('Cambio de rol confirmado')).toBeTruthy()
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('cambiar de cuenta borra selección y no muestra datos de la cuenta anterior', async () => {
    const view = open()
    await selectAna()
    expect(screen.getByLabelText('Nuevo rol')).toBeTruthy()
    mocks.actorId = '43'
    view.rerender(<MemoryRouter><GestionUsuariosScreen /></MemoryRouter>)
    expect(screen.queryByLabelText('Nuevo rol')).toBeNull()
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(mocks.hook).toHaveBeenLastCalledWith('43')
  })
})
