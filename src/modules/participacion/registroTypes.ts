import type { ErrorEstable, PersonaMinima, PersonasLectura } from './types'

export type EspecieRegistro = { planta_id: string; cantidad: number }
export type AfiliacionRegistro = { tipo: 'ORGANIZACION_REGISTRADA'; organizacion_id: string } | { tipo: 'OTRA'; nombre: string }
export type RegistroInicialEntrada = {
  comando_id: string
  subcampania_id: string
  plan_revision_esperada: string
  fecha_plantacion: string
  latitud: number
  longitud: number
  especies: EspecieRegistro[]
  coresponsable_ids: string[]
  evidencia_ids: string[]
  observaciones?: string | null
  afiliaciones_declaradas?: { usuario_id: string; afiliacion: AfiliacionRegistro | null }[]
}
export type RegistroEntrada = RegistroInicialEntrada
export type RegistroIdentity = { actor_id: string; subcampania_id: string; comando_id: string; payload?: RegistroInicialEntrada }
export type IntentoRegistro = RegistroIdentity & { payload: RegistroInicialEntrada }
export type ContextoRegistro = {
  subcampania: { id: string; campania_id: string; nombre: string; campania_nombre: string; estado: 'ACTIVA'; plan_revision: string; meta_total_arboles: number; poligono: { type: 'Polygon'; coordinates: [number, number][][] } }
  actor: { usuario_id: string; fuente_autoridad: 'GLOBAL' | 'CONTEXTUAL' }
  disponibilidad: 'DISPONIBLE' | 'SIN_STOCK'
  especies: { planta_id: string; nombre: string; porcentaje_objetivo: number; cantidad_objetivo: number; saldo_elegible: number }[]
  reglas: { hoy_operativo: string; fecha_minima_ventana: string; fecha_maxima: string; zona_horaria: 'America/La_Paz'; ventana_retroactiva_dias: 10; fotos_min: 1; fotos_max: 10; exterior_permitido: true }
}
export type ContextoRegistroLectura = { data: ContextoRegistro; observado_en: string }
export type ParticipantesRegistroLectura = PersonasLectura
export type ParticipantesRegistroQuery = { q?: string; cursor?: string; limite?: number }
export type PreparacionRegistro = { comando_id: string; operacion: 'REGISTRAR_PLANTACION_INICIAL'; subcampania_id: string; estado: 'PREPARADO' }
export type PreparacionRegistroLectura = { data: PreparacionRegistro; observado_en: string }
export type CargaRegistro = { carga_id: string; estado: 'RESERVADA' | 'DISPONIBLE' | 'VINCULADA' | 'DESCARTE_PENDIENTE' | 'DESCARTADA'; evidencia_id: string | null; creado_en: string; expira_en: string | null }
export type CargaRegistroLectura = { data: CargaRegistro; observado_en: string }
export type CargasRegistroLectura = { data: CargaRegistro[]; observado_en: string }
export type PreviewRegistroLectura = { data: { url: string; expira_en: string }; observado_en: string }
export type PlantacionResultado = {
  tipo: 'PLANTACION_INICIAL'; registro_plantacion_id: string; codigo_trazabilidad: string; subcampania_id: string; responsable_id: string; fecha_plantacion: string
  cantidad_total_plantada: number; especies: EspecieRegistro[]; gps_dentro_poligono: boolean; gps_distancia_a_poligono_m: number | null; revision_inicial: '0'
}
type ReciboRegistroBase = { comando_id: string; operacion: 'REGISTRAR_PLANTACION_INICIAL'; finalizado_en: string }
export type ReciboRegistro = ReciboRegistroBase & (
  | { estado: 'CONFIRMADO'; resultado: PlantacionResultado; error: null }
  | { estado: 'RECHAZADO'; resultado: null; error: ErrorEstable }
)
export type PreparacionOReciboRegistro = PreparacionRegistroLectura | ReciboRegistro
export type ParticipanteSnapshotRegistro = {
  usuario_id: string; nombre_snapshot: string | null; afiliacion_snapshot: string | null
  afiliacion_estado: 'DECLARADA' | 'NO_DECLARADA' | 'HISTORICA_NO_DISPONIBLE'; afiliacion_tipo: 'ORGANIZACION_REGISTRADA' | 'OTRA' | null
  organizacion_id_snapshot: string | null; es_responsable: boolean
}
export type DetallePropioRegistro = {
  registro_plantacion_id: string; codigo_trazabilidad: string; subcampania_id: string; fecha_plantacion: string; revision_registro: string
  relaciones: ('AUTOR' | 'PARTICIPANTE')[]; cantidad_total_plantada: number; especies: EspecieRegistro[]; latitud: number; longitud: number; gps_dentro_poligono: boolean
  participantes: ParticipanteSnapshotRegistro[]; evidencia_ids: string[]; observaciones_autor: string | null
}
export type DetallePropioRegistroLectura = { data: DetallePropioRegistro; observado_en: string }
export type PersonaRegistro = PersonaMinima
