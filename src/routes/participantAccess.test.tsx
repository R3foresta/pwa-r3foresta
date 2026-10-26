import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import GuestRoute from './GuestRoute'
import HomeScreen from '../modules/home/HomeScreen'
import BottomNav from '../components/BottomNav'

const state = vi.hoisted(() => ({
  auth: {
    user: { auth_id: 'cuenta', username: 'Ana', nombre: 'Ana', rol: 'VOLUNTARIO' },
    isAuthenticated: true,
    hydrated: true,
    isProfileComplete: true,
  },
  stock: vi.fn(() => ({ items: [], loading: false, error: null })),
  privateScreen: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('../modules/participacion/hooks/useParticipacionCapabilities', () => ({
  useParticipacionCapabilities: () => ({ data: { data: { subcampanias: [] } }, status: 'ready', error: null, refresh: vi.fn() }),
}))
vi.mock('../contexts/PwaInstallContext', () => ({
  usePwaInstall: () => ({ shouldShowMenuInstall: false }),
}))
vi.mock('../modules/recolecciones/hooks/useRecoleccionStock', () => ({
  useRecoleccionStock: state.stock,
}))

function PrivateScreen() {
  state.privateScreen()
  return <p>Recolecciones internas</p>
}

function Destination() {
  const location = useLocation()
  return <p>{`${location.pathname}${location.search}${location.hash}`}</p>
}

beforeEach(() => {
  state.auth.user.rol = 'VOLUNTARIO'
  state.auth.isAuthenticated = true
  state.auth.hydrated = true
})

describe('Acceso de una cuenta de voluntariado', () => {
  it('el inicio interno conserva inventario real y navegación sin métricas o actividad simuladas', () => {
    state.auth.user.rol = 'ADMIN'
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Routes>
          <Route path="/app/home" element={<HomeScreen />} />
          <Route path="/app/collections" element={<p>Recolecciones internas</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(state.stock).toHaveBeenCalledWith(true)
    expect(screen.getByRole('heading', { name: 'Disponibilidad por especie' })).toBeTruthy()
    expect(screen.queryByText('Indicadores clave')).toBeNull()
    expect(screen.queryByText('Actividad reciente')).toBeNull()
    expect(screen.queryByText(/Actualizado hace/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Notificaciones' })).toBeNull()
    expect((screen.getByRole('button', { name: 'CO₂: Próximamente' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Recolección: Ver recolecciones' }))
    expect(screen.getByText('Recolecciones internas')).toBeTruthy()
  })

  it('ofrece perfil sin montar inventario ni exponer operaciones internas', () => {
    render(
      <MemoryRouter initialEntries={['/app/home']}>
        <Routes>
          <Route path="/app/home" element={<><HomeScreen /><BottomNav /></>} />
          <Route path="/app/profile" element={<p>Mi perfil disponible</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Participar' })).toBeTruthy()
    expect(state.stock).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Recolección' })).toBeNull()
    expect(screen.queryByText('Indicadores clave')).toBeNull()

    expect(screen.queryByRole('button', { name: 'Organizaciones' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Plantas' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Ver mi perfil' }))
    expect(screen.getByText('Mi perfil disponible')).toBeTruthy()
  })

  it('un enlace interno muestra orientación antes de montar la pantalla privada', () => {
    render(
      <MemoryRouter initialEntries={['/app/collections']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app/collections" element={<PrivateScreen />} />
            <Route path="/app/profile" element={<p>Mi perfil disponible</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Acceso del equipo operativo' })).toBeTruthy()
    expect(state.privateScreen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Ver mi perfil' }))
    expect(screen.getByText('Mi perfil disponible')).toBeTruthy()
  })

  it.each(['ADMIN', 'GENERAL', 'VALIDADOR'])('conserva el acceso interno de %s', (role) => {
    state.auth.user.rol = role
    render(
      <MemoryRouter initialEntries={['/app/collections']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app/collections" element={<PrivateScreen />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Recolecciones internas')).toBeTruthy()
  })

  it('recupera el enlace privado con filtros después de iniciar sesión', () => {
    state.auth.user.rol = 'GENERAL'
    render(
      <MemoryRouter initialEntries={[{ pathname: '/auth/login', state: { from: '/app/collections?estado=VALIDADO#lotes' } }]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/auth/login" element={<p>Ingreso</p>} />
          </Route>
          <Route path="/app/collections" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('/app/collections?estado=VALIDADO#lotes')).toBeTruthy()
  })

  it('al ingresar como voluntario vuelve al inicio si el destino era interno', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/auth/login', state: { from: '/app/collections' } }]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/auth/login" element={<p>Ingreso</p>} />
          </Route>
          <Route path="/app/home" element={<p>Inicio participante</p>} />
          <Route path="/app/collections" element={<PrivateScreen />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Inicio participante')).toBeTruthy()
    expect(state.privateScreen).not.toHaveBeenCalled()
  })
})
