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
    <div data-testid="identity">{user?.auth_id ?? 'none'}:{String(isAuthenticated)}:{String(hydrated)}</div>
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

  it('oculta la cuenta anterior al cambiar token en otra pestaña hasta verificar el nuevo perfil', async () => {
    localStorage.setItem('authToken', 'token-a')
    localStorage.setItem('r3foresta:participacion:acceso:v1:7', 'comando-incierto')
    const next = deferred<UserProfileResponse>()
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(next.promise)
    mount()
    await screen.findByText('backend-id:GENERAL')
    localStorage.setItem('authToken', 'token-b')
    localStorage.setItem('r3foresta:user', JSON.stringify({ auth_id: 'cache-falso', rol: 'ADMIN' }))
    fireEvent(window, new StorageEvent('storage', { key: 'authToken', newValue: 'token-b', storageArea: localStorage }))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    expect(screen.getByTestId('state').textContent).toBe('loading')
    expect(profileSpy).toHaveBeenLastCalledWith('token-b')
    expect(localStorage.getItem('r3foresta:participacion:acceso:v1:7')).toBe('comando-incierto')
    await act(async () => next.resolve({ ...backendProfile, id: 8, auth_id: 'cuenta-b', rol: 'VOLUNTARIO' }))
    expect(screen.getByTestId('identity').textContent).toBe('cuenta-b:true:true')
    expect(screen.getByTestId('state').textContent).toBe('cuenta-b:VOLUNTARIO')
  })

  it('cierra la sesión ante logout en otra pestaña y descarta su perfil pendiente', async () => {
    localStorage.setItem('authToken', 'token-a')
    localStorage.setItem('r3foresta:participacion:acceso:v1:7', 'comando-incierto')
    const next = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(next.promise)
    mount()
    await screen.findByText('backend-id:GENERAL')
    localStorage.setItem('authToken', 'token-b')
    fireEvent(window, new StorageEvent('storage', { key: 'authToken' }))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    localStorage.removeItem('authToken')
    fireEvent(window, new StorageEvent('storage', { key: null }))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:true')
    await act(async () => next.resolve({ ...backendProfile, auth_id: 'cuenta-b' }))
    expect(screen.getByTestId('state').textContent).toBe('guest')
    expect(localStorage.getItem('r3foresta:user')).toBeNull()
    expect(localStorage.getItem('auth_id')).toBeNull()
    expect(localStorage.getItem('r3foresta:participacion:acceso:v1:7')).toBe('comando-incierto')
  })

  it('al recuperar foco verifica un token cambiado sin depender del evento storage', async () => {
    localStorage.setItem('authToken', 'token-a')
    const next = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(next.promise)
    mount()
    await screen.findByText('backend-id:GENERAL')
    localStorage.setItem('authToken', 'token-b')
    fireEvent.focus(window)
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    await act(async () => next.resolve({ ...backendProfile, auth_id: 'cuenta-b' }))
    expect(screen.getByTestId('identity').textContent).toBe('cuenta-b:true:true')
  })

  it('reintentar el mismo token conserva la cuenta verificada y el contenido privado montado', async () => {
    localStorage.setItem('authToken', 'token-a')
    const next = deferred<UserProfileResponse>()
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(next.promise)
    mount()
    await screen.findByText('backend-id:GENERAL')
    fireEvent.focus(window)
    expect(profileSpy).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Reintentar'))
    expect(screen.getByTestId('identity').textContent).toBe('backend-id:true:true')
    await act(async () => next.resolve({ ...backendProfile, rol: 'ADMIN' }))
    expect(screen.getByTestId('state').textContent).toBe('backend-id:ADMIN')
  })

  it('login local con token distinto oculta la cuenta anterior y termina hidratado tras verificar', async () => {
    localStorage.setItem('authToken', 'token-a')
    const next = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(next.promise)
    vi.spyOn(WebAuthnService, 'login').mockResolvedValue({ success: true, token: 'token-b', auth_id: 'cuenta-b', user: { id: '8', username: 'beatriz', auth_id: 'cuenta-b' } })
    mount()
    await screen.findByText('backend-id:GENERAL')
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(localStorage.getItem('authToken')).toBe('token-b'))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    await act(async () => next.resolve({ ...backendProfile, auth_id: 'cuenta-b' }))
    expect(screen.getByTestId('identity').textContent).toBe('cuenta-b:true:true')
  })

  it('un perfil rechazado tras login libera hidratación y deja la sesión cerrada', async () => {
    vi.spyOn(WebAuthnService, 'login').mockResolvedValue({ success: true, token: 'token-b', auth_id: 'cuenta-b', user: { id: '8', username: 'beatriz', auth_id: 'cuenta-b' } })
    vi.spyOn(ProfileService, 'getUserProfile').mockRejectedValue(new ProfileRequestError(401, 'Token inválido'))
    mount()
    await screen.findByText('guest')
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('expiró'))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:true')
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('A → B → A exige verificar A nuevamente y descarta la respuesta tardía de B', async () => {
    localStorage.setItem('authToken', 'token-a')
    const accountB = deferred<UserProfileResponse>()
    const accountA = deferred<UserProfileResponse>()
    const profileSpy = vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(accountB.promise).mockReturnValueOnce(accountA.promise)
    mount()
    await screen.findByText('backend-id:GENERAL')
    localStorage.setItem('authToken', 'token-b')
    fireEvent(window, new StorageEvent('storage', { key: 'authToken' }))
    localStorage.setItem('authToken', 'token-a')
    fireEvent(window, new StorageEvent('storage', { key: 'authToken' }))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    await act(async () => accountB.resolve({ ...backendProfile, auth_id: 'cuenta-b' }))
    expect(screen.getByTestId('identity').textContent).toBe('none:false:false')
    await act(async () => accountA.resolve(backendProfile))
    expect(screen.getByTestId('identity').textContent).toBe('backend-id:true:true')
    expect(profileSpy.mock.calls.map(([token]) => token)).toEqual(['token-a', 'token-b', 'token-a'])
    expect(localStorage.getItem('auth_id')).toBe('backend-id')
  })

  it('un rechazo antiguo no borra el token nuevo aunque storage todavía no se haya procesado', async () => {
    localStorage.setItem('authToken', 'token-a')
    const old = deferred<UserProfileResponse>()
    vi.spyOn(ProfileService, 'getUserProfile').mockResolvedValueOnce(backendProfile).mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...backendProfile, auth_id: 'cuenta-b' })
    mount()
    await screen.findByText('backend-id:GENERAL')
    fireEvent.click(screen.getByText('Actualizar'))
    localStorage.setItem('authToken', 'token-b')
    await act(async () => old.reject(new ProfileRequestError(401, 'Token A vencido')))
    expect(localStorage.getItem('authToken')).toBe('token-b')
    fireEvent(window, new StorageEvent('storage', { key: 'authToken' }))
    expect(await screen.findByText('cuenta-b:GENERAL')).toBeTruthy()
  })
})
