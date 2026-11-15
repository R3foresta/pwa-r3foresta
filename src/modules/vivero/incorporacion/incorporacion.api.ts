import { WebAuthnService } from '../../../services/webauthn.service'
import { exactId } from '../../accesos/accessPolicy'
import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import {
  errorFotoIncorporacion, validarFotosPendientes, validarPayload, validarRecibo, validarSolicitudId,
  type FotosPendientes, type IncorporacionPayload, type IncorporacionRecibo, type IncorporacionResultado,
} from './incorporacion.contract'

const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/lotes-vivero/incorporaciones`
export const INCORPORACION_TIMEOUT_MS = 40_000
export class IncorporacionApiError extends Error {
  readonly status: number
  readonly concluyente: boolean
  constructor(status: number, concluyente: boolean, message: string) {
    super(message)
    this.status = status
    this.concluyente = concluyente
    this.name = 'IncorporacionApiError'
  }
}
type ResponseBody = { status: number; body: unknown }
const uncertain = (status = 0) => new IncorporacionApiError(status, false, 'No se pudo determinar el resultado. Conserva la solicitud y consulta antes de reintentar.')
function errorResponse({ status, body }: ResponseBody): IncorporacionApiError {
  let message: string | null = null
  if (body && typeof body === 'object' && !Array.isArray(body) && 'message' in body) {
    if (typeof body.message === 'string' && body.message.trim()) message = body.message
    if (Array.isArray(body.message) && body.message.length && body.message.every(value => typeof value === 'string' && value.trim())) message = body.message.join('\n')
  }
  const explicitValidation = [400, 422].includes(status) && message !== null
  if (status === 409) return new IncorporacionApiError(status, false, 'La solicitud está en conflicto. Conserva la clave y consulta su resultado; no prepares otra incorporación automáticamente.')
  if (status === 401) return new IncorporacionApiError(status, false, 'Recupera la sesión con la cuenta original para consultar esta solicitud.')
  if (status === 403) return new IncorporacionApiError(status, false, 'No tienes permiso para esta operación. Conserva la solicitud para recuperar su resultado con la cuenta original.')
  return new IncorporacionApiError(status, explicitValidation, message ?? uncertain(status).message)
}
/** Transporte dedicado: evita usar rutas ../ desde el cliente v1. */
async function request(actor: string, path: string, init: RequestInit = {}): Promise<ResponseBody> {
  let bearer: string
  try {
    // Sólo acredita identidad. Recuperar el recibo propio no depende de M2 ni ADMIN.
    bearer = await verificarActorParticipacion(exactId(actor), init.signal ?? undefined)
  } catch (error) {
    if (init.signal?.aborted) throw error
    const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 0
    throw new IncorporacionApiError(status, false, error instanceof Error ? error.message : uncertain().message)
  }
  if (WebAuthnService.getToken()?.trim() !== bearer) throw new IncorporacionApiError(401, false, 'La sesión cambió antes de enviar la operación.')
  const controller = new AbortController()
  let timedOut = false
  let cancel!: (reason: Error) => void
  const cancellation = new Promise<never>((_resolve, reject) => { cancel = reject })
  const onAbort = () => { controller.abort(); cancel(new DOMException('Consulta cancelada', 'AbortError')) }
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
    cancel(new DOMException('Tiempo de espera agotado', 'TimeoutError'))
  }, INCORPORACION_TIMEOUT_MS)
  init.signal?.addEventListener('abort', onAbort, { once: true })
  if (init.signal?.aborted) onAbort()
  try {
    const result = await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
        const response = await fetch(`${BASE}${path}`, {
          ...init, signal: controller.signal, cache: 'no-store', credentials: 'omit',
          headers: { Authorization: `Bearer ${bearer}`, ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
        })
        // La misma espera cubre cabeceras y lectura/parseo del body.
        const body: unknown = await response.json().catch(() => null)
        return { status: response.status, body }
      })(), cancellation,
    ])
    if (WebAuthnService.getToken()?.trim() !== bearer) throw new IncorporacionApiError(401, false, 'La sesión cambió durante la solicitud. Conserva la clave para recuperarla.')
    return result
  } catch (error) {
    if (error instanceof IncorporacionApiError) throw error
    if (WebAuthnService.getToken()?.trim() !== bearer) throw new IncorporacionApiError(401, false, 'La sesión cambió durante la solicitud. Conserva la clave para recuperarla.')
    if (init.signal?.aborted || !timedOut && error instanceof DOMException && error.name === 'AbortError') throw error
    throw uncertain()
  } finally {
    window.clearTimeout(timeout)
    init.signal?.removeEventListener('abort', onAbort)
  }
}
function parsed<T>(response: ResponseBody, parse: (body: unknown) => T): T {
  try { return parse(response.body) } catch { throw uncertain(response.status) }
}
export const IncorporacionApi = {
  async recuperar(actor: string, id: string, signal?: AbortSignal): Promise<IncorporacionResultado> {
    const solicitud = validarSolicitudId(id)
    const response = await request(actor, `/${solicitud}`, { signal })
    if (response.status !== 200) throw errorResponse(response)
    const body = response.body
    if (body && typeof body === 'object' && !Array.isArray(body) && 'success' in body && body.success === true && 'estado' in body && body.estado === 'SIN_RESULTADO' && 'resultado_concluyente' in body && body.resultado_concluyente === false) {
      return { success: true, estado: 'SIN_RESULTADO', resultado_concluyente: false }
    }
    const receipt = parsed(response, validarRecibo)
    if (receipt.data.solicitud_id !== solicitud) throw uncertain(response.status)
    return receipt
  },
  async pendientes(actor: string, id: string, viveroId: string, signal?: AbortSignal): Promise<FotosPendientes> {
    const query = new URLSearchParams({ vivero_id: exactId(viveroId) })
    const response = await request(actor, `/${validarSolicitudId(id)}/evidencias-pendientes?${query}`, { signal })
    if (response.status !== 200) throw errorResponse(response)
    return parsed(response, validarFotosPendientes)
  },
  async subir(actor: string, id: string, viveroId: string, files: File[], signal?: AbortSignal): Promise<FotosPendientes> {
    if (files.length < 1 || files.length > 5 || files.some(file => errorFotoIncorporacion(file))) throw new IncorporacionApiError(0, true, 'Adjunta entre 1 y 5 fotos válidas de hasta 15 MiB por archivo.')
    const solicitud = validarSolicitudId(id)
    const form = new FormData()
    form.append('vivero_id', exactId(viveroId))
    files.forEach(file => form.append('fotos', file))
    const response = await request(actor, `/${solicitud}/evidencias-pendientes`, { method: 'POST', body: form, signal })
    if (![200, 201].includes(response.status)) throw errorResponse(response)
    const result = parsed(response, validarFotosPendientes)
    if (result.evidencia_ids.length !== files.length) throw uncertain(response.status)
    return result
  },
  async confirmar(actor: string, value: IncorporacionPayload, signal?: AbortSignal): Promise<IncorporacionRecibo> {
    const payload = validarPayload(value)
    const response = await request(actor, '', { method: 'POST', body: JSON.stringify(payload), signal })
    if (![200, 201].includes(response.status)) throw errorResponse(response)
    return parsed(response, body => validarRecibo(body, payload))
  },
}
