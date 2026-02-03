const API_URL = import.meta.env.VITE_API_URL

export type LoteFaseViveroEstado =
  | 'INICIO'
  | 'EMBOLSADO'
  | 'SOMBRA'
  | 'LISTA_PLANTAR'
  | 'SALIDA_VIVERO'

export interface LoteFaseVivero {
  id: number
  planta_id?: number | null
  vivero_id?: number | null
  responsable_id?: number | null
  fecha_inicio?: string | null
  cantidad_inicio?: number | null
  cantidad_embolsadas?: number | null
  cantidad_sombra?: number | null
  cantidad_lista_plantar?: number | null
  fecha_embolsado?: string | null
  fecha_sombra?: string | null
  fecha_salida?: string | null
  altura_prom_sombra?: number | null
  altura_prom_salida?: number | null
  estado: LoteFaseViveroEstado
  codigo_trazabilidad?: string | null
  tipo_material?: 'SEMILLA' | 'ESQUEJE' | null
  planta?: {
    id: number
    especie?: string | null
    nombre_cientifico?: string | null
    variedad?: string | null
  }
  vivero?: {
    id: number
    codigo?: string | null
    nombre?: string | null
    ubicacion?: {
      departamento?: string | null
      comunidad?: string | null
    } | null
  }
  responsable?: {
    id: number
    nombre?: string | null
    username?: string | null
  }
}

export interface LoteFaseViveroFilters {
  estado?: LoteFaseViveroEstado
  vivero_id?: number
  planta_id?: number
  responsable_id?: number
  search?: string
  page?: number
  limit?: number
}

export interface LoteFaseViveroPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface CreateLoteFaseViveroDto {
  codigo_trazabilidad: string
  planta_id?: number | null
  vivero_id: number
  responsable_id?: number | null
  fecha_inicio: string
  cantidad_inicio: number
  estado?: LoteFaseViveroEstado
  tipo_material?: 'SEMILLA' | 'ESQUEJE'
  recolecciones?: number[]
  observaciones?: string
  fotos?: File[]
}

export class GerminacionService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken')
    const authId = localStorage.getItem('auth_id')
    const headers: HeadersInit = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (authId) {
      headers['x-auth-id'] = authId
    }

    return headers
  }

  static async list(
    filters?: LoteFaseViveroFilters,
  ): Promise<{ success: boolean; data: LoteFaseVivero[]; pagination: LoteFaseViveroPagination }> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString())
        }
      })
    }

    const query = params.toString()
    const url = `${API_URL}/api/lotes-fase-vivero${query ? `?${query}` : ''}`
    const response = await fetch(url, { headers: this.getAuthHeaders() })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Error al obtener lotes de germinacion')
    }

    return response.json()
  }

  static async getById(id: number): Promise<{ success: boolean; data: LoteFaseVivero }> {
    const response = await fetch(`${API_URL}/api/lotes-fase-vivero/${id}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Error al obtener lote de vivero')
    }

    return response.json()
  }

  static async create(
    data: CreateLoteFaseViveroDto,
  ): Promise<{ success: boolean; data: LoteFaseVivero }> {
    const formData = new FormData()

    formData.append('codigo_trazabilidad', data.codigo_trazabilidad)
    formData.append('vivero_id', String(data.vivero_id))
    formData.append('fecha_inicio', data.fecha_inicio)
    formData.append('cantidad_inicio', String(data.cantidad_inicio))
    formData.append('estado', data.estado ?? 'INICIO')

    if (data.planta_id) {
      formData.append('planta_id', String(data.planta_id))
    }

    if (data.responsable_id) {
      formData.append('responsable_id', String(data.responsable_id))
    }

    if (data.tipo_material) {
      formData.append('tipo_material', data.tipo_material)
    }

    if (data.observaciones) {
      formData.append('observaciones', data.observaciones)
    }

    if (data.recolecciones?.length) {
      data.recolecciones.forEach((id) => formData.append('recolecciones', String(id)))
    }

    if (data.fotos?.length) {
      data.fotos.forEach((file) => formData.append('fotos', file))
    }

    const response = await fetch(`${API_URL}/api/lotes-fase-vivero`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Error al crear lote de vivero')
    }

    return response.json()
  }
}
