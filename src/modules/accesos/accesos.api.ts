import { verificarActorParticipacion } from '../participacion/api/participacion.api'
import { outsideError, requestPrivada, successful } from '../participacion/api/participacion.transport'
import { validarId } from '../participacion/api/participacion.contract'
import { validarIntentoAcceso, validarM1, validarM2, validarReciboAcceso } from './accesos.contract'
import type { DominioAcceso, IntentoAcceso, ReciboAcceso } from './types'

export const accesoPath = (domain: DominioAcceso) => domain === 'M1' ? 'acceso-recoleccion' : 'acceso-viveros'
async function read(actorId: string, usuarioId: string | null, domain: DominioAcceso, cursor?: string, signal?: AbortSignal) {
  const actor = validarId(actorId), user = usuarioId === null ? actor : validarId(usuarioId)
  const token = await verificarActorParticipacion(actor, signal)
  const query = new URLSearchParams({ limite: '20', ...(cursor ? { antes_de_id: validarId(cursor) } : {}) })
  const response = successful(await requestPrivada(`/${usuarioId === null ? 'me' : `usuarios/${user}`}/${accesoPath(domain)}?${query}`, { signal }, token))
  return { response, user }
}
async function command(value: IntentoAcceso, recover: boolean, signal?: AbortSignal): Promise<ReciboAcceso> {
  const intento = validarIntentoAcceso(value)
  const token = await verificarActorParticipacion(intento.actor_id, signal)
  const path = recover
    ? `/${intento.dominio === 'M1' ? 'recoleccion' : 'vivero'}/accesos/comandos/${intento.payload.comando_id}`
    : `/usuarios/${intento.usuario_id}/${accesoPath(intento.dominio)}/${intento.operacion.startsWith('OTORGAR') ? 'otorgamientos' : 'retiros'}`
  const response = await requestPrivada(path, recover ? { signal } : { method: 'POST', body: JSON.stringify(intento.payload), signal }, token)
  if (recover ? response.status !== 200 : ![200, 403, 404, 409].includes(response.status)) throw outsideError(response)
  if (!response.body || typeof response.body !== 'object' || !('estado' in response.body) || !['CONFIRMADO', 'RECHAZADO'].includes(String(response.body.estado))) throw outsideError(response)
  const receipt = validarReciboAcceso(response.body, intento)
  if (receipt.estado === 'CONFIRMADO' && response.status !== 200) throw outsideError(response)
  return receipt
}
export const AccesosService = {
  async m1(actorId: string, usuarioId: string | null = null, cursor?: string, signal?: AbortSignal) {
    const { response, user } = await read(actorId, usuarioId, 'M1', cursor, signal)
    return validarM1(response, user)
  },
  async m2(actorId: string, usuarioId: string | null = null, cursor?: string, signal?: AbortSignal) {
    const { response, user } = await read(actorId, usuarioId, 'M2', cursor, signal)
    return validarM2(response, user)
  },
  enviar: (intento: IntentoAcceso, signal?: AbortSignal) => command(intento, false, signal),
  recuperar: (intento: IntentoAcceso, signal?: AbortSignal) => command(intento, true, signal),
}
