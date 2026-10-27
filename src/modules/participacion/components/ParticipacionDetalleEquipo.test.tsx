import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from '../api/participacion.api'
import { validarReciboAcceso } from '../api/participacion.contract'
import type { CapacidadSubcampania, IntentoAcceso, MiembrosLectura, PersonaMinima, ReciboAcceso } from '../types'
import ParticipacionDetalleEquipo from './ParticipacionDetalleEquipo'

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), login: vi.fn() }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ login: mocks.login }) }))
vi.mock('../hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => ({ refresh: mocks.refresh }) }))

const observed = '2026-10-26T16:00:00Z'
const person: PersonaMinima = { usuario_id: '9007199254740995', nombre: 'Luis Prado', organizacion: null }
const scope: CapacidadSubcampania = {
  campania_id: '7', campania_nombre: 'Palca', subcampania_id: '51', nombre: 'Norte', estado: 'ACTIVA',
  permiso_contextual: 'PLANTADOR', revision_permiso: '2', fuente_autoridad: 'CONTEXTUAL',
  acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false },
}
const globalScope: CapacidadSubcampania = {
  ...scope, permiso_contextual: null, fuente_autoridad: 'GLOBAL',
  acciones: { ...scope.acciones, incorporar_plantador: true, designar_administrador: true, cambiar_administrador: true },
}
const members: MiembrosLectura = {
  observado_en: observed, siguiente_cursor: null,
  data: [{ usuario_id: '42', nombre: 'Ana Pérez', organizacion: null, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '3', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: null }],
}
const navigatorLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

function receipt(attempt: IntentoAcceso): ReciboAcceso {
  return validarReciboAcceso({
    comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed,
    estado: 'CONFIRMADO', error: null,
    resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '51', usuarios: [{
      usuario_id: person.usuario_id,
      permiso_anterior: attempt.operacion === 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR' ? 'ADMINISTRADOR_SUBCAMPANIA' : null,
      permiso_nuevo: attempt.operacion === 'DESIGNAR_ADMINISTRADOR' ? 'ADMINISTRADOR_SUBCAMPANIA' : 'PLANTADOR',
      revision_anterior: '9007199254740997', revision_nueva: '9007199254740998',
      cambio: 'CAMBIO_APLICADO', conserva_acceso_global: false,
    }] }] },
  }, attempt)
}

function reviewAdmin(globalAccess = false) {
  vi.mocked(ParticipacionService.revisar).mockResolvedValue({
    data: { usuario: person, ambitos: [{ subcampania_id: '51', permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '9007199254740997', acceso_global: globalAccess }] },
    observado_en: observed,
  })
}

function open(current: CapacidadSubcampania, globalAdmin = false, canDesignateAdmins = globalAdmin, includeLogistics = true) {
  return render(<MemoryRouter><ParticipacionDetalleEquipo scope={current} globalAdmin={globalAdmin} canDesignateAdmins={canDesignateAdmins} actorId="42" includeLogistics={includeLogistics} /></MemoryRouter>)
}

async function choosePerson(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Agregar participante' }))
  await user.type(screen.getByRole('textbox', { name: 'Nombre de la persona' }), 'Luis')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))
}

beforeEach(() => {
  localStorage.clear()
  mocks.refresh.mockReset().mockResolvedValue(undefined)
  mocks.login.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn(async (_key: string, _options: unknown, callback: () => Promise<unknown>) => callback()) } })
  vi.spyOn(ParticipacionService, 'miembros').mockResolvedValue(members)
  vi.spyOn(ParticipacionService, 'buscar').mockResolvedValue({ data: [person], observado_en: observed, siguiente_cursor: null })
  vi.spyOn(ParticipacionService, 'revisar').mockImplementation(async (input) => ({ data: { usuario: person, ambitos: input.subcampania_ids.map((id) => ({ subcampania_id: id, permiso_contextual: null, revision_permiso: '9007199254740997', acceso_global: false })) }, observado_en: observed }))
  vi.spyOn(ParticipacionService, 'enviar').mockImplementation(async (attempt) => receipt(attempt))
  vi.spyOn(ParticipacionService, 'recuperar').mockImplementation(async (attempt) => receipt(attempt))
})

afterEach(() => {
  vi.restoreAllMocks()
  if (navigatorLocks) Object.defineProperty(navigator, 'locks', navigatorLocks)
  else Reflect.deleteProperty(navigator, 'locks')
})

describe('Equipo en el detalle de subcampaña', () => {
  it('permite al plantador consultar miembros sin acciones de modificación', async () => {
    const read = vi.mocked(ParticipacionService.miembros)
    open({ ...scope, acciones: { ...scope.acciones, incorporar_plantador: true } })
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(read).toHaveBeenCalledWith('51', { limite: 20 }, expect.any(AbortSignal))
    expect(screen.getByText('Administrador')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Agregar participante' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Retirar o cambiar otros permisos' })).toBeNull()
  })

  it('separa al coordinador, oculta globales y deja los permisos contextuales en verde', async () => {
    vi.mocked(ParticipacionService.miembros).mockResolvedValueOnce({
      ...members,
      data: [
        ...members.data,
        { usuario_id: '43', nombre: 'Andy Local', organizacion: null, permiso_contextual: null, revision_permiso: '1', acceso_global: true, etiqueta_acceso_global: 'Administrador · Acceso global', responsabilidad_logistica: null },
        { usuario_id: '44', nombre: 'Beatriz Rojas', organizacion: 'ONG de Prueba', permiso_contextual: 'PLANTADOR', revision_permiso: '1', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: null },
        { usuario_id: '45', nombre: 'Pablo Andres', organizacion: null, permiso_contextual: null, revision_permiso: '1', acceso_global: true, etiqueta_acceso_global: 'Administrador · Acceso global', responsabilidad_logistica: 'COORDINADOR' },
        { usuario_id: '46', nombre: 'Jhami', organizacion: null, permiso_contextual: null, revision_permiso: '1', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: 'OPERARIO' },
      ],
    })
    open(scope)
    expect(await screen.findByText('Pablo Andres')).toBeTruthy()
    expect(screen.queryByText('Andy Local')).toBeNull()
    expect(screen.getByText('4 miembros')).toBeTruthy()
    const adminCategory = screen.getByRole('button', { name: /Administradores.*1 asignado/i })
    const contextualCard = screen.getByText('Ana Pérez').closest('li') as HTMLLIElement
    const coordinatorCard = screen.getByText('Pablo Andres').closest('section') as HTMLElement
    expect(within(contextualCard).getByText('Administrador').className).toContain('bg-brand-50')
    expect(within(coordinatorCard).getByText('Coordinador').className).toContain('bg-warning-50')
    expect(within(screen.getByText('Beatriz Rojas').closest('li') as HTMLLIElement).getByText('Plantador').className).toContain('bg-brand-50')
    expect(within(screen.getByText('Jhami').closest('li') as HTMLLIElement).getByText('Operario').className).toContain('bg-brand-50')
    expect(adminCategory.getAttribute('aria-expanded')).toBe('true')
    await userEvent.setup().click(adminCategory)
    expect(adminCategory.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(screen.getByText('Pablo Andres')).toBeTruthy()
    expect(screen.getByText('Beatriz Rojas')).toBeTruthy()
    await userEvent.setup().click(adminCategory)
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
  })

  it('permite continuar la paginación si la primera página solo contiene globales ocultos', async () => {
    vi.mocked(ParticipacionService.miembros).mockResolvedValueOnce({
      observado_en: observed,
      siguiente_cursor: 'otra-pagina',
      data: [{ usuario_id: '43', nombre: 'Andy Local', organizacion: null, permiso_contextual: null, revision_permiso: '1', acceso_global: true, etiqueta_acceso_global: 'Administrador · Acceso global', responsabilidad_logistica: null }],
    }).mockResolvedValueOnce(members)
    open(scope)
    expect(await screen.findByText('Aún no hay miembros de esta subcampaña entre las personas cargadas.')).toBeTruthy()
    expect(screen.queryByText('Andy Local')).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cargar más personas' }))
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText('1 miembro')).toBeTruthy()
  })

  it('no duplica al coordinador en la sección de participación del equipo interno', async () => {
    vi.mocked(ParticipacionService.miembros).mockResolvedValueOnce({
      ...members,
      data: [
        { ...members.data[0], responsabilidad_logistica: 'COORDINADOR' },
        { ...members.data[0], usuario_id: '47', nombre: 'Beatriz Admin' },
      ],
    })
    open(scope, false, false, false)
    expect(await screen.findByText('Beatriz Admin')).toBeTruthy()
    expect(screen.queryByText('Ana Pérez')).toBeNull()
    expect(screen.getByText('1 miembro')).toBeTruthy()
  })

  it('el administrador contextual incorpora una cuenta existente como plantador solo en la subcampaña abierta', async () => {
    open({ ...scope, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', acciones: { ...scope.acciones, incorporar_plantador: true, designar_administrador: true } })
    const user = userEvent.setup()
    await choosePerson(user)
    expect(screen.queryByRole('combobox', { name: 'Permiso' })).toBeNull()
    expect(ParticipacionService.buscar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'OTORGAR_PLANTADOR', subcampania_ids: ['51'], consulta: 'Luis' }), expect.any(AbortSignal))
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Luis Prado')).toBeTruthy()
    expect(dialog.getByText('Norte')).toBeTruthy()
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(dialog.getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(ParticipacionService.revisar).toHaveBeenCalledWith({ usuario_destino_id: person.usuario_id, subcampania_ids: ['51'] }, expect.any(AbortSignal))
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0]).toMatchObject({ actor_id: '42', operacion: 'OTORGAR_PLANTADOR', payload: { usuario_destino_id: person.usuario_id, ambitos: [{ subcampania_id: '51', revision_esperada: '9007199254740997' }] } })
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(ParticipacionService.miembros).toHaveBeenCalledTimes(2))
  })

  it('el ADMIN global puede designar otro administrador contextual desde Equipo', async () => {
    open({ ...scope, permiso_contextual: null, fuente_autoridad: 'GLOBAL', acciones: { ...scope.acciones, incorporar_plantador: true, designar_administrador: true } }, true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Agregar participante' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Permiso' }), 'DESIGNAR_ADMINISTRADOR')
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la persona' }), 'Luis')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))
    expect(ParticipacionService.buscar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'DESIGNAR_ADMINISTRADOR', subcampania_ids: ['51'] }), expect.any(AbortSignal))
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Administrador de subcampaña')).toBeTruthy()
    await user.click(dialog.getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0]).toMatchObject({ operacion: 'DESIGNAR_ADMINISTRADOR', payload: { ambitos: [{ subcampania_id: '51', revision_esperada: '9007199254740997' }] } })
  })

  it('requiere la capacidad global explícita para mostrar designación de administradores', async () => {
    open({ ...scope, permiso_contextual: null, fuente_autoridad: 'GLOBAL', acciones: { ...scope.acciones, incorporar_plantador: true, designar_administrador: true } }, true, false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Agregar participante' }))
    expect(screen.queryByRole('combobox', { name: 'Permiso' })).toBeNull()
  })

  it('cambia un administrador a plantador con C07 y la revisión consultada, tras explicar la pérdida de administración', async () => {
    reviewAdmin()
    open(globalScope, true)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Administrador de subcampaña')).toBeTruthy()
    expect(dialog.getByText('Deja de administrar y conserva el permiso contextual para plantar. Debe permanecer otro administrador vigente.')).toBeTruthy()
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(dialog.getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0]).toMatchObject({
      actor_id: '42', operacion: 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR',
      payload: { usuario_destino_id: person.usuario_id, ambitos: [{ subcampania_id: '51', revision_esperada: '9007199254740997' }] },
    })
    expect(screen.getByText('Cambiar administrador a plantador · 1 subcampaña(s)')).toBeTruthy()
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(ParticipacionService.miembros).toHaveBeenCalledTimes(2))
  })

  it.each([
    { label: 'administrador contextual', globalAdmin: false, canDesignate: false, current: { ...globalScope, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA' as const } },
    { label: 'sin capacidad global', globalAdmin: true, canDesignate: false, current: globalScope },
    { label: 'sin capacidad del ámbito', globalAdmin: true, canDesignate: true, current: { ...globalScope, acciones: { ...globalScope.acciones, cambiar_administrador: false } } },
  ])('bloquea el cambio de administrador para $label sin enviar C04 ni C07', async ({ globalAdmin, canDesignate, current }) => {
    reviewAdmin()
    open(current, globalAdmin, canDesignate)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Esta persona ya administra la subcampaña. No tienes autorización para cambiarla a plantador.')).toBeTruthy()
    const confirm = dialog.getByRole('button', { name: 'Confirmar asignación' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    await user.click(confirm)
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('advierte que el cambio contextual conserva el acceso global del destinatario', async () => {
    reviewAdmin(true)
    open(globalScope, true)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Conserva su acceso global de administrador.')).toBeTruthy()
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
  })

  it('consulta de nuevo tras cancelar y usa C04 si la persona ya es plantador', async () => {
    reviewAdmin()
    open(globalScope, true)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    vi.mocked(ParticipacionService.revisar).mockResolvedValueOnce({
      data: { usuario: person, ambitos: [{ subcampania_id: '51', permiso_contextual: 'PLANTADOR', revision_permiso: '9007199254740999', acceso_global: false }] },
      observado_en: observed,
    })
    vi.mocked(ParticipacionService.enviar).mockImplementationOnce(async attempt => validarReciboAcceso({
      comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed,
      estado: 'CONFIRMADO', error: null,
      resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '51', usuarios: [{
        usuario_id: person.usuario_id, permiso_anterior: 'PLANTADOR', permiso_nuevo: 'PLANTADOR',
        revision_anterior: '9007199254740999', revision_nueva: '9007199254740999',
        cambio: 'SIN_CAMBIOS', conserva_acceso_global: false,
      }] }] },
    }, attempt))
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.queryByText(/Deja de administrar/)).toBeNull()
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(dialog.getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(screen.getByText('SIN CAMBIOS: el permiso ya coincidía')).toBeTruthy()
    expect(ParticipacionService.revisar).toHaveBeenCalledTimes(2)
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0]).toMatchObject({
      operacion: 'OTORGAR_PLANTADOR', payload: { ambitos: [{ subcampania_id: '51', revision_esperada: '9007199254740999' }] },
    })
  })

  it.each([
    { codigo: 'ULTIMO_ADMINISTRADOR_CONTEXTUAL', mensaje: 'Debe permanecer un administrador contextual activo.' },
    { codigo: 'REVISION_OBSOLETA', mensaje: 'El permiso cambió después de la revisión.' },
  ])('respeta el rechazo $codigo de C07 sin intentar otro comando', async ({ codigo, mensaje }) => {
    reviewAdmin()
    vi.mocked(ParticipacionService.enviar).mockImplementation(async attempt => validarReciboAcceso({
      comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed,
      estado: 'RECHAZADO', resultado: null, error: { codigo, mensaje, campos: [], ambitos: ['51'], reintento: 'NUEVA_CONFIRMACION' },
    }, attempt))
    open(globalScope, true)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Selección rechazada: no se aplicó ningún cambio')
    expect(screen.getByText(mensaje)).toBeTruthy()
    expect(screen.getByText(`Código: ${codigo}`)).toBeTruthy()
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0].operacion).toBe('CAMBIAR_ADMINISTRADOR_A_PLANTADOR')
    expect(screen.queryByText('Resultado confirmado por el servidor')).toBeNull()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('recupera el C07 original tras respuesta perdida, sin convertirlo en un otorgamiento', async () => {
    reviewAdmin()
    vi.mocked(ParticipacionService.enviar).mockRejectedValueOnce(new Error('Se perdió la respuesta.'))
    open(globalScope, true)
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado no confirmado')
    const original = vi.mocked(ParticipacionService.enviar).mock.calls[0][0]
    expect(original.operacion).toBe('CAMBIAR_ADMINISTRADOR_A_PLANTADOR')
    await user.click(screen.getByRole('button', { name: 'Consultar resultado original' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(vi.mocked(ParticipacionService.recuperar).mock.calls[0][0]).toEqual(original)
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
  })

  it('conserva el comando original si se pierde la respuesta y lo recupera antes de otra asignación', async () => {
    vi.mocked(ParticipacionService.enviar).mockRejectedValueOnce(new Error('Se perdió la respuesta.'))
    open({ ...scope, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', acciones: { ...scope.acciones, incorporar_plantador: true } })
    const user = userEvent.setup()
    await choosePerson(user)
    await user.click(screen.getByRole('button', { name: 'Revisar asignación' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar asignación' }))
    await screen.findByText('Resultado no confirmado')
    expect((screen.getByRole('button', { name: 'Listo' }) as HTMLButtonElement).disabled).toBe(true)
    const original = vi.mocked(ParticipacionService.enviar).mock.calls[0][0]
    await user.click(screen.getByRole('button', { name: 'Consultar resultado original' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(vi.mocked(ParticipacionService.recuperar).mock.calls[0][0]).toEqual(original)
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
  })

  it('no confunde un rechazo del servidor con equipo vacío', async () => {
    vi.mocked(ParticipacionService.miembros).mockRejectedValue(new Error('No tienes acceso al equipo.'))
    open(scope)
    expect((await screen.findByRole('alert')).textContent).toContain('No tienes acceso al equipo.')
    expect(screen.queryByText('Todavía no hay participantes')).toBeNull()
  })
})
