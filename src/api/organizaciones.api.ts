import type {
  ListOrganizacionesResponse,
  ListarOrganizacionesParams,
  LogoOrganizacionResponse,
  OneOrganizacionResponse,
  OrganizacionDataInput,
  OrganizacionFormInput,
} from '../modules/organizaciones/types'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

type ApiError = Error & { status?: number }

type ApiErrorBody = {
  message?: string | string[]
  error?: string
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

function normalizeErrorMessage(body: ApiErrorBody | null, fallback: string): string {
  if (!body) return fallback
  if (Array.isArray(body.message)) {
    const messages = body.message
      .filter((message): message is string => typeof message === 'string' && message.trim() !== '')
      .map((message) => message.trim())
    return messages.length > 0 ? messages.join('\n') : fallback
  }
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim()
  }
  if (typeof body.error === 'string' && body.error.trim()) {
    return body.error.trim()
  }
  return fallback
}

async function parseApiError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null

  try {
    body = (await res.json()) as ApiErrorBody
  } catch {
    body = null
  }

  const error = new Error(normalizeErrorMessage(body, `HTTP ${res.status}`)) as ApiError
  error.status = res.status
  return error
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await parseApiError(res)
  }
  return (await res.json()) as T
}

function buildSearch(params: ListarOrganizacionesParams): string {
  const search = new URLSearchParams()

  if (params.tipo) search.set('tipo', params.tipo)

  if (!params.incluirInactivas && typeof params.activo === 'boolean') {
    search.set('activo', params.activo ? 'true' : 'false')
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function listarOrganizaciones(
  params: ListarOrganizacionesParams = {},
): Promise<ListOrganizacionesResponse> {
  const response = await fetch(`${API_BASE_URL}/organizaciones${buildSearch(params)}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  return parseJsonOrThrow<ListOrganizacionesResponse>(response)
}

export async function obtenerOrganizacion(
  id: number | string,
): Promise<OneOrganizacionResponse> {
  const response = await fetch(`${API_BASE_URL}/organizaciones/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  return parseJsonOrThrow<OneOrganizacionResponse>(response)
}

function buildCreateBody(payload: OrganizacionFormInput): {
  body: BodyInit
  includeContentType: boolean
} {
  if (payload.logo instanceof File) {
    const form = new FormData()
    form.append('nombre', payload.nombre)
    form.append('tipo', payload.tipo)
    if (typeof payload.activo === 'boolean') {
      form.append('activo', payload.activo ? 'true' : 'false')
    }
    form.append('logo', payload.logo, payload.logo.name)
    return { body: form, includeContentType: false }
  }

  return {
    body: JSON.stringify({
      nombre: payload.nombre,
      tipo: payload.tipo,
      activo: payload.activo,
    }),
    includeContentType: true,
  }
}

export async function crearOrganizacion(
  payload: OrganizacionFormInput,
): Promise<OneOrganizacionResponse> {
  const { body, includeContentType } = buildCreateBody(payload)
  const response = await fetch(`${API_BASE_URL}/organizaciones`, {
    method: 'POST',
    headers: getAuthHeaders(includeContentType),
    body,
  })

  return parseJsonOrThrow<OneOrganizacionResponse>(response)
}

export async function actualizarOrganizacion(
  id: number | string,
  payload: Partial<OrganizacionDataInput>,
): Promise<OneOrganizacionResponse> {
  const response = await fetch(`${API_BASE_URL}/organizaciones/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return parseJsonOrThrow<OneOrganizacionResponse>(response)
}

export async function desactivarOrganizacion(
  id: number | string,
): Promise<OneOrganizacionResponse | { success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/organizaciones/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  })

  return parseJsonOrThrow<OneOrganizacionResponse | { success: boolean }>(response)
}

export async function subirLogoOrganizacion(
  id: number | string,
  logo: File,
): Promise<LogoOrganizacionResponse> {
  const form = new FormData()
  form.append('logo', logo, logo.name)

  const response = await fetch(`${API_BASE_URL}/organizaciones/${id}/logo`, {
    method: 'POST',
    headers: getAuthHeaders(false),
    body: form,
  })

  return parseJsonOrThrow<LogoOrganizacionResponse>(response)
}

export async function eliminarLogoOrganizacion(
  id: number | string,
): Promise<LogoOrganizacionResponse> {
  const response = await fetch(`${API_BASE_URL}/organizaciones/${id}/logo`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  })

  return parseJsonOrThrow<LogoOrganizacionResponse>(response)
}
