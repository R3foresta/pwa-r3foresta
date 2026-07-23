import type {
  CancelarSubcampaniaInput,
  CreateCampaniaInput,
  CreateRegistroPlantacionInput,
  CreateSubcampaniaInput,
  DesactivarCampaniaMasivaInput,
  EquipoMemberInput,
  EstadoSubcampania,
  PutPlanInput,
  SetCampaniaOrganizacionesInput,
  SetSubcampaniaPoligonoInput,
  UpdateCampaniaInput,
  UpdateSubcampaniaInput,
  UploadEvidenciasPlantacionInput,
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

export async function getCampaniasResumenApi(): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/resumen`, {
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

export async function getCampaniaMetricsApi(campaniaId: number): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}/metrics`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function getCampaniaActivityApi(
  campaniaId: number,
  limit = 5,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}/activity?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders({ includeContentType: false }),
  })
}

export async function patchCampaniaApi(
  campaniaId: number,
  input: UpdateCampaniaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}`, {
    method: 'PATCH',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function deleteCampaniaApi(
  campaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}`, {
    method: 'DELETE',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

// Previsualiza elegibilidad y efectos de la desactivación masiva. Una campaña
// no elegible también responde 200 (ver contrato). Solo ADMIN.
export async function previewDesactivacionCampaniaApi(
  campaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}/desactivacion/preview`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

// Ejecuta la desactivación atómica: cancela subcampañas elegibles, devuelve
// stock asignado disponible al vivero y aplica soft-delete a la campaña en una
// única transacción del backend. Exactamente una llamada por campaña. Solo ADMIN.
export async function desactivarCampaniaMasivaApi(
  campaniaId: number,
  input: DesactivarCampaniaMasivaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}/desactivar`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function postCampaniaOrganizacionesApi(
  campaniaId: number,
  input: SetCampaniaOrganizacionesInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/campanias/${campaniaId}/organizaciones`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function deleteCampaniaOrganizacionApi(
  campaniaId: number,
  organizacionId: number,
  authId?: string,
): Promise<Response> {
  return fetch(
    `${API_BASE_URL}/campanias/${campaniaId}/organizaciones/${organizacionId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders({ authId, includeContentType: false }),
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

export async function getSubcampaniaPlanApi(
  subcampaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/plan`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

export async function putSubcampaniaPlanApi(
  subcampaniaId: number,
  input: PutPlanInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/plan`, {
    method: 'PUT',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

export async function cancelarSubcampaniaApi(
  subcampaniaId: number,
  input: CancelarSubcampaniaInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/cancelar`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}

// ---------------------------------------------------------------------------
// Registro de plantación inicial (PLT-EPIC-01)
// ---------------------------------------------------------------------------

export async function listSubcampaniasApi(
  estado?: EstadoSubcampania,
  authId?: string,
): Promise<Response> {
  const query = estado ? `?estado=${estado}` : ''
  return fetch(`${API_BASE_URL}/subcampanias${query}`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

export async function getPlantacionContextApi(
  subcampaniaId: number,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/subcampanias/${subcampaniaId}/plantacion/context`, {
    method: 'GET',
    headers: getAuthHeaders({ authId, includeContentType: false }),
  })
}

function buildPlantacionEvidenceFormData(
  input: UploadEvidenciasPlantacionInput,
): FormData {
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
  // Mismo idiom que Vivero: las evidencias se crean pendientes (entidad_id=0),
  // enviar es_principal explícito evita chocar con el índice único parcial.
  formData.append('es_principal', String(input.es_principal ?? false))

  return formData
}

export async function uploadEvidenciasPendientesPlantacionApi(
  input: UploadEvidenciasPlantacionInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/registros-plantacion/evidencias-pendientes`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: false }),
    body: buildPlantacionEvidenceFormData(input),
  })
}

export async function deleteEvidenciasPendientesPlantacionApi(
  evidenciaIds: number[],
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/registros-plantacion/evidencias-pendientes`, {
    method: 'DELETE',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify({ evidencia_ids: evidenciaIds }),
  })
}

export async function createRegistroPlantacionApi(
  input: CreateRegistroPlantacionInput,
  authId?: string,
): Promise<Response> {
  return fetch(`${API_BASE_URL}/registros-plantacion`, {
    method: 'POST',
    headers: getAuthHeaders({ authId, includeContentType: true }),
    body: JSON.stringify(input),
  })
}
