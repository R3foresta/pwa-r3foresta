import type {
  ListOrganizacionesQuery,
  Organizacion,
  TipoOrganizacion,
} from '../../organizaciones/types'
import type { UsuarioResumen } from '../../../types/users'

export type TipoCampania = 'REFORESTACION' | 'ARBORIZACION' | 'FORESTACION'

export type GeoJsonPosition = [longitud: number, latitud: number]

export type GeoJsonPolygon = {
  type: 'Polygon'
  coordinates: GeoJsonPosition[][]
}

export type {
  ListOrganizacionesQuery,
  Organizacion,
  TipoOrganizacion,
}
export { TIPO_ORGANIZACION_LABEL } from '../../organizaciones/types'

export type Campania = {
  id: number
  nombre: string
  tipo: TipoCampania
  codigo_trazabilidad: string
  descripcion?: string | null
  fecha_estimada_inicio?: string | null
  fecha_estimada_fin?: string | null
  organizaciones?: Organizacion[]
  organizacion_ids?: number[]
  estado_derivado?: string | null
  count_subcampanias?: number | null
  subcampanias_activas_count?: number | null
  activas_count?: number | null
  avance_pct?: number | null
  borradores_count?: number | null
  zonas_count?: number | null
  zonas?: string[]
  meta_arboles?: number | null
  meta_planificada_campania?: number | null
  arboles_plantados?: number | null
  hectareas?: number | null
  supervivencia_pct?: number | null
  co2_proyectado_ton?: number | null
  coordinador?: UsuarioResumen | null
  coordinador_id?: number | null
  coordinador_nombre?: string | null
  created_at: string
  updated_at: string
}

export type CreateCampaniaInput = {
  nombre: string
  tipo: TipoCampania
  descripcion?: string
  fecha_estimada_inicio?: string
  fecha_estimada_fin?: string
  organizacion_ids?: number[]
}

export type UpdateCampaniaInput = {
  nombre?: string
  tipo?: TipoCampania
  descripcion?: string
  fecha_estimada_inicio?: string
  fecha_estimada_fin?: string
}

export type DeleteCampaniaData = {
  message?: string
  id: number
}

export type SetCampaniaOrganizacionesInput = {
  organizacion_ids: number[]
}

export type SetSubcampaniaPoligonoInput = {
  poligono: GeoJsonPolygon
}

export type SetSubcampaniaPoligonoData = {
  id: number
  area_hectareas?: number | null
  poligono?: GeoJsonPolygon | null
  updated_at?: string | null
}

export type EstadoSubcampania =
  | 'BORRADOR'
  | 'ACTIVA'
  | 'COMPLETADA'
  | 'FINALIZADA_PARCIAL'
  | 'PAUSADA'
  | 'CANCELADA'

export type FaseMantenimientoSubcampania =
  | 'NO_APLICA'
  | 'MANTENIMIENTO_ACTIVO'
  | 'MONITOREO_HISTORICO'

export type RolEnSubcampania = 'COORDINADOR' | 'OPERARIO'

export type CreateSubcampaniaInput = {
  campania_id: number
  nombre: string
  zona_id: number
  meta_total_arboles: number
  descripcion?: string
  fecha_estimada_inicio?: string
  fecha_estimada_fin?: string
  tolerancia_gps_metros?: number
}

export type UpdateSubcampaniaInput = {
  nombre?: string
  descripcion?: string
  zona_id?: number
  meta_total_arboles?: number
  fecha_estimada_inicio?: string
  fecha_estimada_fin?: string
  tolerancia_gps_metros?: number
}

export type Subcampania = {
  id: number
  campania_id: number
  nombre: string
  descripcion?: string | null
  tipo?: TipoCampania
  zona_id: number
  zona_nombre?: string | null
  meta_total_arboles: number
  fecha_estimada_inicio?: string | null
  fecha_estimada_fin?: string | null
  tolerancia_gps_metros?: number | null
  estado: EstadoSubcampania
  fase_mantenimiento?: FaseMantenimientoSubcampania | null
  poligono?: GeoJsonPolygon | null
  area_hectareas?: number | null
  saldo_vivo_actual?: number | null
  total_plantado_inicial?: number | null
  total_repuesto?: number | null
  total_muerto_acumulado?: number | null
  plantados?: number | null
  avance_pct?: number | null
  has_plan_especies?: boolean | null
  personas_count?: number | null
  lotes_count?: number | null
  eventos_count?: number | null
  codigo_trazabilidad?: string | null
  equipo?: EquipoMember[]
  coordinador?: { id: number; nombre: string } | null
  created_at: string
  updated_at?: string | null
}

export type EquipoMemberInput = {
  usuario_id: number
  rol: RolEnSubcampania
}

export type EquipoMember = {
  id: number
  usuario_id: number
  nombre_usuario?: string | null
  rol: RolEnSubcampania
  agregado_at?: string | null
  foto_perfil_url?: string | null
}

export type SetEquipoData = {
  message?: string
  miembros: EquipoMember[]
}

export type ComposicionAsignadaItem = {
  planta_id: number
  especie?: string | null
  nombre_cientifico?: string | null
  saldo_asignado_disponible: number
}

export type PlanEspecieMetaInput = {
  planta_id: number
  porcentaje_objetivo: number
  cantidad_objetivo: number
}

export type PlanEspecieMeta = PlanEspecieMetaInput & {
  planta?: {
    id: number
    especie?: string | null
    nombre_cientifico?: string | null
  } | null
}

export type GetPlanData = {
  subcampania_id: number
  estado: EstadoSubcampania
  meta_total_arboles: number
  metas: PlanEspecieMeta[]
}

export type PutPlanInput = {
  metas: PlanEspecieMetaInput[]
}

export type PutPlanData = {
  message?: string
  subcampania_id: number
  metas: PlanEspecieMetaInput[]
}

export type CancelarSubcampaniaInput = {
  motivo: string
}

export type CancelarSubcampaniaData = {
  message?: string
  id: number
  estado: EstadoSubcampania
  deleted_at?: string | null
  deleted_by?: number | null
  motivo?: string | null
}

export type ActivarSubcampaniaData = {
  message?: string
  id: number
  estado: EstadoSubcampania
  nombre_zona_snapshot?: string | null
  nombre_coordinador_snapshot?: string | null
  nombres_organizaciones_snapshot?: string[]
  composicion_asignada?: ComposicionAsignadaItem[]
  updated_at?: string | null
}

export type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string | string[]
  error?: string
}

// ---------------------------------------------------------------------------
// Registro de plantación inicial (PLT-EPIC-01)
// Contratos de `GET /subcampanias/:id/plantacion/context`,
// `POST/DELETE /registros-plantacion/evidencias-pendientes` y
// `POST /registros-plantacion`.
// ---------------------------------------------------------------------------

export type PlantacionContextSubcampania = {
  id: number
  codigo_trazabilidad?: string | null
  nombre: string
  estado: EstadoSubcampania
  fase_mantenimiento?: FaseMantenimientoSubcampania | null
  campania_id: number
  campania_nombre?: string | null
  zona_id?: number | null
  zona_nombre?: string | null
  meta_total_arboles: number
  total_plantado_inicial?: number | null
  tolerancia_gps_metros?: number | null
  poligono?: GeoJsonPolygon | null
}

export type PlantacionContextUsuario = {
  id: number
  nombre?: string | null
  rol_global?: string | null
  rol_en_subcampania?: RolEnSubcampania | null
  puede_registrar: boolean
  motivo_bloqueo?: string | null
}

export type PlantacionContextEquipoMember = {
  usuario_id: number
  nombre_usuario?: string | null
  rol: RolEnSubcampania
}

export type PlanEspecieContext = {
  planta_id: number
  nombre_comun_principal?: string | null
  nombre_cientifico?: string | null
  cantidad_objetivo: number
  plantado_inicial: number
  pendiente_meta: number
}

export type AsignacionDisponible = {
  asignacion_id: number
  lote_vivero_id: number
  codigo_lote?: string | null
  vivero_nombre?: string | null
  fecha_asignacion: string
  cantidad_asignada?: number | null
  cantidad_consumida?: number | null
  cantidad_devuelta?: number | null
  cantidad_mermada?: number | null
  saldo_asignado_disponible: number
  orden_consumo?: number | null
}

export type StockEspecieContext = {
  planta_id: number
  nombre_comun_principal?: string | null
  nombre_cientifico?: string | null
  stock_asignado_disponible: number
  asignaciones: AsignacionDisponible[]
}

export type ReglasPlantacion = {
  max_dias_retroactivos?: number | null
  gps_fuera_poligono_bloquea?: boolean | null
  precision_gps_advertencia_m?: number | null
  requiere_evidencia?: boolean | null
  min_fotos?: number | null
  max_fotos?: number | null
  permite_exceder_meta_especie?: boolean | null
  orden_consumo_asignaciones?: string | null
}

export type PlantacionContext = {
  subcampania: PlantacionContextSubcampania
  usuario: PlantacionContextUsuario
  equipo: PlantacionContextEquipoMember[]
  plan_por_especie: PlanEspecieContext[]
  stock_por_especie: StockEspecieContext[]
  reglas: ReglasPlantacion
}

export type UploadEvidenciasPlantacionInput = {
  fotos: File[]
  titulo?: string
  descripcion?: string
  metadata?: Record<string, unknown>
  tomado_en?: string
  es_principal?: boolean
}

// El backend puede devolver los IDs como `evidencia_ids` top-level (idiom
// lotes-vivero/evidencias-pendientes), dentro de `data.evidencia_ids`, o como
// `data[]` de evidencias con `id`. El servicio normaliza a esta forma.
export type UploadEvidenciasPlantacionData = {
  evidencia_ids: number[]
}

export type DescartarEvidenciasData = {
  evidencia_ids_descartadas: number[]
  evidencia_ids_ignoradas: number[]
}

export type PlantacionDetalleInput = {
  asignacion_id: number
  lote_vivero_id: number
  planta_id: number
  cantidad: number
}

export type CreateRegistroPlantacionInput = {
  subcampania_id: number
  es_reposicion?: boolean
  fecha_plantacion: string
  latitud: number
  longitud: number
  observaciones?: string
  coresponsable_ids?: number[]
  detalles: PlantacionDetalleInput[]
  evidencia_ids: number[]
}

export type ConsumoAsignacion = {
  asignacion_id: number
  lote_vivero_id: number
  cantidad_consumida: number
  saldo_asignado_antes: number
  saldo_asignado_despues: number
  estado_final: 'ACTIVA' | 'AGOTADA' | null
}

export type RegistroPlantacionData = {
  message?: string
  registro_plantacion_id: number
  codigo_trazabilidad: string
  cantidad_total_plantada: number
  gps_dentro_poligono?: boolean | null
  gps_distancia_a_poligono_m?: number | null
  consumos?: ConsumoAsignacion[]
  coresponsable_ids_vinculados?: number[]
  evidencia_ids_vinculadas?: number[]
}

export type CampaniaMetricsUltimaActividad = {
  autor: string
  detalle: string
  timestamp: string
}

export type CampaniaMetrics = {
  supervivencia_pct: number
  co2_proyectado_ton: number
  hectareas: number
  comunidades_count: number
  eventos_count: number
  ultima_actividad: CampaniaMetricsUltimaActividad | null
}

export type CampaniaActivityTipo =
  | 'plantacion'
  | 'nueva_subcampana'
  | 'activacion'
  | 'cancelacion'
  | 'cambio_coordinador'

export type CampaniaActivityItem = {
  id: string
  tipo: CampaniaActivityTipo
  autor: string
  detalle: string
  ubicacion: string
  timestamp: string
}

export const TIPO_CAMPANIA_VALUES: TipoCampania[] = [
  'REFORESTACION',
  'ARBORIZACION',
  'FORESTACION',
]

export const TIPO_CAMPANIA_LABEL: Record<TipoCampania, string> = {
  REFORESTACION: 'Reforestación',
  ARBORIZACION: 'Arborización',
  FORESTACION: 'Forestación',
}

export const TIPO_CAMPANIA_DESCRIPTION: Record<TipoCampania, string> = {
  REFORESTACION: 'Plantar en zona natural',
  ARBORIZACION: 'Plantar en zona urbana',
  FORESTACION: 'Plantar y crear cobertura forestal',
}
