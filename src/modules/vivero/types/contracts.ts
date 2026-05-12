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

export type EstadoRegistroRecoleccion =
  | 'BORRADOR'
  | 'PENDIENTE_VALIDACION'
  | 'VALIDADO'
  | 'RECHAZADO'

export type EstadoOperativoRecoleccion = 'ABIERTO' | 'CERRADO'

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
  estado_registro: EstadoRegistroRecoleccion
  estado_operativo: EstadoOperativoRecoleccion
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
  planta_id: number
  vivero_id: number
  responsable_id: number
  nombre_cientifico_snapshot: string
  nombre_comercial_snapshot: string
  tipo_material_snapshot: TipoMaterialVivero
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
  vivero: LoteViveroViveroRef | null
  recoleccion: LoteViveroRecoleccionRef | null
  planta: LoteViveroPlantaRef | null
  responsable: LoteViveroResponsableRef | null
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

export type EvidenciaEventoVivero = 'EMBOLSADO' | 'ADAPTABILIDAD' | 'MERMA'

export interface UploadEvidenciasEventoInput {
  fotos: File[]
  titulo?: string
  descripcion?: string
  tomado_en?: string
  es_principal?: boolean
  metadata?: Record<string, unknown>
}

export interface EvidenciaEventoViveroItem {
  id: number
  codigo_trazabilidad: string
  entidad_id: number
  ruta_archivo: string
  tipo_archivo: string
}

export interface UploadEvidenciasEventoResponse {
  success: true
  data: {
    evidencia_ids: number[]
    evidencias: EvidenciaEventoViveroItem[]
  }
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
  tipo_material_snapshot: TipoMaterialVivero
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

// ─── Adaptabilidad / Merma / Despacho ──────────────────────────────────────────

export type CausaMermaVivero =
  | 'PLAGA'
  | 'ENFERMEDAD'
  | 'SEQUIA'
  | 'DANO_FISICO'
  | 'MUERTE_NATURAL'
  | 'DESCARTE_CALIDAD'
  | 'OTRO'

export type DestinoTipoVivero =
  | 'PLANTACION_PROPIA'
  | 'DONACION_COMUNIDAD'
  | 'VENTA'
  | 'OTRO'

export interface RegistrarAdaptabilidadRequest {
  fecha_evento: string
  subetapa_destino: SubetapaAdaptabilidad
  observaciones?: string
  evidencia_ids?: number[]
}

export interface RegistrarMermaRequest {
  evidencia_ids: number[]
  fecha_evento: string
  cantidad_afectada: number
  causa_merma: CausaMermaVivero
  observaciones?: string
}

// TODO(backend-anomalía): según RF-VIV-05, el despacho exige al menos una
// evidencia obligatoria. El contrato actual NO incluye `evidencia_ids`.
// Confirmar con backend: ¿es olvido o decisión consciente?
// Si se agrega, será `evidencia_ids: number[]` (obligatorio, mínimo 1).
export interface RegistrarDespachoRequest {
  fecha_evento: string
  cantidad_afectada: number
  destino_tipo: DestinoTipoVivero
  destino_referencia: string
  comunidad_destino_id?: number
  observaciones?: string
}

export interface RegistrarAdaptabilidadResponse {
  success: true
  message: string
  data: {
    evento_adaptabilidad_id: number
    lote_vivero_id: number
    codigo_trazabilidad: string
    subetapa_destino: SubetapaAdaptabilidad
    saldo_vivo_actual: number
    evidencia_ids_vinculadas: number[]
  }
}

export interface RegistrarMermaResponse {
  success: true
  data: {
    message: string
    evento_merma_id: number
    lote_vivero_id: number
    codigo_trazabilidad: string
    cantidad_perdida: number
    causa_merma: CausaMermaVivero
    saldo_vivo_antes: number
    saldo_vivo_despues: number
    evidencia_ids_vinculadas: number[]
    lote_finalizado: boolean
    motivo_cierre: MotivoCierreVivero | null
  }
}

// TODO(backend-pendiente): falta definir RegistrarDespachoResponse en el
// contrato (existen RegistrarMermaResponse y RegistrarAdaptabilidadResponse).
// Mientras tanto, LotesViveroService.registrarDespacho retorna `unknown`.
