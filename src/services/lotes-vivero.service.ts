import {
  createLoteViveroApi,
  getEmbolsadoApi,
  getEmbolsadoContextApi,
  getAuthHeaders,
  listLotesViveroApi,
  registrarAdaptabilidadApi,
  registrarDespachoApi,
  registrarEmbolsadoApi,
  registrarMermaApi,
  uploadEvidenciasEventoViveroApi,
  uploadEvidenciasPendientesViveroApi,
  getTimelineApi, // ✅ Ahora se importa correctamente desde el archivo api
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
import type { ViveroLotCardData, ViveroLotDetailView, ViveroLotEventView } from '../modules/vivero/types/view-models'
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

  static async getEvents(lotId: number): Promise<ViveroLotEventView[]> {
    try {
      const response = await getTimelineApi(lotId);
      
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} al recuperar el historial`);
      }

      const json = await response.json();
      
      // De acuerdo a tu vivero-timeline.service.ts, el array real vive en: json.data.eventos
      const rawEvents = json.data?.eventos || json.eventos || [];

      // Mapeo DTO preciso alineado con las columnas reales de Supabase
      return rawEvents.map((e: any) => ({
        id: e.id,
        kind: e.tipo_evento || 'INICIO', // Lee 'tipo_evento' del backend
        label: e.label || `${e.tipo_evento} registrado`, // Fallback si no viene label explícito
        fecha: e.fecha_evento ? new Date(e.fecha_evento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha',
        observacion: e.observaciones || null, // Sincronizado con 'observaciones' de tu backend
        cantidad: e.payload?.cantidad_afectada || e.payload?.plantas_vivas_iniciales || null,
        saldoDespues: e.payload?.saldo_view_despues || e.payload?.saldo_vivo_despues || null,
        responsableNombre: e.responsable_nombre || 'Operador de campo', // Sincronizado con 'responsable_nombre'
        
        // Sincronizado con el array 'evidencias' que genera cargarEvidenciasBatch
        fotos: (e.evidencias || []).map((f: any) => ({
          id: f.id,
          url: f.public_url || '', // Extrae la url pública real del bucket de Supabase
          titulo: f.titulo || 'Evidencia técnica',
          fecha: f.tomado_en ? new Date(f.tomado_en).toLocaleDateString('es-ES') : (e.fecha_evento || 'Sin fecha')
        }))
      }));
    } catch (error) {
      console.error('❌ Error crítico en el mapeo de producción getEvents:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al acoplar la trazabilidad de Supabase.');
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
}