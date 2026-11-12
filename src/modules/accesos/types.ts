import type { ErrorEstable, RolGlobal } from '../participacion/types'

export type DominioAcceso = 'M1' | 'M2'
export type OperacionAcceso = 'OTORGAR_ACCESO_RECOLECCION' | 'RETIRAR_ACCESO_RECOLECCION' | 'OTORGAR_ACCESO_VIVERO' | 'RETIRAR_ACCESO_VIVERO'
export type HistorialAcceso = {
  id: string; vivero_id?: string; evento: 'ACCESO_OTORGADO' | 'ACCESO_RETIRADO'; acceso_id: string; actor_id: string
  revision_anterior: string; revision_nueva: string; motivo: string; creado_en: string; comando_id: string
  otorgado_en: string; revocado_en: string | null
}
type CuentaAcceso = {
  usuario_id: string; rol_global: RolGlobal; activo: boolean; revision_acceso: string; revision_autoridad: string
  historial: HistorialAcceso[]; siguiente_antes_de_id: string | null
}
export type AccesoM1 = CuentaAcceso & {
  acceso_explicito: boolean; acceso_efectivo: boolean; origen: 'ADMIN' | 'EXPLICITO' | 'SIN_ACCESO'
  capacidades: { crear: boolean; mantener_propias: boolean; confirmar_propias: false; desechar: boolean }
  vigencia_actual: { id: string; otorgado_en: string; otorgado_por: string } | null
}
export type CapacidadVivero = 'operar' | 'consultar_material' | 'desechar_semillas' | 'recibir_y_validar'
export type AccesoM2 = CuentaAcceso & {
  alcance_global: boolean
  viveros: { id: string; vivero_id: string; otorgado_en: string; otorgado_por: string; acceso_efectivo: boolean; capacidades: Record<CapacidadVivero, boolean> }[]
  capacidades_globales: { administrar: boolean; operar_cualquier_vivero: boolean; desechar_semillas_cualquier_vivero: boolean; recibir_y_validar_cualquier_vivero: boolean }
}
export type LecturaAcceso<T> = { data: T; observado_en: string }
export type AccesoEntrada = { comando_id: string; revision_esperada: string; motivo: string; vivero_id?: string }
export type IntentoAcceso = { actor_id: string; dominio: DominioAcceso; operacion: OperacionAcceso; usuario_id: string; payload: AccesoEntrada }
export type AccesoDraft = { usuario_id: string; otorgar: boolean; revision_esperada: string; motivo: string; vivero_id?: string }
export type ResultadoAcceso = {
  tipo: 'ACCESO_RECOLECCION' | 'ACCESO_VIVERO'; usuario_id: string; vivero_id?: string
  acceso_explicito_anterior: boolean; acceso_explicito_nuevo: boolean
  revision_anterior: string; revision_nueva: string; cambio: 'CAMBIO_APLICADO' | 'SIN_CAMBIOS'
}
export type ReciboAcceso = { comando_id: string; operacion: OperacionAcceso; finalizado_en: string } & (
  | { estado: 'CONFIRMADO'; resultado: ResultadoAcceso; error: null }
  | { estado: 'RECHAZADO'; resultado: null; error: ErrorEstable }
)
