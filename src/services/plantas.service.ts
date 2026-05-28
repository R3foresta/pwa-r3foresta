import type {
  ListPlantasParams,
  ListPlantasResponse,
  OnePlantaResponse,
  PlantaCatalogo,
  PlantaFormInput,
  TipoPlantaCatalogo,
} from '../types/plantas.types'

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_BASE_URL = `${(RAW_API_URL || '').replace(/\/$/, '')}/api`

type ApiError = Error & { status?: number }

type ApiErrorBody = { message?: string }

function getAuthHeaders(includeContentType = true): Record<string, string> {
  const token = localStorage.getItem('authToken')
  const authId = localStorage.getItem('auth_id')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (authId) headers['x-auth-id'] = authId
  if (includeContentType) headers['Content-Type'] = 'application/json'
  return headers
}

async function parseApiError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}`
  try {
    const body = (await res.json()) as ApiErrorBody
    if (body?.message?.trim()) message = body.message.trim()
  } catch {
    // sin body parseable
  }
  const error = new Error(message) as ApiError
  error.status = res.status
  return error
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await parseApiError(res)
  return (await res.json()) as T
}

function buildFormData(input: PlantaFormInput): FormData {
  const form = new FormData()
  const textFields: Array<keyof PlantaFormInput> = [
    'especie',
    'nombre_cientifico',
    'variedad',
    'nombre_comun_principal',
    'nombres_comunes',
    'notas',
  ]
  for (const key of textFields) {
    const value = input[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      form.append(key, value.trim())
    }
  }
  if (typeof input.tipo_planta_id === 'number' && input.tipo_planta_id > 0) {
    form.append('tipo_planta_id', String(input.tipo_planta_id))
  }
  if (typeof input.activo === 'boolean') {
    form.append('activo', input.activo ? 'true' : 'false')
  }
  if (input.imagen instanceof File) {
    form.append('imagen', input.imagen, input.imagen.name)
  }
  return form
}

export class PlantasService {
  static async listPlantas(params: ListPlantasParams = {}): Promise<ListPlantasResponse> {
    const search = new URLSearchParams()
    if (params.q?.trim()) search.set('q', params.q.trim())
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.incluir_inactivas) search.set('incluir_inactivas', 'true')
    if (params.tipo_planta_id) search.set('tipo_planta_id', String(params.tipo_planta_id))

    const qs = search.toString()
    const url = qs ? `${API_BASE_URL}/plantas?${qs}` : `${API_BASE_URL}/plantas`
    const res = await fetch(url, { headers: getAuthHeaders() })
    return parseJsonOrThrow<ListPlantasResponse>(res)
  }

  static async getPlanta(id: number | string): Promise<PlantaCatalogo> {
    const res = await fetch(`${API_BASE_URL}/plantas/${id}`, { headers: getAuthHeaders() })
    const body = await parseJsonOrThrow<OnePlantaResponse>(res)
    return body.data
  }

  static async createPlanta(input: PlantaFormInput): Promise<PlantaCatalogo> {
    const form = buildFormData(input)
    const res = await fetch(`${API_BASE_URL}/plantas`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: form,
    })
    const body = await parseJsonOrThrow<OnePlantaResponse>(res)
    return body.data
  }

  static async updatePlanta(
    id: number | string,
    input: PlantaFormInput,
  ): Promise<PlantaCatalogo> {
    const form = buildFormData(input)
    const res = await fetch(`${API_BASE_URL}/plantas/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(false),
      body: form,
    })
    const body = await parseJsonOrThrow<OnePlantaResponse>(res)
    return body.data
  }

  static async desactivarPlanta(id: number | string): Promise<PlantaCatalogo> {
    const res = await fetch(`${API_BASE_URL}/plantas/${id}/desactivar`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    })
    const body = await parseJsonOrThrow<OnePlantaResponse>(res)
    return body.data
  }

  static async reactivarPlanta(id: number | string): Promise<PlantaCatalogo> {
    return PlantasService.updatePlanta(id, { activo: true })
  }

  static async getTiposPlantas(): Promise<TipoPlantaCatalogo[]> {
    const res = await fetch(`${API_BASE_URL}/plantas/tipos-planta`, {
      headers: getAuthHeaders(),
    })
    const body = await parseJsonOrThrow<{ success: boolean; data: TipoPlantaCatalogo[] }>(res)
    return body.data ?? []
  }
}
