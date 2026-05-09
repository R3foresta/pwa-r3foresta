import type {
  CreateLoteViveroInput,
  ListLotesViveroQuery,
  RegistrarAdaptabilidadRequest,
  RegistrarDespachoRequest,
  RegistrarEmbolsadoRequest,
  RegistrarMermaRequest,
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

export async function registrarAdaptabilidadApi(
  loteId: number,
  input: RegistrarAdaptabilidadRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/adaptabilidad`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function registrarMermaApi(
  loteId: number,
  input: RegistrarMermaRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/merma`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function registrarDespachoApi(
  loteId: number,
  input: RegistrarDespachoRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${loteId}/despacho`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// TODO(backend-pendiente): funciones cliente faltantes — el backend ya las expone
// pero todavía no las consumimos desde el frontend. Agregar cuando se conecte
// la fase correspondiente:
//
//   • POST /lotes-vivero/:id/adaptabilidad/evidencias-pendientes
//     → uploadEvidenciasAdaptabilidadApi (multipart, similar a embolsado)
//
//   • POST /lotes-vivero/:id/merma/evidencias-pendientes
//     → uploadEvidenciasMermaApi (multipart, similar a embolsado)
//
//   • GET  /lotes-vivero/:id/adaptabilidad
//     → listAdaptabilidadesApi (lista cronológica de eventos del lote)
//
//   • GET  /lotes-vivero/:id/merma
//     → listMermasApi (lista cronológica con causa + cantidad + saldo antes/después)
//
//   • GET  /lotes-vivero/:id/timeline
//     → getTimelineApi (RF-VIV-07, historial auditable unificado)
//
// Anomalía pendiente: NO existe POST /lotes-vivero/:id/despacho/evidencias-pendientes
// en el contrato actual del backend, pero RF-VIV-05 exige evidencia obligatoria.
// Confirmar con backend si es olvido o decisión.
//
// Ineficiencia: NO existe GET /lotes-vivero/:id (detalle por id). Hoy se simula
// con `?lote_vivero_id=X&limit=1` en LotesViveroService.getById. Cuando exista,
// agregar getLoteByIdApi y simplificar el service.
// ──────────────────────────────────────────────────────────────────────────────
