import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileService } from './profile.service'

afterEach(() => vi.unstubAllGlobals())

describe('ProfileService.getUserProfile', () => {
  it('verifica la sesión con JWT Bearer sin usar x-auth-id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ auth_id: 'verified-id', username: 'persona', rol: 'GENERAL' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await ProfileService.getUserProfile('jwt')
    expect(result.auth_id).toBe('verified-id')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/users/profile'), expect.objectContaining({
      headers: { Authorization: 'Bearer jwt' },
    }))
  })

  it('conserva el estado HTTP de un token rechazado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(ProfileService.getUserProfile('expired')).rejects.toMatchObject({ status: 401, name: 'ProfileRequestError' })
  })

  it('termina la verificación si el backend no responde', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
      const request = ProfileService.getUserProfile('jwt')
      const rejected = expect(request).rejects.toThrow('Tiempo de espera agotado')
      await vi.advanceTimersByTimeAsync(10000)
      await rejected
    } finally {
      vi.useRealTimers()
    }
  })
})
