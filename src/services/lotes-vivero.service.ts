import {
  createLoteViveroApi,
  getEmbolsadoApi,
  getEmbolsadoContextApi,
  listLotesViveroApi,
  registrarEmbolsadoApi,
  uploadEvidenciasEmbolsadoApi,
  uploadEvidenciasPendientesViveroApi,
} from '../api/lotes-vivero.api'
import { mapLoteToCardData } from '../modules/vivero/mappers/lote.mapper'
import type {
  ApiPagination,
  CreateLoteViveroInput,
  CreateLoteViveroResponse,
  EmbolsadoContextData,
  EmbolsadoContextResponse,
  EvidenciasEmbolsadoResponse,
  ListLotesViveroQuery,
  ListLotesViveroResponse,
  LoteViveroItem,
  ObtenerEmbolsadoResponse,
  RegistrarEmbolsadoRequest,
  RegistrarEmbolsadoResponse,
  UploadEvidenciasPendientesInput,
  UploadEvidenciasPendientesResponse,
  UploadEvidenciasEmbolsadoInput,
} from '../modules/vivero/types/contracts'
import type { ViveroLotCardData } from '../modules/vivero/types/view-models'
import {
  buildBackendQueryForStageFilter,
  matchesStageFilter,
  type StageFilter,
} from '../modules/vivero/utils/stageFilters'

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  pagination?: Partial<ApiPagination>
  message?: string | string[]
  error?: string
}

export type ListViveroLotsForUiInput = {
  stageFilter: StageFilter
  searchQuery?: string
  page?: number
  limit?: number
}

export type ListViveroLotsForUiResult = {
  items: ViveroLotCardData[]
  pagination: ApiPagination
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

function filterCardsBySearch(cards: ViveroLotCardData[], searchQuery?: string): ViveroLotCardData[] {
  const normalized = searchQuery?.trim().toLowerCase() || ''
  if (!normalized) return cards

  return cards.filter((lot) =>
    [lot.codigo, lot.especie, lot.vivero, lot.subetapaActual ?? ''].some((field) =>
      field.toLowerCase().includes(normalized),
    ),
  )
}

export class LotesViveroService {
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

  // Contrato técnico (backend).
  static async list(filters?: ListLotesViveroQuery): Promise<ListLotesViveroResponse> {
    const response = await listLotesViveroApi(filters)
    const payload = await this.parseJsonResponse<unknown>(
      response,
      'Error al cargar lotes de vivero.',
    )
    return this.normalizeListResponse(payload)
  }

  // Caso de uso UI (backend filter + reglas de etapa + view model).
  static async listForUi(input: ListViveroLotsForUiInput): Promise<ListViveroLotsForUiResult> {
    const backendFilters: ListLotesViveroQuery = {
      page: input.page,
      limit: input.limit,
      q: input.searchQuery?.trim() || undefined,
      ...buildBackendQueryForStageFilter(input.stageFilter),
    }

    const response = await this.list(backendFilters)
    const stageScoped = response.data.filter((lot) => matchesStageFilter(lot, input.stageFilter))
    const cards = stageScoped.map(mapLoteToCardData)
    const filteredCards = filterCardsBySearch(cards, input.searchQuery)

    return {
      items: filteredCards,
      pagination: response.pagination,
    }
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

    const response = await uploadEvidenciasPendientesViveroApi(input, authId)
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
    const response = await createLoteViveroApi(input, authId)
    return this.parseJsonResponse<CreateLoteViveroResponse>(
      response,
      'Error al crear lote de vivero.',
    )
  }

  static async getEmbolsadoContext(loteId: number): Promise<EmbolsadoContextData> {
    const response = await getEmbolsadoContextApi(loteId)
    const payload = await this.parseJsonResponse<EmbolsadoContextResponse>(
      response,
      'Error al verificar el lote para embolsado.',
    )
    return payload.data
  }

  static async uploadEvidenciasEmbolsado(
    loteId: number,
    input: UploadEvidenciasEmbolsadoInput,
    authId?: string,
  ): Promise<EvidenciasEmbolsadoResponse> {
    if (!Array.isArray(input.fotos) || input.fotos.length < 1) {
      throw new Error('Debes adjuntar la foto del embolsado.')
    }
    const response = await uploadEvidenciasEmbolsadoApi(loteId, input, authId)
    return this.parseJsonResponse<EvidenciasEmbolsadoResponse>(
      response,
      'Error al subir la foto del embolsado.',
    )
  }

  static async registrarEmbolsado(
    loteId: number,
    input: RegistrarEmbolsadoRequest,
    authId?: string,
  ): Promise<RegistrarEmbolsadoResponse> {
    const response = await registrarEmbolsadoApi(loteId, input, authId)
    return this.parseJsonResponse<RegistrarEmbolsadoResponse>(
      response,
      'Error al registrar el embolsado.',
    )
  }

  static async getEmbolsado(loteId: number): Promise<ObtenerEmbolsadoResponse> {
    const response = await getEmbolsadoApi(loteId)
    return this.parseJsonResponse<ObtenerEmbolsadoResponse>(
      response,
      'Error al obtener el embolsado registrado.',
    )
  }
}
