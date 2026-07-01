import {
  createLoteViveroApi,
  getEmbolsadoApi,
  getEmbolsadoContextApi,
  getLoteTimelineApi,
  listLotesViveroApi,
  registrarAdaptabilidadApi,
  registrarDespachoApi,
  registrarEmbolsadoApi,
  registrarMermaApi,
  uploadEvidenciasEventoViveroApi,
  uploadEvidenciasPendientesViveroApi,
  getTimelineApi,
  listSubcampaniasApi,
  listAsignacionesApi,
  crearAsignacionApi,
  cancelarAsignacionApi,
  listStockEspeciesApi,
} from '../api/lotes-vivero.api'

import { mapLoteToCardData, mapLoteToDetailView } from '../modules/vivero/mappers/lote.mapper'
import type {
  ApiPagination,
  CreateLoteViveroInput,
  CreateLoteViveroResponse,
  CrearAsignacionViveroRequest,
  EmbolsadoContextData,
  EmbolsadoContextResponse,
  EvidenciaEventoVivero,
  ListLotesViveroQuery,
  ListLotesViveroResponse,
  LoteTimelineAdaptabilidadResponse,
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
import type { ViveroLotCardData, ViveroLotDetailView, ViveroLotEventView } from '../modules/vivero/types/view-models'
import {
  buildBackendQueryForStageFilter,
  matchesStageFilter,
  type StageFilter,
} from '../modules/vivero/utils/stageFilters'
import { getImageFileValidationError } from '../utils/imageValidation'

import { mapTimelineEventToView } from '../modules/vivero/mappers/lote.mapper'
import type { TimelineEventDto } from '../modules/vivero/types/contracts'

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  pagination?: Partial<ApiPagination>
  message?: string | string[]
  error?: string
}

const MAX_EVENT_EVIDENCE_PHOTOS = 5

export type ListViveroLotsForUiInput = {
  stageFilter: StageFilter
  searchQuery?: string
  page?: number
  limit?: number
  subcampaniaId?: number
}

export type ListViveroLotsForUiResult = {
  items: ViveroLotCardData[]
  pagination: ApiPagination
}

export type SubcampaniaResumen = {
  id: number
  nombre: string
  estado?: string | null
}

export type EspecieStockVivero = {
  planta_id: number
  especie: string
  nombre_cientifico: string
  nombre_comun_principal: string | null
  saldo_vivo_actual_total: number
  saldo_reservado_total: number
  saldo_disponible_total: number
}

export type AsignacionViveroResumen = {
  id: number
  proposito?: string | null
  fecha_asignacion?: string | null
  subcampania_nombre?: string | null
  creador_nombre?: string | null
  campania_nombre?: string | null
  coordinador_nombre?: string | null
  cantidad_asignada?: number | null
  saldo_asignado_disponible?: number | null
  cantidad_consumida?: number | null
  cantidad_devuelta?: number | null
  cantidad_mermada?: number | null
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
  const invalidPhoto = fotos.find((foto) => getImageFileValidationError(foto))
  if (invalidPhoto) {
    throw new Error(
      getImageFileValidationError(invalidPhoto) ??
        'Solo se aceptan fotos JPG, PNG, WEBP, HEIC o HEIF.',
    )
  }
}

export class LotesViveroService {
  // Contrato backend (NestJS estándar): el body de error es siempre uno de
  //   { statusCode, message: string,   error: 'Bad Request' | ... }   ← RPC RAISE (texto en español)
  //   { statusCode, message: string[], error: 'Bad Request' }         ← ValidationPipe (DTO)
  // Usamos '\n' como separador para que cada mensaje del array quede en su
  // propia línea (los <p> que renderizan `submitError` aplican `whitespace-pre-line`).
  private static normalizeErrorMessage(payload: unknown, fallback: string): string {
    if (!payload || typeof payload !== 'object') return fallback
    const source = payload as ApiEnvelope<unknown>
    if (Array.isArray(source.message)) {
      const lines = source.message
        .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
        .map((m) => m.trim())
      return lines.length > 0 ? lines.join('\n') : fallback
    }
    if (typeof source.message === 'string' && source.message.trim()) {
      return source.message.trim()
    }
    // `error` queda como último recurso: en NestJS es texto genérico
    // ("Bad Request"), peor que el fallback específico del endpoint.
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
      success: true,
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
    const response = await listLotesViveroApi(filters)
    const payload = await this.parseJsonResponse<unknown>(
      response,
      'Error al cargar lotes de vivero.',
    )
    return this.normalizeListResponse(payload)
  }

  static async listForUi(input: ListViveroLotsForUiInput): Promise<ListViveroLotsForUiResult> {
    const backendFilters: ListLotesViveroQuery = {
      page: input.page,
      limit: input.limit,
      // NOTA: La búsqueda de texto (input.searchQuery) se delega al backend
      // mediante el parámetro `q`. No re-filtramos localmente para evitar
      // desincronizaciones con la paginación del servidor.
      q: input.searchQuery?.trim() || undefined,
      subcampania_id: input.subcampaniaId || undefined,
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

  static async getById(loteId: number): Promise<LoteViveroItem> {
    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new Error('ID de lote de vivero inválido.')
    }

    // TODO(backend-pendiente): Ineficiencia conocida.
    // Actualmente NO existe un endpoint GET /lotes-vivero/:id específico.
    // Simulamos la obtención de detalle forzando una búsqueda en el listado
    // con límite 1. Esto debe cambiarse cuando backend libere el endpoint de detalle.
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

  static async getEvents(lotId: number): Promise<ViveroLotEventView[]> {
    try {
      const response = await getTimelineApi(lotId)

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} al recuperar el historial`)
      }
      const json = await response.json()
      const rawEvents = (json.data?.eventos || json.eventos || []) as TimelineEventDto[];
      const validEvents = rawEvents.filter(e => e.tipo_evento);
      return validEvents.map(mapTimelineEventToView).filter(Boolean) as ViveroLotEventView[];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Error al cargar el historial del lote.')
    }
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
      success: true,
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

  // Historial cronológico de adaptabilidad para el detalle del lote. Consume
  // `/timeline?tipo_evento=ADAPTABILIDAD` (recomendado por backend sobre el
  // dump `/adaptabilidad`) porque trae `responsable_nombre` y `payload`
  // discriminado en una sola request. Devuelve `data.eventos` directo —
  // resto del envelope (lote_id, codigo_trazabilidad, etc.) ya lo conoce el
  // caller desde el detalle.
  static async listAdaptabilidadTimeline(
    loteId: number,
  ): Promise<LoteTimelineAdaptabilidadResponse['data']> {
    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new Error('ID de lote de vivero inválido.')
    }
    const response = await getLoteTimelineApi(loteId, { tipo_evento: 'ADAPTABILIDAD' })
    const payload = await this.parseJsonResponse<LoteTimelineAdaptabilidadResponse>(
      response,
      'Error al cargar el historial de adaptabilidad.',
    )
    return payload.data
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

  static async listStockEspecies(): Promise<EspecieStockVivero[]> {
    const response = await listStockEspeciesApi()
    const payload = await this.parseJsonResponse<ApiEnvelope<unknown>>(
      response,
      'Error al cargar el stock por especie.',
    )
    const rawList = Array.isArray(payload.data) ? payload.data : []
    return rawList.flatMap((raw) => {
      if (!raw || typeof raw !== 'object') return []
      const item = raw as Record<string, unknown>
      const plantaId = Number(item.planta_id)
      if (!Number.isFinite(plantaId) || plantaId <= 0) return []
      const toNumber = (value: unknown) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      const especie = typeof item.especie === 'string' ? item.especie : ''
      const nombreCientifico =
        typeof item.nombre_cientifico === 'string' ? item.nombre_cientifico : ''
      const nombreComun =
        typeof item.nombre_comun_principal === 'string' ? item.nombre_comun_principal : null
      return [
        {
          planta_id: plantaId,
          especie,
          nombre_cientifico: nombreCientifico,
          nombre_comun_principal: nombreComun,
          saldo_vivo_actual_total: toNumber(item.saldo_vivo_actual_total),
          saldo_reservado_total: toNumber(item.saldo_reservado_total),
          saldo_disponible_total: toNumber(item.saldo_disponible_total),
        },
      ]
    })
  }

  static async listSubcampanias(): Promise<SubcampaniaResumen[]> {
    const response = await listSubcampaniasApi()
    const payload = await this.parseJsonResponse<ApiEnvelope<SubcampaniaResumen[]>>(
      response,
      'Error al cargar subcampañas.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async listAsignaciones(loteId: number): Promise<AsignacionViveroResumen[]> {
    const response = await listAsignacionesApi(loteId)
    const payload = await this.parseJsonResponse<ApiEnvelope<AsignacionViveroResumen[]>>(
      response,
      'Error al cargar asignaciones.',
    )
    return Array.isArray(payload.data) ? payload.data : []
  }

  static async crearAsignacion(
    loteId: number,
    input: CrearAsignacionViveroRequest,
    authId?: string,
  ): Promise<AsignacionViveroResumen> {
    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new Error('ID de lote de vivero invÃ¡lido.')
    }
    if (!Number.isFinite(input.subcampania_id) || input.subcampania_id <= 0) {
      throw new Error('Selecciona una subcampaÃ±a destino.')
    }
    if (!Number.isFinite(input.cantidad_asignada) || input.cantidad_asignada <= 0) {
      throw new Error('La cantidad asignada debe ser mayor a 0.')
    }

    const response = await crearAsignacionApi(loteId, input, authId)
    const payload = await this.parseJsonResponse<ApiEnvelope<AsignacionViveroResumen>>(
      response,
      'Error al crear la asignaciÃ³n.',
    )
    if (!payload.data) {
      throw new Error('No se recibiÃ³ la asignaciÃ³n creada.')
    }
    return payload.data
  }

  static async cancelarAsignacion(
    loteId: number,
    asignacionId: number,
    authId?: string,
  ): Promise<AsignacionViveroResumen | null> {
    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new Error('ID de lote de vivero invÃ¡lido.')
    }
    if (!Number.isFinite(asignacionId) || asignacionId <= 0) {
      throw new Error('ID de asignaciÃ³n invÃ¡lido.')
    }

    const response = await cancelarAsignacionApi(loteId, asignacionId, authId)
    const payload = await this.parseJsonResponse<ApiEnvelope<AsignacionViveroResumen>>(
      response,
      'Error al cancelar la asignaciÃ³n.',
    )
    return payload.data ?? null
  }
}

// TODO(backend-pendiente): funciones cliente faltantes — el backend ya las expone
// pero todavía no las consumimos desde el frontend. Agregar cuando se conecte:
//   • GET  /lotes-vivero/:id/adaptabilidad
//   • GET  /lotes-vivero/:id/merma
