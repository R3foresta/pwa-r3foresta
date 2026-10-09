import { client } from '@passwordless-id/webauthn'
import type { AuthResponse, ChallengeResponse } from '../types/auth.types'

const API_URL = import.meta.env.VITE_API_URL

function backendMessage(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = value.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function validateAuthResponse(value: unknown): AuthResponse {
  if (typeof value !== 'object' || value === null) throw new Error('Respuesta de autenticación inválida')
  const data = value as Partial<AuthResponse>
  if (
    data.success !== true ||
    typeof data.token !== 'string' || !data.token ||
    typeof data.auth_id !== 'string' || !data.auth_id ||
    !data.user || data.user.auth_id !== data.auth_id
  ) throw new Error('Respuesta de autenticación incompleta')
  return data as AuthResponse
}

export class WebAuthnService {
  static async getChallenge(): Promise<ChallengeResponse> {
    const response = await fetch(`${API_URL}/api/auth/challenge`)
    const data = await readJson(response)
    if (!response.ok) throw new Error(backendMessage(data, 'No se pudo obtener el challenge'))
    if (typeof data !== 'object' || data === null || !('challenge' in data) || typeof data.challenge !== 'string' || !data.challenge) {
      throw new Error('El servidor no devolvió un challenge válido')
    }
    return data as unknown as ChallengeResponse
  }

  static async register(username: string, email?: string): Promise<AuthResponse> {
    if (!(await client.isAvailable())) throw new Error('Passkeys no está disponible en este navegador')
    const { challenge } = await this.getChallenge()
    const registration = await client.register({
      user: username,
      challenge,
      userVerification: 'required',
      timeout: 60000,
      attestation: false,
    })
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, registration, challenge }),
    })
    const data = await readJson(response)
    if (!response.ok) throw new Error(backendMessage(data, 'No se pudo registrar la passkey'))
    return validateAuthResponse(data)
  }

  static async login(): Promise<AuthResponse> {
    if (!(await client.isAvailable())) throw new Error('Passkeys no está disponible en este navegador')
    const { challenge } = await this.getChallenge()
    const authentication = await client.authenticate({
      challenge,
      userVerification: 'required',
      timeout: 60000,
    })
    const credentialId = (authentication as { credentialId?: string; id?: string }).credentialId || authentication.id
    if (!credentialId) throw new Error('No se pudo obtener el ID de la credencial')
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authentication: { ...authentication, credentialId }, challenge }),
    })
    const data = await readJson(response)
    if (!response.ok) throw new Error(backendMessage(data, 'No se pudo iniciar sesión'))
    return validateAuthResponse(data)
  }

  static getToken(): string | null {
    return localStorage.getItem('authToken')
  }

  static clearSession(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('auth_id')
    localStorage.removeItem('r3foresta:user')
  }
}
