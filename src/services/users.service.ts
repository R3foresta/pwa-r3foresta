import { listUsersByRoleApi } from '../api/users.api'
import type { UsuarioResumen, UsuarioRol } from '../types/users'

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string | string[]
  error?: string
}

const USUARIO_ROLES: UsuarioRol[] = ['ADMIN', 'GENERAL', 'VALIDADOR', 'VOLUNTARIO']

function normalizeErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const source = payload as ApiEnvelope<unknown>
  if (Array.isArray(source.message)) {
    const lines = source.message
      .filter((message): message is string => typeof message === 'string' && message.trim() !== '')
      .map((message) => message.trim())
    return lines.length > 0 ? lines.join('\n') : fallback
  }
  if (typeof source.message === 'string' && source.message.trim()) {
    return source.message.trim()
  }
  if (typeof source.error === 'string' && source.error.trim()) {
    return source.error.trim()
  }
  return fallback
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const raw = await response.text()
  const parsed = raw ? tryParseJson(raw) : null

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(parsed, raw || fallbackError))
  }

  if (!parsed) {
    throw new Error('Respuesta vacía del servidor.')
  }

  return parsed as T
}

export class UsersService {
  static async listUsersByRole(
    rol: UsuarioRol,
    query?: string,
  ): Promise<UsuarioResumen[]> {
    if (!USUARIO_ROLES.includes(rol)) {
      throw new Error('Rol de usuario inválido.')
    }

    const response = await listUsersByRoleApi(rol, query)
    const payload = await parseJsonResponse<ApiEnvelope<UsuarioResumen[]> | UsuarioResumen[]>(
      response,
      'Error al cargar usuarios.',
    )

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }
}
