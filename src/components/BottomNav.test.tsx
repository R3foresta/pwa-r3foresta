import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BottomNav from './BottomNav'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '42', rol: 'ADMIN' }, isAuthenticated: true }),
}))

describe('Navegación durante la gestión de usuarios', () => {
  it.each(['/app/usuarios', '/app/usuarios/'])('mantiene %s sin navegación ni acciones globales superpuestas', (path) => {
    render(<MemoryRouter initialEntries={[path]}><BottomNav /></MemoryRouter>)

    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).toBeNull()
  })

  it('conserva la navegación y las acciones rápidas del ADMIN en Inicio', () => {
    render(<MemoryRouter initialEntries={['/app/home']}><BottomNav /></MemoryRouter>)

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Inicio' }).getAttribute('href')).toBe('/app/home')
    expect(screen.getByRole('button', { name: 'Abrir acciones rápidas' })).toBeTruthy()
  })
})
