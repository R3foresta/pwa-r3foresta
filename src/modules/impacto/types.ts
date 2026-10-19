/** Proyección INT05: IDs BIGINT decimales conservados como cadenas. */
export type ImpactoScope = { tipo: 'global' } | { tipo: 'campania' | 'subcampania'; id: string }
export type ImpactoQuery = {
  campania_id?: string
  subcampania_id?: string
  organizacion_id?: string
  planta_id?: string
  desde?: string
  hasta?: string
  cursor?: string
  limite?: number
}
export type MisRegistrosQuery = Pick<ImpactoQuery, 'cursor' | 'limite'>
export type ImpactoIndicadores = { plantacion_inicial: number; reposiciones: number; bajas_reportadas: number; registros: number }
export type ImpactoAfiliacion = {
  estado: 'DECLARADA' | 'NO_DECLARADA' | 'HISTORICA_NO_DISPONIBLE'
  tipo: 'ORGANIZACION_REGISTRADA' | 'OTRA' | null
  nombre: string | null
  organizacion_id: string | null
}
export type ImpactoPersona = { nombre: string | null; es_responsable: boolean; afiliacion: ImpactoAfiliacion }
export type ImpactoRegistro = {
  id: string
  codigo_trazabilidad: string
  campania_id: string
  subcampania_id: string
  campania_nombre: string
  subcampania_nombre: string
  fecha_plantacion: string
  cantidad_total_plantada: number
  es_reposicion: boolean
  registro_plantacion_origen_id: string | null
  latitud: number
  longitud: number
  gps_dentro_poligono: boolean
  especies: { planta_id: string; nombre: string | null; cantidad: number }[]
  personas: ImpactoPersona[]
  fotos: { id: string; url: string }[]
  seguimiento: {
    bajas_reportadas: number
    reposiciones_registradas: number
    bajas: { evento_id: string; fecha: string; cantidad: number }[]
    reposiciones: { registro_id: string; fecha: string; cantidad: number; url_publica: string }[]
  }
  organizaciones_campania: { id: string; nombre: string }[]
  url_publica: string
}
export type ImpactoCampania = { id: string; nombre: string; plantacion_inicial: number; url_publica: string }
export type ImpactoSubcampania = ImpactoIndicadores & {
  id: string
  campania_id: string
  nombre: string
  estado: 'ACTIVA' | 'COMPLETADA' | 'FINALIZADA_PARCIAL'
  zona: string | null
  poligono: { type: 'Polygon'; coordinates: [number, number][][] } | null
  meta_inicial: number
  faltantes: number
  avance_porcentaje: number | null
  url_publica: string
}
export type ImpactoPunto = {
  registro_id: string
  subcampania_id: string
  latitud: number
  longitud: number
  cantidad_total_plantada: number
  es_reposicion: boolean
  url_publica: string
}
export type ImpactoConsulta = {
  indicadores: ImpactoIndicadores
  campanias: ImpactoCampania[]
  subcampanias: ImpactoSubcampania[]
  mapa: ImpactoPunto[]
  registros: ImpactoRegistro[]
  siguiente_cursor: string | null
}
export type MisRegistro = {
  id: string
  subcampania_id: string
  fecha_plantacion: string
  codigo_trazabilidad: string
  cantidad_total_plantada: number
  es_reposicion: boolean
  relaciones: ('AUTOR' | 'PARTICIPANTE')[]
  url_publica: string | null
  url_detalle_propio: string
}
export type MisRegistros = { registros: MisRegistro[]; siguiente_cursor: string | null }
