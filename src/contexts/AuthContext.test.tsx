import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { ProfileRequestError, ProfileService } from '../modules/user_profile/profile.service'
import { WebAuthnService } from '../services/webauthn.service'
import type { UserProfileResponse } from '../modules/user_profile/types'

const backendProfile: UserProfileResponse = {
  id: 7,
  auth_id: 'backend-id',
  username: 'persona',
  correo: 'persona@example.test',
  rol: 'GENERAL',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

function SessionView() {
  const { user, hydrated, isAuthenticated, sessionError, retrySession, updateUserFromBackend, logout, login } = useAuth()
  return <>
    <div data-testid="state">{hydrated ? (isAuthenticated ? `${user?.auth_id}:${user?.rol}` : 'guest') : 'loading'}</div>
    <div data-testid="error">{sessionError}</div>
    <button onClick={logout}>Salir</button>
    <button onClick={() => void retrySession().catch(() => {})}>Reintentar</button>
    <button onClick={() => void login().catch(() => {})}>Entrar</button>
    <button onClick={() => void updateUserFromBackend().catch(() => {})}>Actualizar</button>
  </>
}

function mount() {
  render(<AuthProvider><SessionView /></AuthProvider>)
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('AuthProvider', () => {
  it('ignora usuario y rol locales sin un token validado', async () => {
    localStorage.setItem('r3foresta:user', JSON.stringify({ auth_id: 'fake', rol: 'ADMIN' }))
    localStorage.setItem('auth_id', 'fake')
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile')
    mount()
    expect(await screen.findByText('guest')).toBeTruthy()
    expect(profileSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem('r3foresta:user')).toBeNull()
    expect(localStorage.getItem('auth_id')).toBeNull()
  })

  it('espera al backend y usa solo su perfil, nunca el rol guardado', async () => {
    localStorage.setItem('authToken', 'jwt')
    localStorage.setItem('r3foresta:user', JSON.stringify({ auth_id: 'fake', rol: 'ADMIN' }))
    const pending = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockReturnValue(pending.promise)
    mount()
    expect(screen.getByTestId('state').textContent).toBe('loading')
    await act(async () => pending.resolve(backendProfile))
    expect(await screen.findByText('backend-id:GENERAL')).toBeTruthy()
    expect(localStorage.getItem('auth_id')).toBe('backend-id')
  })

  it('borra las credenciales cuando el backend rechaza el token', async () => {
    localStorage.setItem('authToken', 'expired')
    localStorage.setItem('auth_id', 'stale')
    vi.spyOn(ProfileService, 'getUserProfile').mockRejectedValue(new ProfileRequestError(401, 'Invalid token'))
    mount()
    expect(await screen.findByText('guest')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('expiró'))
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('auth_id')).toBeNull()
  })

  it('libera el arranque si falla la red y permite reintentar sin confiar en caché', async () => {
    localStorage.setItem('authToken', 'jwt')
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile')
      .mockRejectedValueOnce(new TypeError('NetworkError'))
      .mockResolvedValueOnce(backendProfile)
    mount()
    expect(await screen.findByText('guest')).toBeTruthy()
    expect(screen.getByTestId('error').textContent).toContain('conexión')
    expect(localStorage.getItem('authToken')).toBe('jwt')
    fireEvent.click(screen.getByText('Reintentar'))
    expect(await screen.findByText('backend-id:GENERAL')).toBeTruthy()
    expect(profileSpy).toHaveBeenNthCalledWith(1, 'jwt')
    expect(profileSpy).toHaveBeenNthCalledWith(2, 'jwt')
  })

  it('ignora una verificación tardía después de cerrar sesión', async () => {
    localStorage.setItem('authToken', 'jwt')
    const pending = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockReturnValue(pending.promise)
    mount()
    fireEvent.click(screen.getByText('Salir'))
    await act(async () => pending.resolve(backendProfile))
    expect(screen.getByTestId('state').textContent).toBe('guest')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('r3foresta:user')).toBeNull()
  })

  it('no guarda una respuesta WebAuthn que llega después de logout', async () => {
    const pending = deferred<Awaited<ReturnType<typeof WebAuthnService.login>>>()
    vi.spyOn(WebAuthnService, 'login').mockReturnValue(pending.promise)
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile')
    mount()
    expect(await screen.findByText('guest')).toBeTruthy()
    fireEvent.click(screen.getByText('Entrar'))
    fireEvent.click(screen.getByText('Salir'))
    await act(async () => pending.resolve({
      success: true,
      token: 'late-jwt',
      auth_id: 'backend-id',
      user: { id: 'backend-id', username: 'persona', auth_id: 'backend-id' },
    }))
    expect(screen.getByTestId('state').textContent).toBe('guest')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(profileSpy).not.toHaveBeenCalled()
  })

  it('valida el perfil tras WebAuthn y limpia toda la sesión al salir', async () => {
    vi.spyOn(WebAuthnService, 'login').mockResolvedValue({
      success: true,
      token: 'new-jwt',
      auth_id: 'backend-id',
      user: { id: 'backend-id', username: 'persona', auth_id: 'backend-id' },
    })
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValue(backendProfile)
    mount()
    expect(await screen.findByText('guest')).toBeTruthy()
    fireEvent.click(screen.getByText('Entrar'))
    expect(await screen.findByText('backend-id:GENERAL')).toBeTruthy()
    expect(profileSpy).toHaveBeenCalledWith('new-jwt')
    expect(localStorage.getItem('r3foresta:user')).toContain('"rol":"GENERAL"')
    fireEvent.click(screen.getByText('Salir'))
    expect(screen.getByTestId('state').textContent).toBe('guest')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('auth_id')).toBeNull()
    expect(localStorage.getItem('r3foresta:user')).toBeNull()
  })

  it('ignora un refresh de perfil que llega después de logout', async () => {
    localStorage.setItem('authToken', 'jwt')
    const pending = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile')
      .mockResolvedValueOnce(backendProfile)
      .mockReturnValueOnce(pending.promise)
    mount()
    expect(await screen.findByText('backend-id:GENERAL')).toBeTruthy()
    fireEvent.click(screen.getByText('Actualizar'))
    fireEvent.click(screen.getByText('Salir'))
    await act(async () => pending.resolve(backendProfile))
    expect(screen.getByTestId('state').textContent).toBe('guest')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('r3foresta:user')).toBeNull()
  })
})
