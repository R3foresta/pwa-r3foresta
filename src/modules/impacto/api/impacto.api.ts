import { validarErrorFueraRecibo } from '../../participacion/api/participacion.contract'
import { ParticipacionApiError, requestPrivada, tokenActual } from '../../participacion/api/participacion.transport'
import { WebAuthnService } from '../../../services/webauthn.service'
import type { ImpactoQuery, ImpactoScope, MisRegistrosQuery } from '../types'
import {
  ImpactoContratoError, validarImpactoConsulta, validarImpactoId, validarImpactoQuery,
  validarImpactoRegistro, validarImpactoScope, validarMisRegistros, validarMisRegistrosQuery,
} from './impacto.contract'

export { validarImpactoId, validarImpactoQuery } from './impacto.contract'
export const IMPACTO_REQUEST_TIMEOUT_MS = 40_000
export class ImpactoApiError extends Error {
  readonly status: number
  readonly codigo: string
  constructor(status: number, codigo: string, mensaje: string) { super(mensaje); this.name = 'ImpactoApiError'; this.status = status; this.codigo = codigo }
}
function baseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const url = new URL(`${configured}/api/v1`, window.location.origin)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new ImpactoContratoError('La URL del servicio de Impacto no es válida.')
  return url.href
}
/** El DTO solo permite IDs. Nunca abrir bucket/ruta original ni URLs recibidas sin validar. */
export function imagenPublicaUrl(evidenciaId: string): string { return `${baseUrl()}/impact/imagenes/${validarImpactoId(evidenciaId)}` }
function errorFromResponse(status: number, body: unknown): ImpactoApiError {
  try { const error = validarErrorFueraRecibo(body).error; return new ImpactoApiError(status, error.codigo, error.mensaje) } catch {
    return new ImpactoApiError(status, status === 401 ? 'SESION_INVALIDA' : status === 404 ? 'RECURSO_NO_VISIBLE' : 'RESULTADO_NO_DETERMINADO', status === 401 ? 'Ingresa nuevamente para consultar tus registros.' : status === 404 ? 'El recurso no está disponible.' : 'No se pudo consultar la información. Vuelve a intentarlo.')
  }
}
function readingError(error: unknown): never {
  if (error instanceof DOMException && error.name === 'AbortError') throw error
  if (error instanceof ParticipacionApiError) throw new ImpactoApiError(error.status, error.codigo, error.status === 401 || error.status === 403 ? 'Recupera tu sesión para consultar tus registros.' : 'No se pudo consultar la información. Vuelve a intentarlo.')
  throw error
}
async function requestPublica(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  let timedOut = false
  let cancel!: (reason: Error) => void
  const cancellation = new Promise<never>((_resolve, reject) => { cancel = reject })
  const onAbort = () => { controller.abort(); cancel(new DOMException('Consulta cancelada', 'AbortError')) }
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); cancel(new DOMException('Tiempo de espera agotado', 'TimeoutError')) }, IMPACTO_REQUEST_TIMEOUT_MS)
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) onAbort()
  try {
    const { response, body } = await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
        const response = await fetch(`${baseUrl()}${path}`, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal })
        const body: unknown = await response.json().catch(() => null)
        return { response, body }
      })(), cancellation,
    ])
    if (response.status !== 200) throw errorFromResponse(response.status, body)
    return body
  } catch (error) {
    if (signal?.aborted || !timedOut && error instanceof DOMException && error.name === 'AbortError' || error instanceof ImpactoApiError || error instanceof ImpactoContratoError) throw error
    throw new ImpactoApiError(0, 'RESULTADO_NO_DETERMINADO', timedOut ? 'Se agotó la espera de la consulta. Vuelve a intentarlo.' : 'No se pudo consultar la información. Comprueba tu conexión y vuelve a intentarlo.')
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}
/** Una evidencia propia puede pertenecer a un registro no público; nunca se carga con `<img>` sin Bearer. */
async function imagenPropia(registroId: string, evidenciaId: string, signal?: AbortSignal): Promise<Blob> {
  const path = `/plantaciones/${validarImpactoId(registroId)}/imagenes/${validarImpactoId(evidenciaId)}`
  const token = tokenActual()
  const controller = new AbortController()
  let timedOut = false
  let cancel!: (reason: Error) => void
  const cancellation = new Promise<never>((_resolve, reject) => { cancel = reject })
  const onAbort = () => { controller.abort(); cancel(new DOMException('Consulta cancelada', 'AbortError')) }
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); cancel(new DOMException('Tiempo de espera agotado', 'TimeoutError')) }, IMPACTO_REQUEST_TIMEOUT_MS)
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) onAbort()
  try {
    const blob = await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
        const response = await fetch(`${baseUrl()}${path}`, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
        if (response.status !== 200) throw errorFromResponse(response.status, await response.json().catch(() => null))
        if (response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'image/jpeg') throw new ImpactoContratoError('La respuesta de la foto no cumple el contrato.')
        return response.blob()
      })(), cancellation,
    ])
    if (WebAuthnService.getToken()?.trim() !== token) throw new ImpactoApiError(401, 'SESION_INVALIDA', 'La sesión cambió durante la lectura de la foto.')
    if (!blob.size) throw new ImpactoContratoError('La foto está vacía. Vuelve a intentarlo.')
    return blob
  } catch (error) {
    if (signal?.aborted || !timedOut && error instanceof DOMException && error.name === 'AbortError' || error instanceof ImpactoApiError || error instanceof ImpactoContratoError) throw error
    if (error instanceof ParticipacionApiError) return readingError(error)
    throw new ImpactoApiError(0, 'RESULTADO_NO_DETERMINADO', timedOut ? 'Se agotó la espera de la foto. Vuelve a intentarlo.' : 'No se pudo cargar la foto. Comprueba tu conexión y vuelve a intentarlo.')
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}
function queryString(options: ImpactoQuery): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(options)) if (value !== undefined) query.set(key, String(value))
  return query.size ? `?${query}` : ''
}
export class ImpactoService {
  static async consultar(scopeValue: ImpactoScope, optionsValue: ImpactoQuery = {}, signal?: AbortSignal) {
    const scope = validarImpactoScope(scopeValue), options = validarImpactoQuery(scope, optionsValue)
    const path = scope.tipo === 'global' ? '/impact/global' : `/impact/${scope.tipo === 'campania' ? 'campanias' : 'subcampanias'}/${scope.id}`
    return validarImpactoConsulta(await requestPublica(`${path}${queryString(options)}`, signal), scope, options)
  }
  static async registro(idValue: string, signal?: AbortSignal) {
    const id = validarImpactoId(idValue)
    return validarImpactoRegistro(await requestPublica(`/impact/registros/${id}`, signal), id)
  }
  static async misRegistros(optionsValue: MisRegistrosQuery = {}, signal?: AbortSignal) {
    const options = validarMisRegistrosQuery(optionsValue)
    try {
      // El servidor deriva al actor del Bearer. Esta lectura no exige capacidades operativas.
      const response = await requestPrivada(`/plantaciones/mis-registros${queryString(options)}`, { signal })
      if (response.status !== 200) throw errorFromResponse(response.status, response.body)
      return validarMisRegistros(response.body, options)
    } catch (error) { return readingError(error) }
  }
  static imagenPropia = imagenPropia
}
