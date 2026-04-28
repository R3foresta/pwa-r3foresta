import type {
  ApiPagination,
  CreateLoteViveroInput,
  CreateLoteViveroResponse,
  ListLotesViveroQuery,
  ListLotesViveroResponse,
  LoteViveroItem,
  UploadEvidenciasPendientesInput,
  UploadEvidenciasPendientesResponse,
} from '../modules/vivero/types/contracts'

const API_URL = import.meta.env.VITE_API_URL

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  pagination?: Partial<ApiPagination>
  message?: string | string[]
  error?: string
}

function defaultPagination(total = 0): ApiPagination {
  return {
    page: 1,
    limit: 20,
    total,
    totalPages: total > 0 ? 1 : 0,
    hasNextPage: false,
    hasPrevPage: false,
  }
}

export class LotesViveroService {
  private static buildListQuery(filters?: ListLotesViveroQuery): string {
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

  private static getRequiredAuthId(authId?: string): string {
    const resolved = authId || localStorage.getItem('auth_id') || undefined
    if (!resolved) {
      throw new Error('No se encontró auth_id. Vuelve a iniciar sesión.')
    }
    return resolved
  }

  private static getAuthHeaders(options?: {
    authId?: string
    includeContentType?: boolean
  }): HeadersInit {
    const includeContentType = options?.includeContentType ?? true
    const resolvedAuthId = this.getRequiredAuthId(options?.authId)
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

  private static normalizeErrorMessage(payload: unknown, fallback: string): string {
    if (!payload || typeof payload !== 'object') return fallback
    const source = payload as ApiEnvelope<unknown>
    if (Array.isArray(source.message)) {
      return source.message.join(' · ') || fallback
    }
    if (typeof source.message === 'string' && source.message.trim()) {
      return source.message
    }
    if (typeof source.error === 'string' && source.error.trim()) {
      return source.error
    }
    return fallback
  }

  private static tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private static async parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
    const raw = await response.text()
    const parsed = raw ? this.tryParseJson(raw) : null

    if (!response.ok) {
      throw new Error(this.normalizeErrorMessage(parsed, raw || fallbackError))
    }

    if (!parsed) {
      throw new Error('Respuesta vacía del servidor.')
    }

    return parsed as T
  }

  private static normalizeListResponse(payload: unknown): ListLotesViveroResponse {
    if (Array.isArray(payload)) {
      return {
        success: true,
        data: payload as LoteViveroItem[],
        pagination: defaultPagination(payload.length),
      }
    }

    const envelope = payload as ApiEnvelope<LoteViveroItem[]>
    const items = Array.isArray(envelope.data) ? envelope.data : []
    const fallback = defaultPagination(items.length)

    return {
      success: Boolean(envelope.success ?? true),
      data: items,
      pagination: {
        page: Number(envelope.pagination?.page ?? fallback.page),
        limit: Number(envelope.pagination?.limit ?? fallback.limit),
        total: Number(envelope.pagination?.total ?? fallback.total),
        totalPages: Number(envelope.pagination?.totalPages ?? fallback.totalPages),
        hasNextPage: Boolean(envelope.pagination?.hasNextPage ?? fallback.hasNextPage),
        hasPrevPage: Boolean(envelope.pagination?.hasPrevPage ?? fallback.hasPrevPage),
      },
    }
  }

  static async list(filters?: ListLotesViveroQuery): Promise<ListLotesViveroResponse> {
    const query = this.buildListQuery(filters)
    const response = await fetch(`${API_URL}/api/lotes-vivero${query}`, {
      method: 'GET',
    })
    const payload = await this.parseJsonResponse<unknown>(
      response,
      'Error al cargar lotes de vivero.',
    )
    return this.normalizeListResponse(payload)
  }

  static async getById(loteId: number): Promise<LoteViveroItem> {
    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new Error('ID de lote de vivero inválido.')
    }

    const response = await this.list({ lote_vivero_id: loteId, page: 1, limit: 1 })
    const lot = response.data[0]
    if (!lot) {
      throw new Error('Lote de vivero no encontrado.')
    }
    return lot
  }

  static async uploadEvidenciasPendientes(
    input: UploadEvidenciasPendientesInput,
    authId?: string,
  ): Promise<UploadEvidenciasPendientesResponse> {
    if (!Array.isArray(input.fotos) || input.fotos.length < 1) {
      throw new Error('Debes adjuntar al menos una foto.')
    }
    if (input.fotos.length > 5) {
      throw new Error('Solo se permiten hasta 5 fotos por evento.')
    }

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

    const response = await fetch(`${API_URL}/api/lotes-vivero/evidencias-pendientes`, {
      method: 'POST',
      headers: this.getAuthHeaders({ authId, includeContentType: false }),
      body: formData,
    })

    const payload = await this.parseJsonResponse<UploadEvidenciasPendientesResponse>(
      response,
      'Error al subir evidencias pendientes.',
    )

    return {
      success: Boolean(payload.success ?? true),
      data: Array.isArray(payload.data) ? payload.data : [],
      evidencia_ids: Array.isArray(payload.evidencia_ids) ? payload.evidencia_ids : [],
    }
  }

  static async createLote(
    input: CreateLoteViveroInput,
    authId?: string,
  ): Promise<CreateLoteViveroResponse> {
    const response = await fetch(`${API_URL}/api/lotes-vivero`, {
      method: 'POST',
      headers: this.getAuthHeaders({ authId }),
      body: JSON.stringify(input),
    })

    return this.parseJsonResponse<CreateLoteViveroResponse>(
      response,
      'Error al crear lote de vivero.',
    )
  }
}
