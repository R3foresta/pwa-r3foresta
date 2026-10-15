import { WebAuthnService } from '../../../services/webauthn.service'
import type {
  BuscarEntrada, CapacidadesLectura, ErrorEstable, IntentoAcceso, MiembrosLectura,
  OpcionesCapacidades, OpcionesPagina, PersonasLectura, ReciboAcceso, Reintento,
  RevisarEntrada, RevisionLectura,
} from '../types'
import {
  ParticipacionContratoError, validarBusqueda, validarCapacidades, validarErrorFueraRecibo,
  validarEntradaRevision, validarId, validarIntentoAcceso, validarMiembros, validarPagina,
  validarPersonas, validarReciboAcceso, validarRevisionAccesos,
} from './participacion.contract'

export { ParticipacionContratoError } from './participacion.contract'

export class ParticipacionApiError extends Error {
  readonly resultado_concluyente = false
  readonly status: number
  readonly codigo: string
  readonly reintento: Reintento
  readonly retryAfter?: number
  readonly campos: string[]
  readonly ambitos: string[]
  constructor(status: number, error: ErrorEstable, retryAfter?: number) {
    super(error.mensaje)
    this.name = 'ParticipacionApiError'
    this.status = status
    this.codigo = error.codigo
    this.reintento = error.reintento
    this.retryAfter = retryAfter
    this.campos = error.campos
    this.ambitos = error.ambitos
  }
}

const API = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
export const PARTICIPACION_REQUEST_TIMEOUT_MS = 40_000
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
function sessionError(message = 'Ingresa nuevamente con la cuenta que confirmó esta operación.'): ParticipacionApiError {
  return new ParticipacionApiError(401, { codigo: 'SESION_INVALIDA', mensaje: message, campos: [], ambitos: [], reintento: 'RECUPERAR_SESION' })
}
function tokenActual(): string {
  const token = WebAuthnService.getToken()?.trim()
  if (identidad && identidad.token !== token) identidad = null
  if (!token) throw sessionError()
  return token
}
type RespuestaPrivada = { status: number; body: unknown; token: string; retryAfter?: number }
async function request(path: string, init: RequestInit = {}, expectedToken?: string): Promise<RespuestaPrivada> {
  const token = tokenActual()
  if (expectedToken !== undefined && token !== expectedToken) throw sessionError('La sesión cambió antes de enviar la operación.')
  const controller = new AbortController()
  let timedOut = false
  let cancel!: (reason: Error) => void
  const cancellation = new Promise<never>((_resolve, reject) => { cancel = reject })
  const onAbort = () => {
    controller.abort()
    cancel(new DOMException('Consulta cancelada', 'AbortError'))
  }
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
    cancel(new DOMException('Tiempo de espera agotado', 'TimeoutError'))
  }, PARTICIPACION_REQUEST_TIMEOUT_MS)
  init.signal?.addEventListener('abort', onAbort, { once: true })
  if (init.signal?.aborted) onAbort()
  try {
    const { response, body } = await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
        const response = await fetch(`${API}${path}`, {
          ...init,
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
          headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
        })
        const body: unknown = await response.json().catch(() => null)
        return { response, body }
      })(),
      cancellation,
    ])
    if (WebAuthnService.getToken()?.trim() !== token) throw sessionError('La sesión cambió durante la solicitud.')
    const retryHeader = response.headers?.get('Retry-After')
    const seconds = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined
    return { status: response.status, body, token, retryAfter: seconds && Number.isFinite(seconds) ? Math.min(seconds, 30) : undefined }
  } catch (error) {
    if (WebAuthnService.getToken()?.trim() !== token) throw sessionError('La sesión cambió durante la solicitud.')
    if (init.signal?.aborted || !timedOut && error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ParticipacionApiError(0, { codigo: 'RESULTADO_NO_DETERMINADO', mensaje: timedOut ? 'Se agotó la espera. El resultado no está confirmado; recupera la misma operación.' : 'No se pudo confirmar el resultado. Recupera la misma operación cuando haya conexión.', campos: [], ambitos: [], reintento: 'MISMA_CLAVE' })
  } finally {
    window.clearTimeout(timeout)
    init.signal?.removeEventListener('abort', onAbort)
  }
}
function outsideError(response: RespuestaPrivada): ParticipacionApiError {
  try {
    const value = validarErrorFueraRecibo(response.body)
    return new ParticipacionApiError(response.status, value.error, response.retryAfter)
  } catch {
    return new ParticipacionApiError(response.status, {
      codigo: response.status === 401 ? 'SESION_INVALIDA' : response.status === 202 || response.status === 404 ? 'COMANDO_NO_CONFIRMADO' : 'RESULTADO_NO_DETERMINADO',
      mensaje: response.status === 401 ? 'La sesión venció. Ingresa con la cuenta original para recuperar la operación.' : 'El resultado no está confirmado. Conserva la misma operación para consultar o reintentar.',
      campos: [], ambitos: [], reintento: response.status === 401 ? 'RECUPERAR_SESION' : 'MISMA_CLAVE',
    }, response.retryAfter)
  }
}
function successful(response: RespuestaPrivada): unknown {
  if (response.status !== 200) throw outsideError(response)
  return response.body
}
function pageQuery(options: OpcionesPagina): URLSearchParams {
  const validated = validarPagina(options)
  const query = new URLSearchParams()
  if (validated.cursor) query.set('cursor', validated.cursor)
  if (validated.limite !== undefined) query.set('limite', String(validated.limite))
  return query
}
async function bindActor(actor_id: string, signal?: AbortSignal): Promise<string> {
  const token = tokenActual()
  if (!identidad || identidad.token !== token) await ParticipacionService.capacidades({}, signal)
  if (tokenActual() !== token || identidad?.token !== token || identidad.actor_id !== actor_id) throw sessionError('La operación pertenece a otra cuenta. Ingresa con su cuenta original para recuperarla.')
  return token
}
async function command(intentoValue: IntentoAcceso, recover: boolean, signal?: AbortSignal): Promise<ReciboAcceso> {
  // Copia/proyección fija del intento: no se agregan revisiones nuevas al reenviar.
  const intento = validarIntentoAcceso(intentoValue)
  const token = await bindActor(intento.actor_id, signal)
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
