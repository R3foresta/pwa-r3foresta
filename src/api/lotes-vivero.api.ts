import { exactId } from '../modules/accesos/accessPolicy'
import type {
  CreateLoteViveroInput,
  ListLotesViveroQuery,
  LoteTimelineQuery,
  RegistrarAdaptabilidadRequest,
  RegistrarDescartePreEmbolsadoRequest,
  RegistrarDespachoRequest,
  RegistrarEmbolsadoRequest,
  RegistrarMermaRequest,
  UploadEvidenciasPendientesInput,
  EvidenciaEventoVivero,
  UploadEvidenciasEventoInput,
  CrearAsignacionViveroRequest,
  DevolucionAsignacionRequest,
  ViveroId,
} from '../modules/vivero/types/contracts'

const RAW_VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_VITE_API_URL || '').replace(/\/$/, '')}/api`

export type ViveroReadOptions = { token?: string | null; signal?: AbortSignal }
function readOptions(options?: ViveroReadOptions): RequestInit {
  const token = options?.token === undefined ? localStorage.getItem('authToken') : options.token
  if (!token) throw new Error('Inicia sesión para consultar Vivero.')
  return { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: options?.signal }
}

function buildQuery<T extends object>(filters?: T): string {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, key.endsWith('_id') ? exactId(value) : String(value))
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

const EVENT_EVIDENCE_PATH: Record<EvidenciaEventoVivero, string> = {
  EMBOLSADO: 'embolsado',
  DESCARTE_PRE_EMBOLSADO: 'descarte-pre-embolsado',
  ADAPTABILIDAD: 'adaptabilidad',
  MERMA: 'merma',
  DESPACHO: 'despacho',
}

function buildEvidenceFormData(input: UploadEvidenciasEventoInput): FormData {
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
  // Las evidencias de Vivero se suben como pendientes antes de que exista el
  // EVENTO_LOTE_VIVERO final, por lo que backend usa entidad_id=0 como
  // placeholder. Si se omite este campo, backend puede crear la foto como
  // principal y chocar con el índice único parcial de la entidad temporal.
  formData.append('es_principal', String(input.es_principal ?? false))

  return formData
}

export async function listLotesViveroApi(filters?: ListLotesViveroQuery, options?: ViveroReadOptions): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero${buildQuery(filters)}`, readOptions(options))
}

// Detalle privado con últimos eventos; Bearer y no-store.
export async function getLoteViveroDetalleApi(loteId: ViveroId, options?: ViveroReadOptions): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}`, readOptions(options))
}

// Timeline cronológico (RF-VIV-07). Backend lo recomienda sobre los endpoints
// por tipo (`/:id/adaptabilidad`, `/:id/merma`) porque trae `responsable_nombre`
// embebido y `payload` discriminado. Filtros nativos via query string.
export async function getLoteTimelineApi(
  loteId: ViveroId,
  query?: LoteTimelineQuery,
  options?: ViveroReadOptions,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/timeline${buildQuery(query)}`, readOptions(options))
}

export async function uploadEvidenciasPendientesViveroApi(
  input: UploadEvidenciasPendientesInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/evidencias-pendientes`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
    body: (() => { const form = buildEvidenceFormData(input); form.append('vivero_id', exactId(input.vivero_id)); return form })(),
  })
}

export async function createLoteViveroApi(
  input: CreateLoteViveroInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, recoleccion_id: exactId(input.recoleccion_id), vivero_id: exactId(input.vivero_id), evidencia_ids: input.evidencia_ids.map(exactId) }),
  })
}

export async function getEmbolsadoContextApi(loteId: ViveroId, options?: ViveroReadOptions): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/embolsado/context`, readOptions(options))
}

export async function uploadEvidenciasEventoViveroApi(
  loteId: ViveroId,
  tipoEvento: EvidenciaEventoVivero,
  input: UploadEvidenciasEventoInput,
  authId?: string,
): Promise<Response> {
  const path = EVENT_EVIDENCE_PATH[tipoEvento]
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/${path}/evidencias-pendientes`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
    body: buildEvidenceFormData(input),
  })
}

export async function registrarEmbolsadoApi(
  loteId: ViveroId,
  input: RegistrarEmbolsadoRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/embolsado`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, evidencia_ids: input.evidencia_ids?.map(exactId) }),
  })
}

export async function getEmbolsadoApi(loteId: ViveroId, options?: ViveroReadOptions): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/embolsado`, readOptions(options))
}

export async function registrarAdaptabilidadApi(
  loteId: ViveroId,
  input: RegistrarAdaptabilidadRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/adaptabilidad`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, evidencia_ids: input.evidencia_ids?.map(exactId) }),
  })
}

export async function registrarMermaApi(
  loteId: ViveroId,
  input: RegistrarMermaRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/merma`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, evidencia_ids: input.evidencia_ids?.map(exactId) }),
  })
}

export async function registrarDescartePreEmbolsadoApi(
  loteId: ViveroId,
  input: RegistrarDescartePreEmbolsadoRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/descarte-pre-embolsado`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, evidencia_ids: input.evidencia_ids?.map(exactId) }),
  })
}

export async function registrarDespachoApi(
  loteId: ViveroId,
  input: RegistrarDespachoRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/despacho`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, comunidad_destino_id: input.comunidad_destino_id == null ? undefined : exactId(input.comunidad_destino_id), evidencia_ids: input.evidencia_ids?.map(exactId) }),
  })
}

export async function getTimelineApi(
  loteId: ViveroId,
  options?: ViveroReadOptions,
  query?: LoteTimelineQuery,
): Promise<Response> {
  return getLoteTimelineApi(loteId, query, options)
}

export async function listStockEspeciesApi(): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/stock/especies`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function listSubcampaniasApi(): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function listAsignacionesApi(loteId: ViveroId, options?: ViveroReadOptions): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/asignaciones`, readOptions(options))
}

export async function crearAsignacionApi(
  loteId: ViveroId,
  input: CrearAsignacionViveroRequest,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/asignaciones`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ ...input, subcampania_id: exactId(input.subcampania_id), evidencia_ids: input.evidencia_ids.map(exactId) }),
  })
}

// Devolución física de stock asignado (reemplaza al DELETE de "cancelar
// reserva", ya eliminado del backend). El lote recupera saldo vivo y puede
// reabrirse si estaba FINALIZADO.
export async function devolverAsignacionApi(
  loteId: ViveroId,
  asignacionId: ViveroId,
  input: DevolucionAsignacionRequest,
  authId?: string,
): Promise<Response> {
  return fetch(
    `${API_BASE_URL}/lotes-vivero/${exactId(loteId)}/asignaciones/${exactId(asignacionId)}/devolucion`,
    {
      method: 'POST',
      headers: getAuthHeaders({ authId, includeContentType: true }),
      body: JSON.stringify(input),
    },
  )
}

// El historial se consume mediante `/timeline`, que reúne todos los tipos de
// evento y conserva responsable, payload y evidencias. Las evidencias de cada
// evento crítico se suben con `uploadEvidenciasEventoViveroApi` antes del POST
// correspondiente, incluido el despacho manual.
