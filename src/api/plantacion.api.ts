import type {
  CreateCampaniaInput,
  CreateSubcampaniaInput,
  EquipoMemberInput,
  SetSubcampaniaPoligonoInput,
  UpdateSubcampaniaInput,
} from '../modules/plantacion/types/contracts'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

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

export async function listSubcampaniasByCampaniaApi(campaniaId: number): Promise<Response> {
  return fetch(
    `${API_BASE_URL}/campanias/${campaniaId}/subcampanias?estados=BORRADOR,ACTIVA,COMPLETADA`,
    {
      method: 'GET',
      headers: getAuthHeaders({ includeContentType: false }),
    },
  )
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

export async function setSubcampaniaPoligonoApi(
  subcampaniaId: number,
  input: SetSubcampaniaPoligonoInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/poligono`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function createSubcampaniaApi(
  input: CreateSubcampaniaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function patchSubcampaniaApi(
  subcampaniaId: number,
  input: UpdateSubcampaniaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function getSubcampaniaApi(
  subcampaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

export async function getSubcampaniaEquipoApi(
  subcampaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/equipo`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

export async function postSubcampaniaEquipoApi(
  subcampaniaId: number,
  miembros: EquipoMemberInput[],
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/equipo`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(miembros),
  })
}

export async function deleteSubcampaniaEquipoMemberApi(
  subcampaniaId: number,
  usuarioId: number,
  authId?: string,
): Promise<Response> {
  return fetch(
    `${API_BASE_URL}/subcampanias/${subcampaniaId}/equipo/${usuarioId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders({ authId, includeContentType: false }),
    },
  )
}

export async function activarSubcampaniaApi(
  subcampaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/activar`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}
