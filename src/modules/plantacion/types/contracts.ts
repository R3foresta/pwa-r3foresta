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

export type ComposicionReservadaItem = {
  planta_id: number
  especie?: string | null
  nombre_cientifico?: string | null
  saldo_reservado: number
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
  composicion_reservada?: ComposicionReservadaItem[]
  updated_at?: string | null
}

export type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string | string[]
  error?: string
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
