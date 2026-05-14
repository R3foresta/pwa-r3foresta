export interface TipoPlantaCatalogo {
  id: number
  nombre: string
  created_at?: string
}

export interface PlantaCatalogo {
  id: number
  especie: string
  nombre_cientifico: string
  variedad: string
  nombre_comun_principal: string | null
  nombres_comunes?: string | null
  imagen_url?: string | null
  notas?: string | null
  tipo_planta_id: number
  tipo_planta?: string
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface PlantasPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ListPlantasResponse {
  success: boolean
  data: PlantaCatalogo[]
  pagination: PlantasPagination
}

export interface OnePlantaResponse {
  success: boolean
  data: PlantaCatalogo
}

export interface ListPlantasParams {
  q?: string
  page?: number
  limit?: number
  incluir_inactivas?: boolean
  tipo_planta_id?: number
}

/**
 * Input para crear/editar. `imagen` se envía como archivo (multipart) y los
 * demás campos como texto. Se enviarán solo los campos definidos.
 */
export interface PlantaFormInput {
  especie?: string
  nombre_cientifico?: string
  variedad?: string
  tipo_planta_id?: number
  nombre_comun_principal?: string
  nombres_comunes?: string
  notas?: string
  imagen?: File | null
  activo?: boolean
}
