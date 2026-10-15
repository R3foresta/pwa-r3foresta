import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ParticipacionService } from '../api/participacion.api'
import type { CapacidadSubcampania, CapacidadesLectura, IntentoAcceso, PersonaMinima, ReciboAcceso } from '../types'
import GestionAccesosScreen from './GestionAccesosScreen'

const mocks = vi.hoisted(() => ({ capabilities: {} as { data: CapacidadesLectura | null; status: 'ready' | 'error'; error: string | null; refresh: () => Promise<void> }, login: vi.fn(), refresh: vi.fn() }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '42' }, login: mocks.login }) }))
vi.mock('../hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => mocks.capabilities }))

const person: PersonaMinima = { usuario_id: '9007199254740995', nombre: 'Ana Pérez', organizacion: null }
const incoming: PersonaMinima = { usuario_id: '73', nombre: 'Luis Prado', organizacion: 'Otra organización' }
const observed = '2026-10-15T16:00:00Z'
function scope(id: string, name: string): CapacidadSubcampania {
  return { campania_id: '7', campania_nombre: 'Palca', subcampania_id: id, nombre: name, estado: 'ACTIVA', permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '3', fuente_autoridad: 'GLOBAL', acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: true, retirar_plantador: true, designar_administrador: true, cambiar_administrador: true, retirar_administrador: true, reemplazar_administrador: true } }
}
function receipt(attempt: IntentoAcceso): ReciboAcceso {
  return { comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'ACCESO', cambios: attempt.payload.ambitos.map((item) => ({ subcampania_id: item.subcampania_id, usuarios: [{ usuario_id: person.usuario_id, permiso_anterior: null, permiso_nuevo: 'PLANTADOR', revision_anterior: '9007199254740997', revision_nueva: '9007199254740998', cambio: 'CAMBIO_APLICADO', conserva_acceso_global: false }] })) } }
}

beforeEach(() => {
  localStorage.clear()
  mocks.refresh.mockResolvedValue(undefined)
  mocks.capabilities = { status: 'ready', error: null, refresh: mocks.refresh, data: { data: { actor: { usuario_id: '42', rol_global: 'ADMIN' }, capacidades_globales: { asignar_roles: true, designar_administradores: true, leer_plan: true }, subcampanias: [scope('11', 'Norte'), scope('12', 'Sur')] }, observado_en: observed, siguiente_cursor: null } }
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn(async (_key: string, _options: unknown, callback: () => Promise<unknown>) => callback()) } })
  vi.spyOn(ParticipacionService, 'miembros').mockResolvedValue({ data: [], observado_en: observed, siguiente_cursor: null })
  vi.spyOn(ParticipacionService, 'buscar').mockResolvedValue({ data: [person], observado_en: observed, siguiente_cursor: null })
  vi.spyOn(ParticipacionService, 'revisar').mockImplementation(async (input) => ({ data: { usuario: input.usuario_destino_id === person.usuario_id ? person : incoming, ambitos: input.subcampania_ids.map((id) => ({ subcampania_id: id, permiso_contextual: null, revision_permiso: '9007199254740997', acceso_global: false })) }, observado_en: observed }))
  vi.spyOn(ParticipacionService, 'enviar').mockImplementation(async (attempt) => receipt(attempt))
  vi.spyOn(ParticipacionService, 'recuperar').mockImplementation(async (attempt) => receipt(attempt))
})

function open() { return render(<MemoryRouter><GestionAccesosScreen /></MemoryRouter>) }

async function selectSearchedPerson() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Seleccionar todas las actuales/ }))
  await user.type(screen.getByLabelText('Nombre de la persona'), 'Ana')
  await user.click(screen.getByRole('button', { name: 'Buscar persona registrada' }))
  await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))
  return user
}

describe('Gestión de accesos con revisión explícita', () => {
  it('las acciones centrales requieren además la capacidad global explícita', () => {
    mocks.capabilities.data!.data.capacidades_globales.designar_administradores = false
    open()
    expect(screen.getByRole('option', { name: 'Habilitar plantador' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Designar administrador' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Reemplazar administrador' })).toBeNull()
  })

  it('distingue una lista válida sin gestión de un error de capacidades', () => {
    mocks.capabilities.data!.data.subcampanias = []
    const view = open()
    expect(screen.getByText(/No tienes acciones de gestión/)).toBeTruthy()
    mocks.capabilities = { ...mocks.capabilities, data: null, status: 'error', error: 'No hay conexión para verificar permisos.' }
    view.rerender(<MemoryRouter><GestionAccesosScreen /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('No hay conexión')
    expect(screen.queryByText(/No tienes acciones de gestión/)).toBeNull()
  })

  it('fija IDs y revisiones exactas, cancelar no envía y cambiar selección exige revisar otra vez', async () => {
    open()
    const user = await selectSearchedPerson()
    expect(screen.getByText(/Sin afiliación declarada · Cuenta/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    expect(within(screen.getByRole('dialog')).getAllByText(/9007199254740997/)).toHaveLength(2)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    await user.click(screen.getByRole('checkbox', { name: /Sur/ }))
    expect(screen.queryByRole('button', { name: 'Revisar confirmación' })).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: /Sur/ }))
    // Volver a una selección anterior tampoco autoriza a reutilizar su comparación.
    expect(screen.queryByRole('button', { name: 'Revisar confirmación' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    const attempt = vi.mocked(ParticipacionService.enviar).mock.calls[0][0]
    expect(attempt.payload).toMatchObject({ usuario_destino_id: person.usuario_id, ambitos: [{ subcampania_id: '11', revision_esperada: '9007199254740997' }, { subcampania_id: '12', revision_esperada: '9007199254740997' }] })
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('no presume fallo tras respuesta perdida: bloquea cambios y consulta el mismo comando', async () => {
    vi.mocked(ParticipacionService.enviar).mockRejectedValue(new Error('La respuesta se perdió después del envío.'))
    open()
    const user = await selectSearchedPerson()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await screen.findByText('Resultado no confirmado')
    expect((screen.getByLabelText('Acción') as HTMLSelectElement).disabled).toBe(true)
    const original = vi.mocked(ParticipacionService.enviar).mock.calls[0][0]
    await user.click(screen.getByRole('button', { name: 'Consultar resultado original' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(vi.mocked(ParticipacionService.recuperar).mock.calls[0][0]).toEqual(original)
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
  })

  it('permite comprobar otra vez el almacenamiento tras un fallo previo a conservar el comando', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('Cuota agotada', 'QuotaExceededError') })
    open()
    const user = await selectSearchedPerson()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await user.click(await screen.findByRole('button', { name: 'Volver a comprobar envío conservado' }))
    await waitFor(() => expect((screen.getByLabelText('Acción') as HTMLSelectElement).disabled).toBe(false))
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
    expect(ParticipacionService.recuperar).not.toHaveBeenCalled()
  })

  it('una revisión obsoleta rechaza toda la selección y exige nueva lectura y confirmación con otra clave', async () => {
    vi.mocked(ParticipacionService.enviar).mockImplementationOnce(async (attempt) => ({ comando_id: attempt.payload.comando_id, operacion: attempt.operacion, finalizado_en: observed, estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA', mensaje: 'Los accesos cambiaron durante la revisión.', campos: [], ambitos: ['12'], reintento: 'NUEVA_CONFIRMACION' } }))
    open()
    const user = await selectSearchedPerson()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await screen.findByText('Selección rechazada: no se aplicó ningún cambio')
    const original = vi.mocked(ParticipacionService.enviar).mock.calls[0][0]
    await user.click(screen.getByRole('button', { name: 'Preparar una nueva revisión' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Consultar accesos para revisar' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.queryByRole('button', { name: 'Revisar confirmación' })).toBeNull()
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await screen.findByText('Resultado confirmado por el servidor')
    expect(ParticipacionService.enviar).toHaveBeenCalledTimes(2)
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[1][0].payload.comando_id).not.toBe(original.payload.comando_id)
    expect(ParticipacionService.revisar).toHaveBeenCalledTimes(2)
  })

  it('permite localizar homónimos por correo exacto sin mostrar el correo en resultados y pagina', async () => {
    vi.mocked(ParticipacionService.buscar).mockResolvedValueOnce({ data: [person, { ...person, usuario_id: '71', organizacion: 'Comunidad' }], observado_en: observed, siguiente_cursor: 'otra-pagina' }).mockResolvedValueOnce({ data: [incoming], observado_en: observed, siguiente_cursor: null })
    open()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Seleccionar todas las actuales/ }))
    await user.selectOptions(screen.getByLabelText('Buscar por'), 'CORREO_EXACTO')
    await user.type(screen.getByLabelText('Correo exacto de la cuenta'), 'ana@example.test')
    await user.click(screen.getByRole('button', { name: 'Buscar persona registrada' }))
    expect(await screen.findAllByText('Ana Pérez')).toHaveLength(2)
    expect(screen.queryByText('ana@example.test')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Siguiente página de personas' }))
    await screen.findByText('Luis Prado')
    expect(ParticipacionService.buscar).toHaveBeenLastCalledWith(expect.objectContaining({ modo: 'CORREO_EXACTO', consulta: 'ana@example.test', cursor: 'otra-pagina', subcampania_ids: ['11', '12'] }), expect.any(AbortSignal))
  })

  it('reemplazo muestra saliente, entrante, tratamiento y acceso global conservado', async () => {
    vi.mocked(ParticipacionService.miembros).mockResolvedValue({ data: [{ ...person, permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '8', acceso_global: true, etiqueta_acceso_global: 'Administrador · Acceso global', responsabilidad_logistica: 'COORDINADOR' }], observado_en: observed, siguiente_cursor: null })
    vi.mocked(ParticipacionService.buscar).mockResolvedValue({ data: [incoming], observado_en: observed, siguiente_cursor: null })
    vi.mocked(ParticipacionService.revisar).mockImplementation(async (input) => ({ data: { usuario: input.usuario_destino_id === person.usuario_id ? person : incoming, ambitos: input.subcampania_ids.map((id) => ({ subcampania_id: id, permiso_contextual: input.usuario_destino_id === person.usuario_id ? 'ADMINISTRADOR_SUBCAMPANIA' : null, revision_permiso: input.usuario_destino_id === person.usuario_id ? '8' : '0', acceso_global: input.usuario_destino_id === person.usuario_id })) }, observado_en: observed }))
    open()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Acción'), 'REEMPLAZAR_ADMINISTRADOR')
    await user.click(screen.getByRole('button', { name: /Seleccionar todas las actuales/ }))
    await user.click(await screen.findByRole('button', { name: 'Elegir persona' }))
    await user.type(screen.getByLabelText('Nombre de la persona'), 'Luis')
    await user.click(screen.getByRole('button', { name: 'Buscar persona registrada' }))
    await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))
    await user.selectOptions(screen.getByLabelText('Tratamiento de la persona saliente'), 'PLANTADOR')
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar confirmación' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Persona saliente: Ana Pérez')).toBeTruthy()
    expect(dialog.getByText('Persona entrante: Luis Prado')).toBeTruthy()
    expect(dialog.getByText('Saliente: conservar como plantador.')).toBeTruthy()
    expect(dialog.getAllByText(/Conserva acceso global/)).toHaveLength(2)
    await user.click(dialog.getByRole('button', { name: 'Confirmar cambio de acceso' }))
    await waitFor(() => expect(ParticipacionService.enviar).toHaveBeenCalledTimes(1))
    expect(vi.mocked(ParticipacionService.enviar).mock.calls[0][0]).toMatchObject({ operacion: 'REEMPLAZAR_ADMINISTRADOR', payload: { usuario_saliente_id: person.usuario_id, usuario_reemplazo_id: incoming.usuario_id, tratamiento_saliente: 'PLANTADOR', ambitos: [{ subcampania_id: '11', revision_saliente_esperada: '8', revision_reemplazo_esperada: '0' }, { subcampania_id: '12', revision_saliente_esperada: '8', revision_reemplazo_esperada: '0' }] } })
  })

  it('no revive una revisión tras cambiar persona y volver a la persona anterior', async () => {
    open()
    const user = await selectSearchedPerson()
    await user.click(screen.getByRole('button', { name: 'Consultar accesos para revisar' }))
    await screen.findByRole('button', { name: 'Revisar confirmación' })
    await user.click(screen.getByRole('button', { name: 'Cambiar persona' }))
    await user.type(screen.getByLabelText('Nombre de la persona'), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Buscar persona registrada' }))
    await user.click(await screen.findByRole('button', { name: 'Seleccionar' }))
    expect(screen.queryByRole('button', { name: 'Revisar confirmación' })).toBeNull()
    expect(ParticipacionService.enviar).not.toHaveBeenCalled()
  })
})
