import { WebAuthnService } from '../../../services/webauthn.service'
import type { ErrorEstable, Reintento } from '../types'
import { validarErrorFueraRecibo } from './participacion.contract'

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

export const PARTICIPACION_API_URL = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`
export const PARTICIPACION_REQUEST_TIMEOUT_MS = 40_000
export function sessionError(message = 'Ingresa nuevamente con la cuenta que confirmó esta operación.'): ParticipacionApiError {
  return new ParticipacionApiError(401, { codigo: 'SESION_INVALIDA', mensaje: message, campos: [], ambitos: [], reintento: 'RECUPERAR_SESION' })
}
export function tokenActual(): string {
  const token = WebAuthnService.getToken()?.trim()
  if (!token) throw sessionError()
  return token
}
export type RespuestaPrivada = { status: number; body: unknown; token: string; retryAfter?: number }
export async function requestPrivada(path: string, init: RequestInit = {}, expectedToken?: string): Promise<RespuestaPrivada> {
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
        const response = await fetch(`${PARTICIPACION_API_URL}${path}`, {
          ...init,
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'omit',
          headers: { Authorization: `Bearer ${token}`, ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
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
export function outsideError(response: RespuestaPrivada): ParticipacionApiError {
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
export function successful(response: RespuestaPrivada): unknown {
  if (response.status !== 200) throw outsideError(response)
  return response.body
}
