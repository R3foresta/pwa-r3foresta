import type { UbicacionApi, UbicacionCreateInput } from '../types/ubicacion'

const API_URL = import.meta.env.VITE_API_URL

export type TipoMaterialCanonico = 'SEMILLA' | 'ESQUEJE'
export type FuenteUbicacionCanonica = 'GPS_MOVIL' | 'MAPA' | 'MANUAL' | 'LEGACY'

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface UsuarioResumen {
  id: number
  correo?: string | null
  nombre?: string | null
  username?: string | null
}

export interface MetodoRecoleccionCatalogo {
  id: number
  nombre: string
  descripcion?: string | null
}

export interface ViveroCatalogo {
  id: number
  codigo: string
  nombre: string
  ubicacion?: UbicacionApi | null
}

export interface PlantaCatalogo {
  id: number
  especie: string
  nombre_cientifico: string
  variedad: string
  created_at?: string
  imagen_url?: string | null
  tipo_planta_id?: number
  nombres_comunes?: string | null
  nombre_comun_principal?: string | null
  notas?: string | null
}

export interface PaisCatalogoV2 {
  id: number
  nombre: string
  codigo_iso2: string | null
}

export interface DivisionCatalogoV2 {
  id: number
  pais_id: number
  parent_id: number | null
  tipo_id: number
  tipo_nombre: string | null
  tipo_orden: number | null
  nombre: string
}

export interface EvidenciaTrazabilidad {
  id: number
  tipo_entidad_id: number
  entidad_id: number
  codigo_trazabilidad: string | null
  bucket: string
  ruta_archivo: string
  storage_object_id: string | null
  tipo_archivo: string
  mime_type: string
  tamano_bytes: number | null
  hash_sha256: string | null
  titulo: string | null
  descripcion: string | null
  metadata: Record<string, unknown> | null
  es_principal: boolean
  orden: number
  tomado_en: string | null
  creado_en: string
  actualizado_en: string
  public_url?: string | null
}

export interface RecoleccionV2 {
  id: number
  fecha: string
  nombre_cientifico: string | null
  nombre_comercial: string | null
  cantidad: number
  unidad: string
  tipo_material: string
  estado: string | null
  especie_nueva: boolean
  observaciones: string | null
  usuario_id: number
  vivero_id: number | null
  metodo_id: number
  planta_id: number | null
  created_at: string
  codigo_trazabilidad: string
  blockchain_url: string | null
  token_id: string | null
  transaction_hash: string | null
  estado_registro: string | null
  unidad_canonica: string | null
  cantidad_inicial_canonica: number | null
  usuario_validacion_id: number | null
  fecha_validacion: string | null
  blockchain_hash_validacion?: string | null
  usuario?: UsuarioResumen
  vivero?: ViveroCatalogo | null
  metodo?: MetodoRecoleccionCatalogo | null
  planta?: PlantaCatalogo | null
  ubicacion?: UbicacionApi | null
  evidencias?: EvidenciaTrazabilidad[]
}

export interface RecoleccionV2Filters {
  page?: number
  limit?: number
  q?: string
  tipo_material?: TipoMaterialCanonico
  planta_id?: number
  vivero_id?: number
  fecha_inicio?: string
  fecha_fin?: string
}

export interface ListRecoleccionesResult {
  success: boolean
  data: RecoleccionV2[]
  pagination: ApiPagination
}

export interface CreateRecoleccionV2Dto {
  fecha: string
  cantidad: number
  unidad: string
  tipo_material: TipoMaterialCanonico
  planta_id: number
  metodo_id: number
  vivero_id: number
  observaciones?: string
  ubicacion: UbicacionCreateInput & {
    fuente?: FuenteUbicacionCanonica
  }
  fotos: File[]
}

export interface AddEvidenciasRecoleccionDto {
  titulo?: string
  descripcion?: string
  metadata?: Record<string, unknown>
  es_principal?: boolean
  fotos: File[]
}

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string
  error?: string
  pagination?: Partial<ApiPagination>
}

function isTipoMaterialCanonico(value: string): value is TipoMaterialCanonico {
  return value === 'SEMILLA' || value === 'ESQUEJE'
}

export class RecoleccionesV2Service {
  private static getRequiredAuthId() {
    const authId = localStorage.getItem('auth_id')
    if (!authId) {
      throw new Error('No se encontró auth_id. Vuelve a iniciar sesión antes de continuar.')
    }
    return authId
  }

  private static getAuthHeaders(options?: {
    includeContentType?: boolean
    requireAuthId?: boolean
  }): HeadersInit {
    const includeContentType = options?.includeContentType ?? true
    const requireAuthId = options?.requireAuthId ?? false

    const token = localStorage.getItem('authToken')
    const authId = requireAuthId ? this.getRequiredAuthId() : localStorage.getItem('auth_id')

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

  private static buildPagination(
    value?: Partial<ApiPagination> | null,
    fallbackTotal = 0,
  ): ApiPagination {
    return {
      page: Number(value?.page ?? 1),
      limit: Number(value?.limit ?? 20),
      total: Number(value?.total ?? fallbackTotal),
      totalPages: Number(value?.totalPages ?? (fallbackTotal > 0 ? 1 : 0)),
      hasNextPage: Boolean(value?.hasNextPage ?? false),
      hasPrevPage: Boolean(value?.hasPrevPage ?? false),
    }
  }

  private static normalizeListResponse(payload: unknown): ListRecoleccionesResult {
    if (Array.isArray(payload)) {
      return {
        success: true,
        data: payload as RecoleccionV2[],
        pagination: this.buildPagination(undefined, payload.length),
      }
    }

    const envelope = payload as ApiEnvelope<RecoleccionV2[] | { items: RecoleccionV2[] }>

    if (Array.isArray(envelope.data)) {
      return {
        success: Boolean(envelope.success ?? true),
        data: envelope.data,
        pagination: this.buildPagination(envelope.pagination, envelope.data.length),
      }
    }

    if (envelope.data && typeof envelope.data === 'object' && 'items' in envelope.data) {
      const items = Array.isArray(envelope.data.items) ? envelope.data.items : []
      return {
        success: Boolean(envelope.success ?? true),
        data: items,
        pagination: this.buildPagination(envelope.pagination, items.length),
      }
    }

    return {
      success: true,
      data: [],
      pagination: this.buildPagination(undefined, 0),
    }
  }

  static async list(filters?: RecoleccionV2Filters): Promise<ListRecoleccionesResult> {
    const params = new URLSearchParams()

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }

    const query = params.toString()
    const url = `${API_URL}/api/recolecciones${query ? `?${query}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<unknown>(response)
    return this.normalizeListResponse(payload)
  }

  static async getById(id: number): Promise<{ success: boolean; data: RecoleccionV2 }> {
    const response = await fetch(`${API_URL}/api/recolecciones/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<ApiEnvelope<RecoleccionV2> | RecoleccionV2>(response)

    if ('data' in (payload as ApiEnvelope<RecoleccionV2>) && (payload as ApiEnvelope<RecoleccionV2>).data) {
      return {
        success: Boolean((payload as ApiEnvelope<RecoleccionV2>).success ?? true),
        data: (payload as ApiEnvelope<RecoleccionV2>).data as RecoleccionV2,
      }
    }

    return {
      success: true,
      data: payload as RecoleccionV2,
    }
  }

  static async create(data: CreateRecoleccionV2Dto): Promise<{ success: boolean; data: RecoleccionV2 }> {
    this.validateCreatePayload(data)

    const formData = new FormData()
    formData.append('fecha', data.fecha)
    formData.append('cantidad', String(data.cantidad))
    formData.append('unidad', data.unidad)
    formData.append('tipo_material', data.tipo_material)
    formData.append('planta_id', String(data.planta_id))
    formData.append('metodo_id', String(data.metodo_id))
    formData.append('vivero_id', String(data.vivero_id))

    if (data.observaciones?.trim()) {
      formData.append('observaciones', data.observaciones.trim())
    }

    const { ubicacion } = data
    formData.append('ubicacion[latitud]', String(ubicacion.latitud))
    formData.append('ubicacion[longitud]', String(ubicacion.longitud))

    if (ubicacion.pais_id !== undefined) {
      formData.append('ubicacion[pais_id]', String(ubicacion.pais_id))
    }
    if (ubicacion.division_id !== undefined) {
      formData.append('ubicacion[division_id]', String(ubicacion.division_id))
    }
    if (ubicacion.nombre?.trim()) {
      formData.append('ubicacion[nombre]', ubicacion.nombre.trim())
    }
    if (ubicacion.referencia?.trim()) {
      formData.append('ubicacion[referencia]', ubicacion.referencia.trim())
    }
    if (ubicacion.precision_m !== undefined) {
      formData.append('ubicacion[precision_m]', String(ubicacion.precision_m))
    }
    if (ubicacion.fuente) {
      formData.append('ubicacion[fuente]', ubicacion.fuente)
    }

    data.fotos.forEach((foto) => {
      formData.append('fotos', foto)
    })

    const response = await fetch(`${API_URL}/api/recolecciones`, {
      method: 'POST',
      headers: this.getAuthHeaders({ includeContentType: false, requireAuthId: true }),
      body: formData,
    })

    const payload = await this.parseJsonResponse<ApiEnvelope<RecoleccionV2> | RecoleccionV2>(response)

    if ('data' in (payload as ApiEnvelope<RecoleccionV2>) && (payload as ApiEnvelope<RecoleccionV2>).data) {
      return {
        success: Boolean((payload as ApiEnvelope<RecoleccionV2>).success ?? true),
        data: (payload as ApiEnvelope<RecoleccionV2>).data as RecoleccionV2,
      }
    }

    return {
      success: true,
      data: payload as RecoleccionV2,
    }
  }

  static async getEvidenciasByRecoleccion(
    recoleccionId: number,
  ): Promise<{ success: boolean; data: EvidenciaTrazabilidad[] }> {
    const response = await fetch(
      `${API_URL}/api/evidencias-trazabilidad/recolecciones/${recoleccionId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      },
    )

    const payload = await this.parseJsonResponse<
      ApiEnvelope<EvidenciaTrazabilidad[]> | EvidenciaTrazabilidad[]
    >(response)

    if (Array.isArray(payload)) {
      return {
        success: true,
        data: payload,
      }
    }

    return {
      success: Boolean(payload.success ?? true),
      data: Array.isArray(payload.data) ? payload.data : [],
    }
  }

  static async addEvidenciasToRecoleccion(
    recoleccionId: number,
    data: AddEvidenciasRecoleccionDto,
  ): Promise<{ success: boolean; data: EvidenciaTrazabilidad[] }> {
    if (!Number.isFinite(recoleccionId) || recoleccionId <= 0) {
      throw new Error('ID de recolección inválido.')
    }

    if (!Array.isArray(data.fotos) || data.fotos.length < 1) {
      throw new Error('Debes enviar al menos una foto para agregar evidencias.')
    }

    if (data.fotos.length > 5) {
      throw new Error('Solo se permiten hasta 5 fotos por carga de evidencias.')
    }

    const formData = new FormData()
    if (data.titulo?.trim()) {
      formData.append('titulo', data.titulo.trim())
    }
    if (data.descripcion?.trim()) {
      formData.append('descripcion', data.descripcion.trim())
    }
    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata))
    }
    if (data.es_principal !== undefined) {
      formData.append('es_principal', String(Boolean(data.es_principal)))
    }

    data.fotos.forEach((foto) => {
      formData.append('fotos', foto)
    })

    const response = await fetch(
      `${API_URL}/api/evidencias-trazabilidad/recolecciones/${recoleccionId}`,
      {
        method: 'POST',
        headers: this.getAuthHeaders({ includeContentType: false, requireAuthId: true }),
        body: formData,
      },
    )

    const payload = await this.parseJsonResponse<
      ApiEnvelope<EvidenciaTrazabilidad[] | EvidenciaTrazabilidad> | EvidenciaTrazabilidad[]
    >(response)

    if (Array.isArray(payload)) {
      return { success: true, data: payload }
    }

    if (Array.isArray(payload.data)) {
      return { success: Boolean(payload.success ?? true), data: payload.data }
    }

    if (payload.data && typeof payload.data === 'object') {
      return { success: Boolean(payload.success ?? true), data: [payload.data] }
    }

    return { success: Boolean(payload.success ?? true), data: [] }
  }

  static async getPlantas(): Promise<PlantaCatalogo[]> {
    const response = await fetch(`${API_URL}/api/plantas`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const payload = await this.parseJsonResponse<ApiEnvelope<PlantaCatalogo[]> | PlantaCatalogo[]>(response)

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getMetodos(): Promise<MetodoRecoleccionCatalogo[]> {
    const response = await fetch(`${API_URL}/api/metodos-recoleccion`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const payload = await this.parseJsonResponse<
      ApiEnvelope<MetodoRecoleccionCatalogo[]> | MetodoRecoleccionCatalogo[]
    >(response)

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getViveros(): Promise<ViveroCatalogo[]> {
    const response = await fetch(`${API_URL}/api/viveros`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const payload = await this.parseJsonResponse<ApiEnvelope<ViveroCatalogo[]> | ViveroCatalogo[]>(response)

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getPaises(): Promise<PaisCatalogoV2[]> {
    const response = await fetch(`${API_URL}/api/ubicaciones/paises`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<ApiEnvelope<PaisCatalogoV2[]> | PaisCatalogoV2[]>(response)

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  static async getDivisiones(paisId: number, parentId?: number): Promise<DivisionCatalogoV2[]> {
    const params = new URLSearchParams({ pais_id: String(paisId) })
    if (parentId !== undefined) {
      params.append('parent_id', String(parentId))
    }

    const response = await fetch(`${API_URL}/api/ubicaciones/divisiones?${params.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    const payload = await this.parseJsonResponse<DivisionCatalogoV2[] | ApiEnvelope<DivisionCatalogoV2[]>>(
      response,
    )

    if (Array.isArray(payload)) {
      return payload
    }

    return Array.isArray(payload.data) ? payload.data : []
  }

  private static validateCreatePayload(data: CreateRecoleccionV2Dto) {
    if (!isTipoMaterialCanonico(data.tipo_material)) {
      throw new Error('Tipo de material inválido. Solo se permite SEMILLA o ESQUEJE.')
    }

    if (!Number.isFinite(data.cantidad) || data.cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0.')
    }

    if (data.tipo_material === 'ESQUEJE' && !Number.isInteger(data.cantidad)) {
      throw new Error('Para ESQUEJE la cantidad debe ser un número entero.')
    }

    if (data.fotos.length < 2 || data.fotos.length > 5) {
      throw new Error('Debes enviar entre 2 y 5 fotos para crear la recolección.')
    }

    const lat = Number(data.ubicacion.latitud)
    const lon = Number(data.ubicacion.longitud)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error('Latitud inválida. Debe estar entre -90 y 90.')
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new Error('Longitud inválida. Debe estar entre -180 y 180.')
    }

    if (!Number.isFinite(data.planta_id) || data.planta_id <= 0) {
      throw new Error('Debes seleccionar una planta válida.')
    }
    if (!Number.isFinite(data.metodo_id) || data.metodo_id <= 0) {
      throw new Error('Debes seleccionar un método de recolección válido.')
    }
    if (!Number.isFinite(data.vivero_id) || data.vivero_id <= 0) {
      throw new Error('Debes seleccionar un vivero válido.')
    }
  }
}
