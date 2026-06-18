import type {
  CreateCampaniaInput,
  ListOrganizacionesQuery,
} from '../modules/plantacion/types/contracts'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

function buildQuery<T extends object>(filters?: T): string {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function getRequiredAuthId(authId?: string): string {
  const resolved = authId || localStorage.getItem('auth_id') || undefined
  if (!resolved) {
    throw new Error('No se encontró auth_id. Vuelve a iniciar sesión.')
  }
  return resolved
}

function getAuthHeaders(options?: {
  authId?: string
  includeContentType?: boolean
}): HeadersInit {
  const includeContentType = options?.includeContentType ?? true
  const resolvedAuthId = getRequiredAuthId(options?.authId)
  const token = localStorage.getItem('authToken')

  const headers: HeadersInit = {
    'x-auth-id': resolvedAuthId,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

export async function listCampaniasApi(): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function getCampaniaApi(campaniaId: number): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function createCampaniaApi(
  input: CreateCampaniaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function listOrganizacionesApi(
  query?: ListOrganizacionesQuery,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/organizaciones${buildQuery(query)}`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}
