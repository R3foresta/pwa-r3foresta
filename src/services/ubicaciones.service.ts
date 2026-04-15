const API_URL = import.meta.env.VITE_API_URL

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaisCatalogo {
  id: number
  nombre: string
  codigo_iso2: string | null
}

export interface DivisionCatalogo {
  id: number
  pais_id: number
  parent_id: number | null
  tipo_id: number
  tipo_nombre: string | null
  tipo_orden: number | null
  nombre: string
}

export interface EnsureFlexibleDivisionDto {
  pais_id: number
  parent_id: number
  nombre: string
}

export interface EnsureFlexibleDivisionResult {
  success: boolean
  data: DivisionCatalogo
  created: boolean
}

export class UbicacionesService {
  private static getAuthHeaders(options?: { includeContentType?: boolean }): HeadersInit {
    const includeContentType = options?.includeContentType ?? true
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

  private static async parseJsonResponse<T>(response: Response): Promise<T> {
    const raw = await response.text()
    const payload = raw ? this.tryParseJson(raw) : null

    if (!response.ok) {
      const apiMessage =
        (payload as ApiEnvelope<unknown> | null)?.message ||
        (payload as ApiEnvelope<unknown> | null)?.error ||
        raw ||
        `Error ${response.status}`
      throw new Error(apiMessage)
    }

    if (!payload) {
      throw new Error('Respuesta vacía del servidor.')
    }

    return payload as T
  }

  private static tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  static async getPaises(): Promise<PaisCatalogo[]> {
    const response = await fetch(`${API_URL}/api/ubicaciones/paises`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<ApiEnvelope<PaisCatalogo[]> | PaisCatalogo[]>(response)

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getDivisiones(paisId: number, parentId?: number): Promise<DivisionCatalogo[]> {
    const params = new URLSearchParams({ pais_id: String(paisId) })
    if (parentId !== undefined) {
      params.append('parent_id', String(parentId))
    }

    const response = await fetch(`${API_URL}/api/ubicaciones/divisiones?${params.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<DivisionCatalogo[] | ApiEnvelope<DivisionCatalogo[]>>(
      response,
    )

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async ensureFlexibleDivision(
    data: EnsureFlexibleDivisionDto,
  ): Promise<EnsureFlexibleDivisionResult> {
    const response = await fetch(`${API_URL}/api/ubicaciones/divisiones/flexible`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    const payload = await this.parseJsonResponse<
      EnsureFlexibleDivisionResult | ApiEnvelope<EnsureFlexibleDivisionResult>
    >(response)

    const direct = payload as EnsureFlexibleDivisionResult
    if (direct && typeof direct === 'object' && direct.data && 'id' in direct.data) {
      return {
        success: Boolean(direct.success ?? true),
        data: direct.data,
        created: Boolean(direct.created ?? false),
      }
    }

    const nestedEnvelope = payload as ApiEnvelope<EnsureFlexibleDivisionResult>
    if (nestedEnvelope.data && typeof nestedEnvelope.data === 'object' && 'data' in nestedEnvelope.data) {
      return {
        success: Boolean(nestedEnvelope.success ?? true),
        data: nestedEnvelope.data.data,
        created: Boolean(nestedEnvelope.data.created ?? false),
      }
    }

    const simpleEnvelope = payload as ApiEnvelope<DivisionCatalogo> & { created?: boolean }
    if (simpleEnvelope.data && typeof simpleEnvelope.data === 'object' && 'id' in simpleEnvelope.data) {
      return {
        success: Boolean(simpleEnvelope.success ?? true),
        data: simpleEnvelope.data,
        created: Boolean(simpleEnvelope.created ?? false),
      }
    }

    throw new Error('Respuesta inválida del servidor al crear división flexible.')
  }
}
