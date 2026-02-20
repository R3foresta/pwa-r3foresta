export type FuenteUbicacion = 'GPS_MOVIL' | 'MAPA' | 'MANUAL' | 'LEGACY'

export interface UbicacionRutaItem {
  tipo: string
  nombre: string
}

export interface UbicacionApi {
  id: number
  nombre: string | null
  referencia: string | null
  coordenadas: {
    lat: number | null
    lon: number | null
    precision_m: number | null
    fuente: FuenteUbicacion | null
  }
  pais: {
    id: number | null
    codigo_iso2: string | null
    nombre: string | null
  } | null
  division: {
    id: number
    ruta: UbicacionRutaItem[]
  } | null
}

export interface UbicacionCreateInput {
  latitud: number
  longitud: number
  pais_id?: number
  division_id?: number
  nombre?: string
  referencia?: string
  precision_m?: number
  fuente?: FuenteUbicacion
}
