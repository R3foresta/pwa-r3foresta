import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionService } from '../api/participacion.api'
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
const members: MiembrosLectura = {
  observado_en: observed, siguiente_cursor: null,
  data: [{ usuario_id: '42', nombre: 'Ana Pérez', organizacion: null, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '3', acceso_global: false, etiqueta_acceso_global: null, responsabilidad_logistica: 'COORDINADOR' }],
}
const navigatorLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

function receipt(attempt: IntentoAcceso): ReciboAcceso {
  return { comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '51', usuarios: [{ usuario_id: person.usuario_id, permiso_anterior: null, permiso_nuevo: attempt.operacion === 'DESIGNAR_ADMINISTRADOR' ? 'ADMINISTRADOR_SUBCAMPANIA' : 'PLANTADOR', revision_anterior: '9007199254740997', revision_nueva: '9007199254740998', cambio: 'CAMBIO_APLICADO', conserva_acceso_global: false }] }] } }
}

function open(current: CapacidadSubcampania, globalAdmin = false, canDesignateAdmins = globalAdmin) {
  return render(<MemoryRouter><ParticipacionDetalleEquipo scope={current} globalAdmin={globalAdmin} canDesignateAdmins={canDesignateAdmins} actorId="42" /></MemoryRouter>)
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
    expect(screen.getByText('Administrador de subcampaña')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Agregar participante' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Retirar o cambiar otros permisos' })).toBeNull()
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
