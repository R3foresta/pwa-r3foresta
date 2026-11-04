import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { outsideError, requestPrivada, sessionError, successful } from '../../participacion/api/participacion.transport'
import { validarId } from '../../participacion/api/participacion.contract'
import type { AutoridadLectura, IntentoRol, OpcionesUsuarios, ReciboRol, UsuariosLectura } from '../types'
import { UsuariosContratoError, validarAutoridad, validarIntentoRol, validarOpcionesUsuarios, validarReciboRol, validarUsuarios } from './usuarios.contract'

export { UsuariosContratoError } from './usuarios.contract'
export { ParticipacionApiError } from '../../participacion/api/participacion.transport'

async function command(value: IntentoRol, recover: boolean, signal?: AbortSignal): Promise<ReciboRol> {
  const intento = validarIntentoRol(value)
  // Vincula cuenta al Bearer sin exigir ADMIN para recuperar su recibo propio.
  const token = await verificarActorParticipacion(intento.actor_id, signal)
  const response = await requestPrivada(recover
    ? `/participacion/comandos/${intento.payload.comando_id}?operacion=CAMBIAR_ROL_GLOBAL`
    : `/usuarios/${intento.usuario_id}/roles`, recover
    ? { signal }
    : { method: 'POST', signal, body: JSON.stringify(intento.payload) }, token)
  if (response.token !== token) throw sessionError()
  if (response.status === 401 || response.status >= 500 || response.status === 202) throw outsideError(response)
  if (recover ? response.status !== 200 : ![200, 403, 404, 409, 422].includes(response.status)) throw outsideError(response)
  const isTerminal = response.body && typeof response.body === 'object' && 'estado' in response.body && (response.body.estado === 'CONFIRMADO' || response.body.estado === 'RECHAZADO')
  if (!isTerminal) throw outsideError(response)
  const receipt = validarReciboRol(response.body, intento)
  if (receipt.estado === 'CONFIRMADO' && response.status !== 200) throw new UsuariosContratoError()
  return receipt
}

export class UsuariosService {
  static async listar(actorId: string, options: OpcionesUsuarios = {}, signal?: AbortSignal): Promise<UsuariosLectura> {
    const parsed = validarOpcionesUsuarios(options)
    const token = await verificarActorParticipacion(validarId(actorId), signal)
    const query = new URLSearchParams()
    if (parsed.consulta !== undefined) query.set('consulta', parsed.consulta)
    if (parsed.rol_global !== undefined) query.set('rol_global', parsed.rol_global)
    if (parsed.cursor !== undefined) query.set('cursor', parsed.cursor)
    if (parsed.limite !== undefined) query.set('limite', String(parsed.limite))
    return validarUsuarios(successful(await requestPrivada(`/usuarios${query.size ? `?${query}` : ''}`, { signal }, token)), parsed)
  }
  static async autoridad(actorId: string, usuarioId: string, signal?: AbortSignal): Promise<AutoridadLectura> {
    const user = validarId(usuarioId)
    const token = await verificarActorParticipacion(validarId(actorId), signal)
    return validarAutoridad(successful(await requestPrivada(`/usuarios/${user}/autoridad`, { signal }, token)), user)
  }
  static enviar(intento: IntentoRol, signal?: AbortSignal): Promise<ReciboRol> { return command(intento, false, signal) }
  static recuperar(intento: IntentoRol, signal?: AbortSignal): Promise<ReciboRol> { return command(intento, true, signal) }
}
