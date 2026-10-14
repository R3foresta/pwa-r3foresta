import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginScreen from './LoginScreen'

const auth = vi.hoisted(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  loading: false,
  error: null,
}))

vi.mock('../../hooks/useWebAuthn', () => ({ useWebAuthn: () => auth }))
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ sessionError: null, canRetrySession: false, retrySession: vi.fn() }),
}))

describe('Alta con llave de acceso', () => {
  it('permite crear la cuenta solo con nombre y conserva el correo opcional', async () => {
    render(<MemoryRouter><LoginScreen initialRegistering /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/Nombre de usuario/), { target: { value: '  Ana  ' } })
    const email = screen.getByLabelText(/Correo electrónico/) as HTMLInputElement
    expect(email.required).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('Ana', ''))
    expect(screen.getByRole('link', { name: 'Ayuda para ingresar' }).getAttribute('href')).toBe('/auth/recover')
  })
})
