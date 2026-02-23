export type Nivel = { id: number; nombre: string }

export type ComunidadCard = {
  id: number
  nombre: string
  pais: { id: number; nombre: string; codigo_iso2: string | null }
  nivel1?: Nivel
  nivel2?: Nivel
  nivel3?: Nivel
  nivel4?: Nivel
  activo: boolean
  nivel_actual: number
}

export type ApiListComunidades = {
  success: boolean
  data: ComunidadCard[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export type ApiOneComunidad = {
  success: boolean
  data: ComunidadCard | null
}

export type ListarComunidadesParams = {
  paisId: number | string
  q?: string
  page?: number
  limit?: number
  incluirInactivas?: boolean
}

export type CrearComunidadPayload = {
  pais_id: number | string
  municipio_id: number
  nombre: string
  activo?: boolean
}

export type ActualizarComunidadPayload = {
  nombre?: string
  municipio_id?: number
  activo?: boolean
}
