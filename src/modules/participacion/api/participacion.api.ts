import { outsideError, requestPrivada as request, sessionError, successful, tokenActual } from './participacion.transport'
import type {
  BuscarEntrada, CapacidadesLectura, IntentoAcceso, MiembrosLectura,
  OpcionesCapacidades, OpcionesPagina, PersonasLectura, ReciboAcceso,
  RevisarEntrada, RevisionLectura,
} from '../types'
import {
  ParticipacionContratoError, validarBusqueda, validarCapacidades,
  validarEntradaRevision, validarId, validarIntentoAcceso, validarMiembros, validarPagina,
  validarPersonas, validarReciboAcceso, validarRevisionAccesos,
} from './participacion.contract'

export { ParticipacionContratoError } from './participacion.contract'

export { ParticipacionApiError, PARTICIPACION_REQUEST_TIMEOUT_MS } from './participacion.transport'
const paths = {
  OTORGAR_PLANTADOR: 'otorgar-plantador',
  RETIRAR_PLANTADOR: 'retirar-plantador',
  DESIGNAR_ADMINISTRADOR: 'designar-administrador',
  CAMBIAR_ADMINISTRADOR_A_PLANTADOR: 'administrador-a-plantador',
  RETIRAR_ADMINISTRADOR: 'retirar-administrador',
  REEMPLAZAR_ADMINISTRADOR: 'reemplazar-administrador',
} as const

// Solo vincula la identidad acreditada por capacidades al Bearer actual.
// No conserva capacidades, recibos, nombres ni consultas privadas entre cuentas.
let identidad: { token: string; actor_id: string } | null = null
function pageQuery(options: OpcionesPagina): URLSearchParams {
  const validated = validarPagina(options)
  const query = new URLSearchParams()
  if (validated.cursor) query.set('cursor', validated.cursor)
  if (validated.limite !== undefined) query.set('limite', String(validated.limite))
  return query
}
export async function verificarActorParticipacion(actor_id: string, signal?: AbortSignal): Promise<string> {
  const token = tokenActual()
  if (!identidad || identidad.token !== token) await ParticipacionService.capacidades({}, signal)
  if (tokenActual() !== token || identidad?.token !== token || identidad.actor_id !== actor_id) throw sessionError('La operación pertenece a otra cuenta. Ingresa con su cuenta original para recuperarla.')
  return token
}
async function command(intentoValue: IntentoAcceso, recover: boolean, signal?: AbortSignal): Promise<ReciboAcceso> {
  // Copia/proyección fija del intento: no se agregan revisiones nuevas al reenviar.
  const intento = validarIntentoAcceso(intentoValue)
  const token = await verificarActorParticipacion(intento.actor_id, signal)
  const query = new URLSearchParams({ operacion: intento.operacion })
  const response = await request(recover
    ? `/participacion/comandos/${intento.payload.comando_id}?${query}`
    : `/participacion/accesos/${paths[intento.operacion]}`, recover
    ? { signal }
    : { method: 'POST', signal, body: JSON.stringify(intento.payload) }, token)
  if (response.token !== token) throw sessionError('La sesión cambió antes de consultar la operación.')
  if (response.status === 401 || response.status >= 500 || response.status === 202) throw outsideError(response)
  const isTerminal = response.body && typeof response.body === 'object' && 'estado' in response.body && (response.body.estado === 'CONFIRMADO' || response.body.estado === 'RECHAZADO')
  if (!isTerminal) throw outsideError(response)
  if (recover ? response.status !== 200 : ![200, 403, 404, 409, 422].includes(response.status)) throw outsideError(response)
  const receipt = validarReciboAcceso(response.body, intento)
  if (receipt.estado === 'CONFIRMADO' && response.status !== 200) throw new ParticipacionContratoError()
  return receipt
}

export class ParticipacionService {
  static async capacidades(options: OpcionesCapacidades = {}, signal?: AbortSignal): Promise<CapacidadesLectura> {
    const query = pageQuery(options)
    if (options.campania_id !== undefined) query.set('campania_id', validarId(options.campania_id))
    const response = await request(`/participacion/capacidades${query.size ? `?${query}` : ''}`, { signal })
    const result = validarCapacidades(successful(response))
    if (identidad?.token === response.token && identidad.actor_id !== result.data.actor.usuario_id) throw new ParticipacionContratoError()
    identidad = { token: response.token, actor_id: result.data.actor.usuario_id }
    return result
  }
  static async miembros(subcampaniaId: string, options: OpcionesPagina = {}, signal?: AbortSignal): Promise<MiembrosLectura> {
    const query = pageQuery(options)
    return validarMiembros(successful(await request(`/subcampanias/${validarId(subcampaniaId)}/miembros-participacion${query.size ? `?${query}` : ''}`, { signal })))
  }
  static async buscar(input: BuscarEntrada, signal?: AbortSignal): Promise<PersonasLectura> {
    const body = validarBusqueda(input)
    return validarPersonas(successful(await request('/participacion/personas/buscar', { method: 'POST', signal, body: JSON.stringify(body) })))
  }
  static async revisar(input: RevisarEntrada, signal?: AbortSignal): Promise<RevisionLectura> {
    const body = validarEntradaRevision(input)
    return validarRevisionAccesos(successful(await request('/participacion/accesos/revisar', { method: 'POST', signal, body: JSON.stringify(body) })), body)
  }
  static enviar(intento: IntentoAcceso, signal?: AbortSignal): Promise<ReciboAcceso> { return command(intento, false, signal) }
  static recuperar(intento: IntentoAcceso, signal?: AbortSignal): Promise<ReciboAcceso> { return command(intento, true, signal) }
}
