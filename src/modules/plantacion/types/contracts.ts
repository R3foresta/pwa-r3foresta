import type {
  ListOrganizacionesQuery,
  Organizacion,
  TipoOrganizacion,
} from '../../organizaciones/types'
import type { UsuarioResumen } from '../../../types/users'

export type TipoCampania = 'REFORESTACION' | 'ARBORIZACION' | 'FORESTACION'

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

export type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  message?: string | string[]
  error?: string
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
