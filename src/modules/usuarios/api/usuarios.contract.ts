import { ParticipacionContratoError, validarErrorEstable, validarId, validarPagina, validarRevision } from '../../participacion/api/participacion.contract'
import { ROLES_GLOBALES } from '../types'
import type { AutoridadLectura, AutoridadUsuario, IntentoRol, OpcionesUsuarios, ReciboRol, RolGlobal, UsuarioAdministracion, UsuariosLectura } from '../types'

export class UsuariosContratoError extends ParticipacionContratoError {
  constructor() {
    super('La respuesta del servidor no corresponde a la gestión de roles. El resultado no está confirmado.')
    this.name = 'UsuariosContratoError'
  }
}
function fail(): never { throw new UsuariosContratoError() }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail()
  return value as Record<string, unknown>
}
function row(value: unknown, keys: string[]): Record<string, unknown> {
  const result = object(value)
  if (Object.keys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key))) return fail()
  return result
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return fail()
  return value
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return fail()
  return value
}
function commandId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) return fail()
  return value
}
function role(value: unknown): RolGlobal {
  if (!ROLES_GLOBALES.includes(value as RolGlobal)) return fail()
  return value as RolGlobal
}
function authority(value: Record<string, unknown>): AutoridadUsuario {
  if (typeof value.activo !== 'boolean') return fail()
  return { usuario_id: validarId(value.usuario_id), nombre: text(value.nombre), rol_global: role(value.rol_global), activo: value.activo, revision_autoridad: validarRevision(value.revision_autoridad) }
}

export function validarOpcionesUsuarios(value: unknown): OpcionesUsuarios {
  const input = object(value)
  if (Object.keys(input).some(key => !['consulta', 'rol_global', 'cursor', 'limite'].includes(key))) return fail()
  const result: OpcionesUsuarios = validarPagina(input, 20)
  if (input.consulta !== undefined) {
    const consulta = text(input.consulta).normalize('NFC').trim()
    if ([...consulta].length < 2 || [...consulta].length > 100) return fail()
    result.consulta = consulta
  }
  if (input.rol_global !== undefined) result.rol_global = role(input.rol_global)
  return result
}

export function validarUsuarios(value: unknown, options: OpcionesUsuarios = {}): UsuariosLectura {
  const result = row(value, ['data', 'observado_en', 'siguiente_cursor'])
  if (!Array.isArray(result.data) || result.data.length > (options.limite ?? 20)) return fail()
  let previous = 0n
  const data = result.data.map((item): UsuarioAdministracion => {
    const input = row(item, ['usuario_id', 'nombre', 'username', 'rol_global', 'activo', 'revision_autoridad'])
    const parsed = authority(input)
    if (!parsed.activo || BigInt(parsed.usuario_id) <= previous || options.rol_global !== undefined && parsed.rol_global !== options.rol_global) return fail()
    previous = BigInt(parsed.usuario_id)
    return { ...parsed, activo: true, username: input.username === null ? null : text(input.username) }
  })
  const siguiente_cursor = result.siguiente_cursor === null ? null : text(result.siguiente_cursor)
  if (siguiente_cursor !== null && (siguiente_cursor.length > 1024 || data.length === 0)) return fail()
  return { data, observado_en: timestamp(result.observado_en), siguiente_cursor }
}

export function validarAutoridad(value: unknown, usuarioId: string): AutoridadLectura {
  const result = row(value, ['data', 'observado_en'])
  const data = authority(row(result.data, ['usuario_id', 'nombre', 'rol_global', 'activo', 'revision_autoridad']))
  if (data.usuario_id !== validarId(usuarioId)) return fail()
  return { data, observado_en: timestamp(result.observado_en) }
}

export function validarIntentoRol(value: unknown): IntentoRol {
  const input = row(value, ['actor_id', 'operacion', 'usuario_id', 'payload'])
  if (input.operacion !== 'CAMBIAR_ROL_GLOBAL') return fail()
  const payload = row(input.payload, ['comando_id', 'rol_global', 'revision_esperada', 'motivo'])
  const motivo = text(payload.motivo).normalize('NFC').trim()
  if ([...motivo].length < 3 || [...motivo].length > 1000) return fail()
  return {
    actor_id: validarId(input.actor_id), operacion: 'CAMBIAR_ROL_GLOBAL', usuario_id: validarId(input.usuario_id),
    payload: { comando_id: commandId(payload.comando_id), rol_global: role(payload.rol_global), revision_esperada: validarRevision(payload.revision_esperada), motivo },
  }
}

export function validarReciboRol(value: unknown, intentoValue: IntentoRol): ReciboRol {
  const intento = validarIntentoRol(intentoValue)
  const input = row(value, ['comando_id', 'operacion', 'estado', 'resultado', 'error', 'finalizado_en'])
  if (commandId(input.comando_id) !== intento.payload.comando_id || input.operacion !== intento.operacion) return fail()
  const base = { comando_id: intento.payload.comando_id, operacion: intento.operacion, finalizado_en: timestamp(input.finalizado_en) }
  if (input.estado === 'RECHAZADO') {
    if (input.resultado !== null) return fail()
    const error = validarErrorEstable(input.error)
    if (error.ambitos.length) return fail()
    return { ...base, estado: 'RECHAZADO', resultado: null, error }
  }
  if (input.estado !== 'CONFIRMADO' || input.error !== null) return fail()
  const result = row(input.resultado, ['tipo', 'usuario_id', 'rol_anterior', 'rol_nuevo', 'revision_anterior', 'revision_nueva', 'cambio'])
  const usuario_id = validarId(result.usuario_id)
  const rol_anterior = role(result.rol_anterior)
  const rol_nuevo = role(result.rol_nuevo)
  const revision_anterior = validarRevision(result.revision_anterior)
  const revision_nueva = validarRevision(result.revision_nueva)
  const cambio = result.cambio
  if (result.tipo !== 'ROL_GLOBAL' || usuario_id !== intento.usuario_id || rol_nuevo !== intento.payload.rol_global || revision_anterior !== intento.payload.revision_esperada) return fail()
  if (cambio === 'CAMBIO_APLICADO') {
    if (rol_anterior === rol_nuevo || BigInt(revision_nueva) !== BigInt(revision_anterior) + 1n) return fail()
  } else if (cambio === 'SIN_CAMBIOS') {
    if (rol_anterior !== rol_nuevo || revision_nueva !== revision_anterior) return fail()
  } else return fail()
  return { ...base, estado: 'CONFIRMADO', error: null, resultado: { tipo: 'ROL_GLOBAL', usuario_id, rol_anterior, rol_nuevo, revision_anterior, revision_nueva, cambio } }
}
