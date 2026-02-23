import type {
  ActualizarComunidadPayload,
  ApiListComunidades,
  ApiOneComunidad,
  ComunidadCard,
  CrearComunidadPayload,
  ListarComunidadesParams,
} from '../tipos/comunidades'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

type ApiError = Error & { status?: number }

type ApiErrorBody = {
  message?: string
}

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = localStorage.getItem('authToken')
  const authId = localStorage.getItem('auth_id')
  const headers: HeadersInit = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (authId) {
    headers['x-auth-id'] = authId
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

async function parseApiError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}`

  try {
    const errorJson = (await res.json()) as ApiErrorBody
    if (errorJson?.message?.trim()) {
      message = errorJson.message.trim()
    }
  } catch {
    // Fallback: usar mensaje por status
  }

  const error = new Error(message) as ApiError
  error.status = res.status
  return error
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return (await res.json()) as T
}

export async function listarComunidades(
  params: ListarComunidadesParams,
): Promise<ApiListComunidades> {
  const {
    paisId,
    q,
    page = 1,
    limit = 20,
    incluirInactivas = false,
  } = params

  const search = new URLSearchParams({
    pais_id: String(paisId),
    page: String(page),
    limit: String(limit),
    incluir_inactivas: incluirInactivas ? 'true' : 'false',
  })

  const normalizedQ = q?.trim()
  if (normalizedQ) {
    search.set('q', normalizedQ)
  }

  const response = await fetch(`${API_BASE_URL}/comunidades?${search.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  return parseJsonOrThrow<ApiListComunidades>(response)
}

export async function obtenerComunidad(id: number | string): Promise<ApiOneComunidad> {
  const response = await fetch(`${API_BASE_URL}/comunidades/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  return parseJsonOrThrow<ApiOneComunidad>(response)
}

export async function crearComunidad(
  payload: CrearComunidadPayload,
): Promise<ApiOneComunidad | { success: true; data: ComunidadCard }> {
  const response = await fetch(`${API_BASE_URL}/comunidades`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return parseJsonOrThrow<ApiOneComunidad | { success: true; data: ComunidadCard }>(response)
}

export async function actualizarComunidad(
  id: number | string,
  payload: ActualizarComunidadPayload,
): Promise<ApiOneComunidad | { success: true; data: ComunidadCard }> {
  const response = await fetch(`${API_BASE_URL}/comunidades/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return parseJsonOrThrow<ApiOneComunidad | { success: true; data: ComunidadCard }>(response)
}

export async function desactivarComunidad(
  id: number | string,
): Promise<ApiOneComunidad | { success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/comunidades/${id}/desactivar`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })

  return parseJsonOrThrow<ApiOneComunidad | { success: boolean }>(response)
}
