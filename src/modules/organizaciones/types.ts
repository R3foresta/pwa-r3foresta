export type TipoOrganizacion =
  | 'ONG'
  | 'EMPRESA_PRIVADA'
  | 'EMPRESA_PUBLICA'
  | 'FUNDACION'
  | 'ETFs'
  | 'ALCALDIA'
  | 'ASOCIACION_CIUDADANA'
  | 'OTRO'

export type Organizacion = {
  id: number
  nombre: string
  tipo: TipoOrganizacion
  activo: boolean
  logo_url?: string | null
  created_at: string
  updated_at: string
}

export type OrganizacionesPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ListOrganizacionesQuery = {
  activo?: boolean
  tipo?: TipoOrganizacion
}

export type ListarOrganizacionesParams = ListOrganizacionesQuery & {
  q?: string
  page?: number
  limit?: number
  incluirInactivas?: boolean
}

export type ListOrganizacionesResponse = {
  success: boolean
  data: Organizacion[]
  pagination?: OrganizacionesPagination
}

export type OneOrganizacionResponse = {
  success: boolean
  data: Organizacion | null
}

export type LogoOrganizacionResponse = {
  success: boolean
  data: {
    id: number
    logo_url: string | null
    updated_at: string
  } | null
}

export type OrganizacionFormInput = {
  nombre: string
  tipo: TipoOrganizacion
  activo?: boolean
  logo?: File | null
  removeLogo?: boolean
}

export type OrganizacionDataInput = {
  nombre: string
  tipo: TipoOrganizacion
  activo?: boolean
}

export const TIPOS_ORGANIZACION = [
  'ONG',
  'EMPRESA_PRIVADA',
  'EMPRESA_PUBLICA',
  'FUNDACION',
  'ETFs',
  'ALCALDIA',
  'ASOCIACION_CIUDADANA',
  'OTRO',
] as const satisfies readonly TipoOrganizacion[]

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
