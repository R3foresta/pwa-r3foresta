export type TipoEventoVivero =
  | 'INICIO'
  | 'EMBOLSADO'
  | 'DESCARTE_PRE_EMBOLSADO'
  | 'ADAPTABILIDAD'
  | 'MERMA'
  | 'DESPACHO'
  | 'CIERRE_AUTOMATICO'

export type EstadoLoteVivero = 'ACTIVO' | 'FINALIZADO'

export type SubetapaAdaptabilidad = 'SOMBRA' | 'MEDIA_SOMBRA' | 'SOL_DIRECTO'

export type TipoMaterialVivero = 'SEMILLA' | 'ESQUEJE'

export type UnidadMedidaVivero = 'UNIDAD' | 'G'

export type MotivoCierreVivero =
  | 'DESPACHO_TOTAL'
  | 'PERDIDA_TOTAL'
  | 'MIXTO'
  | 'DESCARTE_PRE_EMBOLSADO'

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
  /**
   * Total ya entregado físicamente a subcampañas (informativo). Antes se
   * llamaba `saldo_asignado_total` en el modelo de "reserva lógica".
   */
  saldo_asignado_subcampanias?: number
  cantidad_asignaciones_activas?: number
  /**
   * @deprecated Alias backend de `saldo_vivo_actual`. Backend lo mantiene por
   * compat con código viejo; cuando todo el front migre, podrá eliminarse.
   */
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
  subcampania_id?: number
}

export interface ListLotesViveroResponse {
  success: true
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

// Nota backend: en los endpoints de evidencias el campo `tipo_archivo` viene
// poblado con el MIME (p. ej. "image/jpeg"), no con un identificador propio.
// El nombre del campo es engañoso pero está fijado por contrato backend.
// Para clasificar visualmente conviene leer `mime_type` (mismo valor, nombre
// menos ambiguo).
//
// Campos hoy siempre poblados por backend pero declarados nullable a propósito,
// por defensa ante storage/firmas que pueden expirar o migraciones legacy:
//   tamano_bytes, titulo, creado_por_usuario_id, public_url.
// Si en el futuro se confirma que backend los garantiza forever, endurecer.
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
  success: true
  data: EvidenciaPendienteVivero[]
  evidencia_ids: number[]
}

export type EvidenciaEventoVivero =
  | 'EMBOLSADO'
  | 'DESCARTE_PRE_EMBOLSADO'
  | 'ADAPTABILIDAD'
  | 'MERMA'
  | 'DESPACHO'

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
  // Nota backend: en evidencias de eventos, `tipo_archivo` también trae el MIME
  // (p. ej. "image/jpeg"). Mismo idiom que EvidenciaPendienteVivero.
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
  | 'OTRO'

export type CausaDescartePreEmbolsado =
  | 'NO_GERMINACION'
  | 'NO_ENRAIZAMIENTO'
  | 'CONTAMINACION'
  | 'PERDIDA_TOTAL_MATERIAL'
  | 'MATERIAL_NO_VIABLE'
  | 'DANO_PRE_EMBOLSADO'
  | 'OTRO'

// Destinos válidos para NUEVOS despachos manuales (MVP VIV): solo salidas fuera
// de campaña. `DONACION` reemplaza al viejo `DONACION_COMUNIDAD`, que nunca fue
// un valor válido del contrato backend (la comunidad es un dato aparte). La UI
// de despacho solo debe ofrecer estas tres opciones.
export type DestinoTipoDespachoManual = 'DONACION' | 'VENTA' | 'OTRO'

// Unión amplia para LEER el destino de eventos DESPACHO ya existentes (p. ej.
// `EventoSnapshot.destino_tipo`). Suma destinos antiguos que pueden aparecer en
// el historial pero que ya no se ofrecen como opción nueva. No se ocultan ni
// alteran esos eventos históricos: solo se tipan para poder leerlos.
export type DestinoTipoVivero =
  | DestinoTipoDespachoManual
  | 'PLANTACION_PROPIA'
  | 'PLANTACION_COMUNIDAD'
  | 'PLANTACION_CAMPANIA'

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

export interface RegistrarDescartePreEmbolsadoRequest {
  fecha_evento: string
  cantidad_material_afectado: number
  unidad_medida_evento: UnidadMedidaVivero
  causa_descarte_pre_embolsado: CausaDescartePreEmbolsado
  evidencia_ids: number[]
  observaciones?: string
}

export type PropositoAsignacionVivero = 'PLANTACION_INICIAL' | 'REPOSICION'

// Modelo de asignación física (M2↔M3): asignar = ENTREGAR plantas. El backend
// nuevo rechaza el shape viejo (falta `evidencia_ids` → 422), por eso `proposito`,
// `fecha_asignacion` y `evidencia_ids` son obligatorios.
export interface CrearAsignacionViveroRequest {
  subcampania_id: number
  cantidad_asignada: number
  proposito: PropositoAsignacionVivero
  /** Fecha de la entrega física (ISO `yyyy-mm-dd`). */
  fecha_asignacion: string
  /** IDs de evidencia previamente subida vía evidencias-pendientes (mínimo 1). */
  evidencia_ids: number[]
}

// CONFIRMADO(backend 2026-07-07): en la respuesta de asignación, Nest normaliza
// `lote_finalizado` siempre a boolean y además incluye `motivo_cierre`
// (vivero-asignaciones.service.ts:202). En devolución, `lote_reabierto` también
// viene siempre como boolean (vivero-asignaciones.service.ts:412). Igual se
// parsea defensivo por si cambia. `saldo_vivo_actual` se lee cuando esté.
export interface CrearAsignacionViveroResponseData {
  id: number
  subcampania_id: number
  cantidad_asignada: number
  proposito: PropositoAsignacionVivero
  fecha_asignacion: string
  saldo_asignado_disponible?: number | null
  /** Saldo vivo del lote DESPUÉS de la entrega (baja en el momento). */
  saldo_vivo_actual?: number | null
  /** true si la entrega total dejó el lote en 0 y backend lo FINALIZÓ. */
  lote_finalizado: boolean
  /** Motivo de cierre cuando `lote_finalizado` es true (útil para VIV-04). */
  motivo_cierre?: MotivoCierreVivero | null
}

export interface CrearAsignacionViveroResponse {
  success: true
  data: CrearAsignacionViveroResponseData
}

export interface DevolucionAsignacionRequest {
  cantidad_devuelta: number
  motivo_devolucion: string
  /** Fecha de la devolución física (ISO `yyyy-mm-dd`). */
  fecha_devolucion: string
}

export interface DevolverAsignacionViveroResponseData {
  id: number
  cantidad_devuelta: number
  saldo_asignado_disponible?: number | null
  /** Saldo vivo del lote DESPUÉS de la devolución (sube en el momento). */
  saldo_vivo_actual?: number | null
  /** true si la devolución reabrió un lote que estaba FINALIZADO. */
  lote_reabierto: boolean
}

export interface DevolverAsignacionViveroResponse {
  success: true
  data: DevolverAsignacionViveroResponseData
}

// Despacho manual activo: exige evidencia y descuenta el saldo físico actual
// del lote. No se vincula a campaña/subcampaña; el destino se expresa mediante
// `destino_tipo`, comunidad cuando aplica y/o una referencia estructurada.
export interface RegistrarDespachoRequest {
  fecha_evento: string
  cantidad_afectada: number
  destino_tipo: DestinoTipoDespachoManual
  destino_referencia: string
  evidencia_ids: number[]
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

export interface RegistrarDescartePreEmbolsadoResponse {
  success: true
  data: {
    message: string
    evento_descarte_pre_embolsado_id: number
    evento_cierre_id: number
    lote_vivero_id: number
    codigo_trazabilidad: string
    cantidad_material_afectado: number
    unidad_medida_evento: UnidadMedidaVivero
    causa_descarte_pre_embolsado: CausaDescartePreEmbolsado
    evidencia_ids_vinculadas: number[]
    lote_finalizado: true
    motivo_cierre: 'DESCARTE_PRE_EMBOLSADO'
  }
}

export interface TimelineEventDto {
  id: number;
  tipo_evento: string;
  label?: string;
  fecha_evento?: string;
  observaciones?: string;
  responsable_nombre?: string;
  payload?: Record<string, unknown>;
  evidencias?: EvidenciaDto[];
}

export interface EvidenciaDto {
  id: number;
  public_url: string;
  titulo: string;
  tomado_en?: string;
}

// ─── Detalle de lote (GET /api/lotes-vivero/:id) ─────────────────────────────
//
// Endpoint dedicado de detalle: superset del shape de list + un mapa
// `ultimo_evento_por_tipo` con el último evento registrado de cada tipo.
// Reemplaza el patrón N+1 calls que antes hacía falta para conocer la fecha
// de embolsado (y elimina la race condition entre el mount del form y la
// resolución de ese segundo GET).
//
// Solo trae el ÚLTIMO evento por tipo y SIN evidencias. Para historial
// completo o evidencias hay endpoints dedicados (ver bloque siguiente).

export interface EventoSnapshot {
  id: number
  fecha_evento: string
  created_at: string
  responsable_id: number
  cantidad_afectada: number | null
  unidad_medida_evento: UnidadMedidaVivero | null
  saldo_vivo_antes: number | null
  saldo_vivo_despues: number | null
  subetapa_destino: SubetapaAdaptabilidad | null
  causa_merma: CausaMermaVivero | null
  causa_descarte_pre_embolsado: CausaDescartePreEmbolsado | null
  destino_tipo: DestinoTipoVivero | null
  destino_referencia: string | null
  motivo_cierre_calculado: MotivoCierreVivero | null
}

export type UltimoEventoPorTipo = Record<TipoEventoVivero, EventoSnapshot | null>

export interface LoteViveroDetalle extends LoteViveroItem {
  ultimo_evento_por_tipo: UltimoEventoPorTipo
}

export interface LoteViveroDetalleResponse {
  success: true
  data: LoteViveroDetalle
}

// ─── Timeline cronológico (GET /api/lotes-vivero/:id/timeline) ───────────────
//
// Endpoint unificado de auditoría (RF-VIV-07): devuelve todos los eventos del
// lote ordenados ASC por (fecha_evento, created_at, id), con responsable_nombre
// embebido y `payload` discriminado por tipo (solo trae los campos que aplican
// al evento, no `null` everywhere como hace `ultimo_evento_por_tipo`).
//
// Acepta filtros opcionales por query string: `tipo_evento`, `responsable_id`,
// `fecha_inicio`, `fecha_fin`. No paginado — backend devuelve todo el historial.
//
// El detalle del lote consume el timeline unificado para representar todos los
// eventos. La variante tipada de ADAPTABILIDAD se mantiene para el historial
// filtrado específico de esa etapa.

export interface LoteTimelineQuery {
  tipo_evento?: TipoEventoVivero
  responsable_id?: number
  fecha_inicio?: string
  fecha_fin?: string
}

export interface LoteTimelinePayloadAdaptabilidad {
  tipo: 'ADAPTABILIDAD'
  subetapa_destino: SubetapaAdaptabilidad
  saldo_vivo_antes: number | null
  saldo_vivo_despues: number | null
}

// Estas variantes pueden agregarse si una pantalla necesita payloads
// discriminados por tipo. El timeline general ya se consume mediante
// `TimelineEventDto` y no requiere tipar variantes que la UI no usa:
//   - LoteTimelinePayloadInicio
//   - LoteTimelinePayloadEmbolsado
//   - LoteTimelinePayloadMerma
//   - LoteTimelinePayloadDespacho
//   - LoteTimelinePayloadCierreAutomatico

/**
 * Variante del evento del timeline filtrada por `tipo_evento=ADAPTABILIDAD`.
 * Como el filtro garantiza el tipo, el campo `tipo_evento` queda discriminado
 * en la propia interface. El `payload` adentro mantiene su propio discriminator
 * (`payload.tipo`) por consistencia con la forma que devuelve el backend.
 *
 * `responsable_nombre` viene como "Nombre Apellido" ya armado; nullable como
 * red de seguridad si el usuario responsable fue eliminado.
 */
export interface LoteTimelineEventoAdaptabilidad {
  id: number
  lote_vivero_id: number
  tipo_evento: 'ADAPTABILIDAD'
  fecha_evento: string
  created_at: string
  responsable_id: number
  responsable_nombre: string | null
  observaciones: string | null
  payload: LoteTimelinePayloadAdaptabilidad
  evidencias: ObtenerEmbolsadoEvidencia[]
}

export interface LoteTimelineAdaptabilidadResponse {
  success: true
  data: {
    lote_id: number
    codigo_trazabilidad: string
    estado_lote: EstadoLoteVivero
    total_eventos: number
    eventos: LoteTimelineEventoAdaptabilidad[]
  }
}
