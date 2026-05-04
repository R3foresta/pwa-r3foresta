export type TipoEventoVivero =
  | 'INICIO'
  | 'EMBOLSADO'
  | 'ADAPTABILIDAD'
  | 'MERMA'
  | 'DESPACHO'
  | 'CIERRE_AUTOMATICO'

export type EstadoLoteVivero = 'ACTIVO' | 'FINALIZADO'

export type SubetapaAdaptabilidad = 'SOMBRA' | 'MEDIA_SOMBRA' | 'SOL_DIRECTO'

export type TipoMaterialVivero = 'SEMILLA' | 'ESQUEJE'

export type UnidadMedidaVivero = 'UNIDAD' | 'G'

export type MotivoCierreVivero = 'DESPACHO_TOTAL' | 'PERDIDA_TOTAL' | 'MIXTO'

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface LoteViveroViveroRef {
  id: number
  codigo: string
  nombre: string
}

export interface LoteViveroRecoleccionRef {
  id: number
  codigo_trazabilidad: string
  fecha: string
  tipo_material: TipoMaterialVivero
  estado_registro: string | null
  estado_operativo: 'ABIERTO' | 'CERRADO' | null
  saldo_actual: number | null
  unidad_canonica: UnidadMedidaVivero | null
}

export interface LoteViveroPlantaRef {
  id: number
  especie: string | null
  nombre_cientifico: string | null
  nombre_comun_principal: string | null
  variedad: string | null
  imagen_url: string | null
}

export interface LoteViveroResponsableRef {
  id: number
  nombre: string | null
  apellido: string | null
  username: string | null
  correo: string | null
}

export interface LoteViveroItem {
  id: number
  codigo_trazabilidad: string
  estado_lote: EstadoLoteVivero
  motivo_cierre: MotivoCierreVivero | null
  recoleccion_id: number
  planta_id: number | null
  vivero_id: number
  responsable_id: number | null
  nombre_cientifico_snapshot: string | null
  nombre_comercial_snapshot: string | null
  tipo_material_snapshot: TipoMaterialVivero | null
  variedad_snapshot: string | null
  nombre_comunidad_origen_snapshot: string | null
  nombre_responsable_snapshot: string | null
  fecha_inicio: string
  cantidad_inicial_en_proceso: number
  unidad_medida_inicial: UnidadMedidaVivero
  plantas_vivas_iniciales: number | null
  saldo_vivo_actual: number | null
  stock_vivo_actual: number | null
  subetapa_actual: SubetapaAdaptabilidad | null
  created_at: string
  updated_at: string
  vivero?: LoteViveroViveroRef | null
  recoleccion?: LoteViveroRecoleccionRef | null
  planta?: LoteViveroPlantaRef | null
  responsable?: LoteViveroResponsableRef | null
}

export interface ListLotesViveroQuery {
  page?: number
  limit?: number
  estado_lote?: EstadoLoteVivero
  vivero_id?: number
  recoleccion_id?: number
  lote_vivero_id?: number
  motivo_cierre?: MotivoCierreVivero
  fecha_inicio?: string
  fecha_fin?: string
  q?: string
}

export interface ListLotesViveroResponse {
  success: boolean
  data: LoteViveroItem[]
  pagination: ApiPagination
}

export interface UploadEvidenciasPendientesInput {
  fotos: File[]
  titulo?: string
  descripcion?: string
  metadata?: Record<string, unknown>
  tomado_en?: string
  es_principal?: boolean
}

export interface EvidenciaPendienteVivero {
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
  creado_por_usuario_id: number | null
  public_url: string | null
}

export interface UploadEvidenciasPendientesResponse {
  success: boolean
  data: EvidenciaPendienteVivero[]
  evidencia_ids: number[]
}

export interface CreateLoteViveroInput {
  recoleccion_id: number
  vivero_id: number
  fecha_inicio: string
  fecha_evento: string
  cantidad_inicial_en_proceso: number
  unidad_medida_inicial: UnidadMedidaVivero
  evidencia_ids: number[]
  observaciones?: string
}

export interface CreateLoteViveroResult {
  lote_vivero_id: number
  evento_inicio_id: number
  recoleccion_movimiento_id: number
  codigo_trazabilidad: string
  saldo_recoleccion_antes: number
  saldo_recoleccion_despues: number
  evidencia_inicio_ids: number[]
}

export interface CreateLoteViveroResponse {
  success: true
  data: CreateLoteViveroResult
}

// ─── Embolsado ───────────────────────────────────────────────────────────────

export interface EmbolsadoEventoExistente {
  id: number
  tipo_evento: 'EMBOLSADO'
  fecha_evento: string
  cantidad_afectada: number
  saldo_vivo_antes: number | null
  saldo_vivo_despues: number
  created_at: string
}

export interface EmbolsadoContextData {
  lote_id: number
  codigo_trazabilidad: string
  nombre_cientifico_snapshot: string
  nombre_comercial_snapshot: string
  tipo_material_snapshot: string
  cantidad_inicial_en_proceso: number
  unidad_medida_inicial: UnidadMedidaVivero
  fecha_inicio: string
  estado_lote: EstadoLoteVivero
  plantas_vivas_iniciales: number | null
  saldo_vivo_actual: number | null
  puede_registrar_embolsado: boolean
  motivo_bloqueo: string | null
  evento_embolsado_existente?: EmbolsadoEventoExistente
}

export interface EmbolsadoContextResponse {
  success: true
  data: EmbolsadoContextData
}

export interface RegistrarEmbolsadoRequest {
  fecha_evento: string
  plantas_vivas_iniciales: number
  evidencia_ids: number[]
  observaciones?: string
}

export interface RegistrarEmbolsadoResult {
  message: string
  evento_embolsado_id: number
  lote_vivero_id: number
  codigo_trazabilidad: string
  plantas_vivas_iniciales: number
  saldo_vivo_antes: number | null
  saldo_vivo_despues: number
  evidencia_ids_vinculadas: number[]
}

export interface RegistrarEmbolsadoResponse {
  success: true
  data: RegistrarEmbolsadoResult
}

export interface ObtenerEmbolsadoEvento {
  id: number
  tipo_evento: 'EMBOLSADO'
  fecha_evento: string
  cantidad_afectada: number
  unidad_medida_evento: 'UNIDAD'
  saldo_vivo_antes: number | null
  saldo_vivo_despues: number
  observaciones: string | null
  responsable_id: number
  created_at: string
}

export interface ObtenerEmbolsadoLoteRef {
  id: number
  codigo_trazabilidad: string
  plantas_vivas_iniciales: number | null
  saldo_vivo_actual: number | null
}

export interface ObtenerEmbolsadoEvidencia {
  id: number
  ruta_archivo: string
  mime_type: string
  tipo_archivo: string
  es_principal: boolean
  orden: number
  public_url: string
}

export type ObtenerEmbolsadoResponse =
  | { success: true; data: { registrado: true; evento: ObtenerEmbolsadoEvento; lote: ObtenerEmbolsadoLoteRef; evidencias: ObtenerEmbolsadoEvidencia[] } }
  | { success: true; data: { registrado: false; evento: null } }

export interface EvidenciasEmbolsadoItem {
  id: number
  codigo_trazabilidad: string
  entidad_id: number
  ruta_archivo: string
  tipo_archivo: string
}

export interface EvidenciasEmbolsadoResponse {
  success: true
  data: {
    evidencia_ids: number[]
    evidencias: EvidenciasEmbolsadoItem[]
  }
}

export interface UploadEvidenciasEmbolsadoInput {
  fotos: File[]
  titulo?: string
  descripcion?: string
  tomado_en?: string
  es_principal?: boolean
}
