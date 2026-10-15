// DTO v1: BIGINT y revisiones se conservan como cadenas decimales exactas.
export type IdParticipacion = string
export type RevisionParticipacion = string
export type RolGlobal = 'ADMIN' | 'GENERAL' | 'VALIDADOR' | 'VOLUNTARIO'
export type PermisoContextual = 'PLANTADOR' | 'ADMINISTRADOR_SUBCAMPANIA'
export type EstadoAmbito = 'BORRADOR' | 'ACTIVA' | 'COMPLETADA' | 'FINALIZADA_PARCIAL' | 'PAUSADA' | 'CANCELADA'
export type OperacionSimple = 'OTORGAR_PLANTADOR' | 'RETIRAR_PLANTADOR' | 'DESIGNAR_ADMINISTRADOR' | 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR' | 'RETIRAR_ADMINISTRADOR'
export type OperacionAcceso = OperacionSimple | 'REEMPLAZAR_ADMINISTRADOR'
export type AccionBusqueda = 'OTORGAR_PLANTADOR' | 'DESIGNAR_ADMINISTRADOR' | 'REEMPLAZAR_ADMINISTRADOR'
export type Reintento = 'MISMA_CLAVE' | 'NUEVA_CONFIRMACION' | 'RECUPERAR_SESION' | 'NO_APLICA'

export type AccionesParticipacion = {
  preparar_registro: boolean
  registrar_inicial: boolean
  incorporar_plantador: boolean
  retirar_plantador: boolean
  designar_administrador: boolean
  cambiar_administrador: boolean
  retirar_administrador: boolean
  reemplazar_administrador: boolean
}
export type CapacidadSubcampania = {
  campania_id: IdParticipacion
  campania_nombre: string
  subcampania_id: IdParticipacion
  nombre: string
  estado: EstadoAmbito
  permiso_contextual: PermisoContextual | null
  revision_permiso: RevisionParticipacion
  fuente_autoridad: 'GLOBAL' | 'CONTEXTUAL'
  acciones: AccionesParticipacion
}
export type Capacidades = {
  actor: { usuario_id: IdParticipacion; rol_global: RolGlobal }
  capacidades_globales: { asignar_roles: boolean; designar_administradores: boolean; leer_plan: boolean }
  subcampanias: CapacidadSubcampania[]
}
export type LecturaPaginada<T> = { data: T; observado_en: string; siguiente_cursor: string | null }
export type CapacidadesLectura = LecturaPaginada<Capacidades>
export type PersonaMinima = { usuario_id: IdParticipacion; nombre: string; organizacion: string | null }
export type MiembroParticipacion = PersonaMinima & {
  permiso_contextual: PermisoContextual | null
  revision_permiso: RevisionParticipacion
  acceso_global: boolean
  etiqueta_acceso_global: 'Administrador · Acceso global' | null
  responsabilidad_logistica: 'COORDINADOR' | 'OPERARIO' | null
}
export type MiembrosLectura = LecturaPaginada<MiembroParticipacion[]>
export type PersonasLectura = LecturaPaginada<PersonaMinima[]>
export type OpcionesPagina = { cursor?: string; limite?: number }
export type OpcionesCapacidades = OpcionesPagina & { campania_id?: IdParticipacion }
export type BuscarEntrada = OpcionesPagina & {
  modo: 'NOMBRE' | 'CORREO_EXACTO'
  consulta: string
  accion: AccionBusqueda
  subcampania_ids: IdParticipacion[]
}
export type RevisarEntrada = { usuario_destino_id: IdParticipacion; subcampania_ids: IdParticipacion[] }
export type RevisionAmbito = {
  subcampania_id: IdParticipacion
  permiso_contextual: PermisoContextual | null
  revision_permiso: RevisionParticipacion
  acceso_global: boolean
}
export type RevisionLectura = { data: { usuario: PersonaMinima; ambitos: RevisionAmbito[] }; observado_en: string }
export type AmbitoRevision = { subcampania_id: IdParticipacion; revision_esperada: RevisionParticipacion }
export type AmbitoReemplazo = { subcampania_id: IdParticipacion; revision_saliente_esperada: RevisionParticipacion; revision_reemplazo_esperada: RevisionParticipacion }
export type AccesoEntrada = { comando_id: string; usuario_destino_id: IdParticipacion; ambitos: AmbitoRevision[] }
export type ReemplazoEntrada = {
  comando_id: string
  usuario_saliente_id: IdParticipacion
  usuario_reemplazo_id: IdParticipacion
  tratamiento_saliente: 'PLANTADOR' | 'SIN_ACCESO'
  ambitos: AmbitoReemplazo[]
}
// actor_id es metadato privado local: nunca se transmite al backend.
export type IntentoAcceso = { actor_id: IdParticipacion } & (
  | { operacion: OperacionSimple; payload: AccesoEntrada }
  | { operacion: 'REEMPLAZAR_ADMINISTRADOR'; payload: ReemplazoEntrada }
)
export type ErrorEstable = { codigo: string; mensaje: string; campos: string[]; ambitos: IdParticipacion[]; reintento: Reintento }
export type CambioUsuario = {
  usuario_id: IdParticipacion
  permiso_anterior: PermisoContextual | null
  permiso_nuevo: PermisoContextual | null
  revision_anterior: RevisionParticipacion
  revision_nueva: RevisionParticipacion
  cambio: 'CAMBIO_APLICADO' | 'SIN_CAMBIOS'
  conserva_acceso_global: boolean
}
export type AccesoResultado = { tipo: 'ACCESO'; cambios: { subcampania_id: IdParticipacion; usuarios: CambioUsuario[] }[] }
type BaseRecibo = { comando_id: string; operacion: OperacionAcceso; finalizado_en: string }
export type ReciboAcceso = BaseRecibo & (
  | { estado: 'CONFIRMADO'; resultado: AccesoResultado; error: null }
  | { estado: 'RECHAZADO'; resultado: null; error: ErrorEstable }
)
