import { describe, expect, it, vi } from 'vitest'
import { WebAuthnService } from './webauthn.service'

vi.mock('@passwordless-id/webauthn', () => ({
  client: {
    isAvailable: vi.fn().mockResolvedValue(true),
    register: vi.fn().mockResolvedValue({ id: 'credencial' }),
  },
}))

describe('Payload de alta WebAuthn', () => {
  it('omite el correo vacío para cumplir el campo opcional del backend', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ challenge: 'challenge' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        token: 'token-sintetico',
        auth_id: 'cuenta',
        user: { auth_id: 'cuenta', username: 'Ana' },
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await WebAuthnService.register('Ana', '  ')
    const payload = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    expect(payload).toEqual({ username: 'Ana', registration: { id: 'credencial' }, challenge: 'challenge' })
  })
})
