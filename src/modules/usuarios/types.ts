import type { ErrorEstable, RolGlobal } from '../participacion/types'

export type { RolGlobal } from '../participacion/types'
export const ROLES_GLOBALES = ['ADMIN', 'GENERAL', 'VALIDADOR', 'VOLUNTARIO'] as const
export type AutoridadUsuario = {
  usuario_id: string
  nombre: string
  rol_global: RolGlobal
  activo: boolean
  revision_autoridad: string
}
export type UsuarioAdministracion = AutoridadUsuario & { username: string | null; activo: true }
export type OpcionesUsuarios = { consulta?: string; rol_global?: RolGlobal; cursor?: string; limite?: number }
export type UsuariosLectura = { data: UsuarioAdministracion[]; observado_en: string; siguiente_cursor: string | null }
export type AutoridadLectura = { data: AutoridadUsuario; observado_en: string }
export type RolesEntrada = { comando_id: string; rol_global: RolGlobal; revision_esperada: string; motivo: string }
// actor_id vincula el pendiente local a su cuenta; nunca se transmite en el body.
export type IntentoRol = { actor_id: string; operacion: 'CAMBIAR_ROL_GLOBAL'; usuario_id: string; payload: RolesEntrada }
export type RoleCommandDraft = { usuario_id: string; rol_global: RolGlobal; revision_esperada: string; motivo: string }
export type ResultadoRol = {
  tipo: 'ROL_GLOBAL'
  usuario_id: string
  rol_anterior: RolGlobal
  rol_nuevo: RolGlobal
  revision_anterior: string
  revision_nueva: string
  cambio: 'CAMBIO_APLICADO' | 'SIN_CAMBIOS'
}
type BaseRecibo = { comando_id: string; operacion: 'CAMBIAR_ROL_GLOBAL'; finalizado_en: string }
export type ReciboRol = BaseRecibo & (
  | { estado: 'CONFIRMADO'; resultado: ResultadoRol; error: null }
  | { estado: 'RECHAZADO'; resultado: null; error: ErrorEstable }
)
