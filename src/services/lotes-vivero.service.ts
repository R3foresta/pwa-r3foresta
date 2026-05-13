import {
  createLoteViveroApi,
  getEmbolsadoApi,
  getEmbolsadoContextApi,
  listLotesViveroApi,
  registrarAdaptabilidadApi,
  registrarDespachoApi,
  registrarEmbolsadoApi,
  registrarMermaApi,
  uploadEvidenciasEventoViveroApi,
  uploadEvidenciasPendientesViveroApi,
} from '../api/lotes-vivero.api'
import { mapLoteToCardData, mapLoteToDetailView } from '../modules/vivero/mappers/lote.mapper'
import type {
  ApiPagination,
  CreateLoteViveroInput,
  CreateLoteViveroResponse,
  EmbolsadoContextData,
  EmbolsadoContextResponse,
  EvidenciaEventoVivero,
  ListLotesViveroQuery,
  ListLotesViveroResponse,
  LoteViveroItem,
  ObtenerEmbolsadoResponse,
  RegistrarAdaptabilidadRequest,
  RegistrarAdaptabilidadResponse,
  RegistrarDespachoRequest,
  RegistrarEmbolsadoRequest,
  RegistrarEmbolsadoResponse,
  RegistrarMermaRequest,
  RegistrarMermaResponse,
  UploadEvidenciasPendientesInput,
  UploadEvidenciasPendientesResponse,
  UploadEvidenciasEventoInput,
  UploadEvidenciasEventoResponse,
} from '../modules/vivero/types/contracts'
import type { ViveroLotCardData, ViveroLotDetailView } from '../modules/vivero/types/view-models'
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

const MAX_EVENT_EVIDENCE_PHOTOS = 5
const MAX_EVENT_EVIDENCE_BYTES = 5 * 1024 * 1024
const ALLOWED_EVENT_EVIDENCE_MIME = new Set(['image/jpeg', 'image/png'])

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

function validateEvidencePhotos(fotos: File[], contextLabel = 'evento') {
  if (!Array.isArray(fotos) || fotos.length < 1) {
    throw new Error(`Debes adjuntar al menos una foto del ${contextLabel}.`)
  }
  if (fotos.length > MAX_EVENT_EVIDENCE_PHOTOS) {
    throw new Error(`Solo se permiten hasta ${MAX_EVENT_EVIDENCE_PHOTOS} fotos por evento.`)
  }
  if (fotos.some((foto) => !ALLOWED_EVENT_EVIDENCE_MIME.has(foto.type))) {
    throw new Error('Solo se aceptan fotos JPG o PNG.')
  }
  if (fotos.some((foto) => foto.size > MAX_EVENT_EVIDENCE_BYTES)) {
    throw new Error('Cada foto no puede superar 5 MB.')
  }
}

// La búsqueda libre por texto se delega completamente al backend (`q`), que
// cubre `codigo_trazabilidad` + snapshots de texto. NO refiltramos en cliente
// para evitar descartar hits válidos del backend cuando coinciden por un
// snapshot que el view-model no expone (ej. nombre científico).
//
// TODO(futuro — filtros discretos): si en algún momento queremos filtrar por
// `vivero.nombre` o `subetapaActual` (campos que el `q` del backend NO cubre),
// exponerlos como filtros propios (dropdown / chips), no metiéndolos en el
// campo libre.

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

    return {
      items: cards,
      pagination: response.pagination,
    }
  }

  // TODO(backend-pendiente): el backend NO expone GET /lotes-vivero/:id dedicado.
  // Hoy simulamos con un GET /lotes-vivero?lote_vivero_id=X&limit=1, lo que
  // trae envelope completo de paginación que descartamos. Cuando el backend
  // exponga el endpoint dedicado, reemplazar por una llamada directa a
  // getLoteByIdApi (ver TODO en lotes-vivero.api.ts).
  //
  // TODO(p3-consistencia): este método devuelve `LoteViveroItem` (raw) mientras
  // que listForUi devuelve view-models ya mapeados. Inconsistente. Considerar
  // que getById ya devuelva ViveroLotDetailView aplicando mapLoteToDetailView,
  // o renombrarlo para que quede claro que es raw.
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

  static async getDetail(loteId: number): Promise<ViveroLotDetailView> {
    const lot = await this.getById(loteId)
    return mapLoteToDetailView(lot)
  }

  static async uploadEvidenciasPendientes(
    input: UploadEvidenciasPendientesInput,
    authId?: string,
  ): Promise<UploadEvidenciasPendientesResponse> {
    validateEvidencePhotos(input.fotos, 'inicio del lote')

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

  static async uploadEvidenciasEvento(
    loteId: number,
    tipoEvento: EvidenciaEventoVivero,
    input: UploadEvidenciasEventoInput,
    authId?: string,
  ): Promise<UploadEvidenciasEventoResponse> {
    validateEvidencePhotos(input.fotos, tipoEvento.toLowerCase())
    const response = await uploadEvidenciasEventoViveroApi(loteId, tipoEvento, input, authId)
    const payload = await this.parseJsonResponse<UploadEvidenciasEventoResponse>(
      response,
      'Error al subir evidencias del evento.',
    )
    const evidenciaIds = Array.isArray(payload.data?.evidencia_ids)
      ? payload.data.evidencia_ids
      : []
    if (evidenciaIds.length < 1) {
      throw new Error('No se recibieron IDs de evidencia para registrar el evento.')
    }
    return {
      success: true,
      data: {
        evidencia_ids: evidenciaIds,
        evidencias: Array.isArray(payload.data?.evidencias) ? payload.data.evidencias : [],
      },
    }
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

  static async registrarAdaptabilidad(
    loteId: number,
    input: RegistrarAdaptabilidadRequest,
    authId?: string,
  ): Promise<RegistrarAdaptabilidadResponse> {
    const response = await registrarAdaptabilidadApi(loteId, input, authId)
    return this.parseJsonResponse<RegistrarAdaptabilidadResponse>(
      response,
      'Error al registrar la adaptabilidad.',
    )
  }

  static async registrarMerma(
    loteId: number,
    input: RegistrarMermaRequest,
    authId?: string,
  ): Promise<RegistrarMermaResponse> {
    const response = await registrarMermaApi(loteId, input, authId)
    return this.parseJsonResponse<RegistrarMermaResponse>(
      response,
      'Error al registrar la merma.',
    )
  }

  // TODO(despacho-bloqueado): este método queda inalcanzable desde la UI hasta
  // que se levante el flag DESPACHO_EVIDENCE_ENDPOINT_READY en DespachoForm.tsx
  // (depende del endpoint de evidencias backend + Módulo 3 Plantación). Cuando
  // se reactive, además reemplazar `unknown` por RegistrarDespachoResponse —
  // hoy ese tipo tampoco existe en contracts.ts.
  static async registrarDespacho(
    loteId: number,
    input: RegistrarDespachoRequest,
    authId?: string,
  ): Promise<unknown> {
    const response = await registrarDespachoApi(loteId, input, authId)
    return this.parseJsonResponse<unknown>(
      response,
      'Error al registrar el despacho.',
    )
  }
}
