export type UsuarioRol = 'ADMIN' | 'GENERAL' | 'VALIDADOR' | 'VOLUNTARIO'

export type UsuarioResumen = {
  id: number
  nombre: string
  rol: UsuarioRol | string
  apellido?: string | null
  username?: string | null
  correo?: string | null
  auth_id?: string | null
  foto_perfil_url?: string | null
}
