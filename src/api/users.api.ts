const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

function getAuthHeaders(includeContentType = false): HeadersInit {
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

export async function listUsersByRoleApi(rol: string, q?: string): Promise<Response> {
  const search = new URLSearchParams()
  const normalizedQ = q?.trim()
  if (normalizedQ) {
    search.set('q', normalizedQ)
  }

  const query = search.toString()
  return fetch(`${API_BASE_URL}/users/rol/${rol}${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })
}

export async function listUsersApi(params?: { q?: string; rol?: string }): Promise<Response> {
  const search = new URLSearchParams()
  const normalizedQ = params?.q?.trim()
  const normalizedRol = params?.rol?.trim()
  if (normalizedQ) search.set('q', normalizedQ)
  if (normalizedRol) search.set('rol', normalizedRol)

  const query = search.toString()
  return fetch(`${API_BASE_URL}/users${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })
}
