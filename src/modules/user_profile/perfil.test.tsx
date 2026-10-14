import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../../types/auth.types'
import PerfilScreen from './perfil'
import { ParticipacionProfileService, type PerfilParticipacion } from './participacion.service'
import { ProfileRoleBadge } from './components/ProfileRoleBadge'

const auth = vi.hoisted(() => ({
  user: null as User | null,
  logout: vi.fn(),
  updateUserFromBackend: vi.fn().mockResolvedValue({ nombre: 'Ana' }),
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('./components/AvatarUpload', () => ({ AvatarUpload: () => <span>Foto de perfil</span> }))

const profile: PerfilParticipacion = {
  usuario_id: '9007199254740993',
  nombre: 'Ana',
  apellido: 'Rojas',
  afiliacion: { tipo: 'ORGANIZACION_REGISTRADA', organizacion_id: '9007199254740995', nombre: 'Bosque Vivo' },
  rol_global: 'VOLUNTARIO',
}

beforeEach(() => {
  vi.restoreAllMocks()
  auth.logout.mockClear()
  auth.user = { id: '3', auth_id: 'cuenta-ana', username: 'ana', nombre: 'Nombre anterior', rol: 'ADMIN', organizacion: 'Afiliación anterior', email: 'ana@example.com' }
  vi.spyOn(ParticipacionProfileService, 'leer').mockResolvedValue(profile)
})

function view(state?: { profileUpdated: boolean }) {
  return (
    <MemoryRouter initialEntries={[{ pathname: '/app/profile', state }]}>
      <Routes>
        <Route path="/app/profile" element={<PerfilScreen />} />
        <Route path="/app/edit-profile" element={<p>Formulario de perfil</p>} />
        <Route path="/auth/login" element={<p>Ingreso</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Mi perfil', () => {
  it('muestra la identidad, afiliación y rol v1 en lugar de valores anteriores de sesión', async () => {
    render(view())
    expect(screen.getByText('Cargando tu perfil…')).toBeTruthy()
    await screen.findByRole('heading', { name: 'Ana Rojas' })
    expect(screen.getByText('Bosque Vivo')).toBeTruthy()
    expect(screen.getByText('Organización del catálogo')).toBeTruthy()
    expect(screen.getAllByText('Voluntario')).toHaveLength(2)
    expect(screen.queryByText('Administrador')).toBeNull()
    expect(screen.queryByText('Nombre anterior')).toBeNull()
    expect(screen.queryByText('Afiliación anterior')).toBeNull()
    expect(screen.getByText(/no cambia tu rol ni concede permisos/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }))
    expect(await screen.findByText('Formulario de perfil')).toBeTruthy()
  })

  it.each([
    { afiliacion: null, expected: 'Sin afiliación' },
    { afiliacion: { tipo: 'OTRA' as const, organizacion_id: null, nombre: 'Equipo comunitario' }, expected: 'Equipo comunitario' },
  ])('representa afiliación opcional guardada: $expected', async ({ afiliacion, expected }) => {
    vi.mocked(ParticipacionProfileService.leer).mockResolvedValue({ ...profile, afiliacion })
    render(view())
    expect(await screen.findByText(expected)).toBeTruthy()
    if (afiliacion) expect(screen.getByText('Otra organización')).toBeTruthy()
  })

  it('mantiene documento, contacto y wallet existentes en un bloque cerrado', async () => {
    const wallet = '0x0123456789abcdef0123456789abcdef01234567'
    auth.user = { ...auth.user!, doc_identidad: '12345678', contacto: '+59177777777', wallet_address: wallet }
    render(view())
    const summary = await screen.findByText('Datos adicionales de tu cuenta')
    const details = summary.closest('details')!
    expect(details.open).toBe(false)
    expect(within(details).getByText('12345678')).toBeTruthy()
    expect(within(details).getByText('+59177777777')).toBeTruthy()
    expect(within(details).getByText(wallet)).toBeTruthy()
    expect(within(details).getByText(/Son opcionales/)).toBeTruthy()
  })

  it('permite reintentar una lectura fallida sin mostrar roles anteriores', async () => {
    vi.mocked(ParticipacionProfileService.leer).mockRejectedValueOnce(new Error('Servicio no disponible'))
    render(view())
    expect((await screen.findByRole('alert')).textContent).toContain('Servicio no disponible')
    expect(screen.queryByText('Administrador')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Ana Rojas' })).toBeTruthy()
    expect(ParticipacionProfileService.leer).toHaveBeenCalledTimes(2)
  })

  it('cancela la consulta anterior y descarta una respuesta tardía al cambiar de cuenta', async () => {
    let finishFirst: ((value: PerfilParticipacion) => void) | undefined
    let firstSignal: AbortSignal | undefined
    vi.mocked(ParticipacionProfileService.leer)
      .mockImplementationOnce(signal => {
        firstSignal = signal
        return new Promise(resolve => { finishFirst = resolve })
      })
      .mockResolvedValueOnce({ ...profile, nombre: 'Bruno', apellido: null, afiliacion: null, rol_global: 'GENERAL' })
    const mounted = render(view())
    await waitFor(() => expect(ParticipacionProfileService.leer).toHaveBeenCalledTimes(1))
    auth.user = { id: '4', auth_id: 'cuenta-bruno', username: 'bruno', email: 'bruno@example.com' }
    mounted.rerender(view())
    expect(firstSignal?.aborted).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Bruno' })).toBeTruthy()
    await act(async () => { finishFirst?.(profile) })
    expect(screen.queryByRole('heading', { name: 'Ana Rojas' })).toBeNull()
    expect(screen.queryByText('ana@example.com')).toBeNull()
    expect(screen.getAllByText('Equipo operativo')).toHaveLength(2)
  })

  it('muestra confirmación solo cuando viene del guardado y permite descartarla', async () => {
    render(view({ profileUpdated: true }))
    await screen.findByText('Tu perfil se actualizó.')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mensaje de confirmación' }))
    expect(screen.queryByText('Tu perfil se actualizó.')).toBeNull()
  })

  it('no inventa confirmación de guardado al abrir el perfil y permite cerrar sesión', async () => {
    render(view())
    await screen.findByRole('heading', { name: 'Ana Rojas' })
    expect(screen.queryByText('Tu perfil se actualizó.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Ingreso')).toBeTruthy()
  })
})

describe('Presentación del rol', () => {
  it.each([
    ['ADMIN', 'Administrador'],
    ['GENERAL', 'Equipo operativo'],
    ['VALIDADOR', 'Validador'],
    ['VOLUNTARIO', 'Voluntario'],
    [undefined, 'Rol no disponible'],
    ['SIN_CONTRATO', 'Rol no disponible'],
  ])('traduce %s sin asignar un rol por defecto', (rol, expected) => {
    render(<ProfileRoleBadge rol={rol} />)
    expect(screen.getByText(expected)).toBeTruthy()
  })
})
