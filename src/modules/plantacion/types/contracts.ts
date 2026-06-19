export type TipoCampania = 'REFORESTACION' | 'ARBORIZACION' | 'FORESTACION'

export type TipoOrganizacion =
  | 'ONG'
  | 'EMPRESA_PRIVADA'
  | 'EMPRESA_PUBLICA'
  | 'FUNDACION'
  | 'ETFs'
  | 'ALCALDIA'
  | 'ASOCIACION_CIUDADANA'
  | 'OTRO'

export type Campania = {
  id: number
  nombre: string
  tipo: TipoCampania
  codigo_trazabilidad: string
  descripcion?: string | null
  fecha_estimada_inicio?: string | null
  fecha_estimada_fin?: string | null
  created_at: string
  updated_at: string
}

export type Organizacion = {
  id: number
  nombre: string
  tipo: TipoOrganizacion
  activo: boolean
  logo_url?: string | null
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

export type ListOrganizacionesQuery = {
  activo?: boolean
  tipo?: TipoOrganizacion
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

export const TIPO_ORGANIZACION_LABEL: Record<TipoOrganizacion, string> = {
  ONG: 'ONG',
  EMPRESA_PRIVADA: 'Empresa privada',
  EMPRESA_PUBLICA: 'Empresa pública',
  FUNDACION: 'Fundación',
  ETFs: 'ETF',
  ALCALDIA: 'Alcaldía',
  ASOCIACION_CIUDADANA: 'Asociación ciudadana',
  OTRO: 'Otro',
}
