import type {
  CreateLoteViveroInput,
  ListLotesViveroQuery,
  RegistrarEmbolsadoRequest,
  UploadEvidenciasPendientesInput,
  UploadEvidenciasEmbolsadoInput,
} from '../modules/vivero/types/contracts'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

function buildQuery(filters?: ListLotesViveroQuery): string {
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

export async function listLotesViveroApi(filters?: ListLotesViveroQuery): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero${buildQuery(filters)}`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function uploadEvidenciasPendientesViveroApi(
  input: UploadEvidenciasPendientesInput,
  authId?: string,
): Promise<Response> {
  const formData = new FormData()
  input.fotos.forEach((file) => formData.append('fotos', file))

  if (input.titulo?.trim()) {
    formData.append('titulo', input.titulo.trim())
  }
  if (input.descripcion?.trim()) {
    formData.append('descripcion', input.descripcion.trim())
  }
  if (input.metadata) {
    formData.append('metadata', JSON.stringify(input.metadata))
  }
  if (input.tomado_en) {
    formData.append('tomado_en', input.tomado_en)
  }
  if (input.es_principal !== undefined) {
    formData.append('es_principal', String(input.es_principal))
  }

  return fetch(`${API_BASE_URL}/lotes-vivero/evidencias-pendientes`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
    body: formData,
  })
}

export async function createLoteViveroApi(
  input: CreateLoteViveroInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function getEmbolsadoContextApi(loteId: number): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/embolsado/context`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function uploadEvidenciasEmbolsadoApi(
  loteId: number,
  input: UploadEvidenciasEmbolsadoInput,
  authId?: string,
): Promise<Response> {
  const formData = new FormData()
  input.fotos.forEach((file) => formData.append('fotos', file))
  if (input.titulo?.trim()) formData.append('titulo', input.titulo.trim())
  if (input.descripcion?.trim()) formData.append('descripcion', input.descripcion.trim())
  if (input.tomado_en) formData.append('tomado_en', input.tomado_en)
  if (input.es_principal !== undefined) formData.append('es_principal', String(input.es_principal))

  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/embolsado/evidencias-pendientes`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
    body: formData,
  })
}

export async function registrarEmbolsadoApi(
  loteId: number,
  input: RegistrarEmbolsadoRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/embolsado`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function getEmbolsadoApi(loteId: number): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/embolsado`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}
