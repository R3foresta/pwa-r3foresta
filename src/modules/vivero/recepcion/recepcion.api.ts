import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { requestPrivada, outsideError, successful } from '../../participacion/api/participacion.transport'
import { validarId } from '../../participacion/api/participacion.contract'
import { withPrivateCommandLock } from '../../participacion/commands/commandLifecycle'
import {
  validarColaRecepcion, validarIntencionRecepcion, validarOrigenRecepcion, validarReciboRecepcion,
  type DetalleRecepcion, type IntencionRecepcion,
} from './recepcion.contract'

const base = '/recepcion-semillas'
async function token(actor: string, signal?: AbortSignal) {
  // Vincula la cuenta al Bearer; no exige facultades de recepción ni M1/M2.
  return verificarActorParticipacion(validarId(actor), signal)
}
export const RecepcionService = {
  async cola(actor: string, antes?: string, signal?: AbortSignal) {
    const bearer = await token(actor, signal)
    const query = antes ? `?antes_de_id=${validarId(antes)}` : ''
    return validarColaRecepcion(successful(await requestPrivada(`${base}${query}`, { signal }, bearer)))
  },
  async detalle(actor: string, origen: string, signal?: AbortSignal) {
    const bearer = await token(actor, signal)
    const result = validarOrigenRecepcion(successful(await requestPrivada(`${base}/${validarId(origen)}`, { signal }, bearer)), true) as DetalleRecepcion
    if (result.recoleccion_id !== origen) throw new Error('El detalle no corresponde al origen.')
    return result
  },
  async fotos(actor: string, origen: string, fotos: File[], signal?: AbortSignal) {
    if (fotos.length < 1 || fotos.length > 5 || fotos.some(file => file.size <= 0 || file.size > 15 * 1024 * 1024)) {
      throw new Error('Adjunta entre 1 y 5 fotos de hasta 15 MiB por archivo.')
    }
    const bearer = await token(actor, signal)
    const form = new FormData()
    fotos.forEach(file => form.append('fotos', file))
    const response = await requestPrivada(`${base}/${validarId(origen)}/evidencias`, { method: 'POST', body: form, signal }, bearer)
    if (![200, 201].includes(response.status)) throw outsideError(response)
    const result = response.body
    if (!result || typeof result !== 'object' || Array.isArray(result)
      || Object.keys(result).length !== 2 || !('evidencia_ids' in result) || !('audiencia' in result)
      || result.audiencia !== 'BUCKET_LEGADO_PUBLICO' || !Array.isArray(result.evidencia_ids)
      || result.evidencia_ids.length !== fotos.length || new Set(result.evidencia_ids).size !== fotos.length) {
      throw new Error('No se pudo confirmar la carga de fotos. Conserva los archivos y consulta la ficha antes de continuar.')
    }
    return result.evidencia_ids.map(validarId)
  },
  async comando(value: IntencionRecepcion, recuperar: boolean, signal?: AbortSignal) {
    const intention = validarIntencionRecepcion(value)
    const bearer = await token(intention.actor_id, signal)
    const path = recuperar
      ? `${base}/comandos/${intention.entrada.comando_id}`
      : `${base}/${intention.recoleccion_id}/${intention.accion === 'RECIBIR' ? 'recibir-validar' : 'rechazar'}`
    const response = await requestPrivada(path, recuperar
      ? { signal }
      : { method: 'POST', body: JSON.stringify(intention.entrada), signal }, bearer)
    if (recuperar ? ![200, 202].includes(response.status) : ![200, 403, 404, 409, 422].includes(response.status)) throw outsideError(response)
    const receipt = validarReciboRecepcion(response.body, intention)
    const expectedStatus = receipt.estado === 'CONFIRMADO' ? response.status === 200
      : receipt.estado === 'SIN_RESULTADO' ? recuperar && response.status === 202
      : receipt.estado === 'CONFLICTO_CLAVE' ? !recuperar && response.status === 409
      : recuperar ? response.status === 200 : [403, 404, 409, 422].includes(response.status)
    if (!expectedStatus) throw outsideError(response)
    return receipt
  },
}

export class RecepcionStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'RecepcionStorageError'
  }
}
export class RecepcionPendingError extends Error {
  readonly intencion: IntencionRecepcion
  constructor(intencion: IntencionRecepcion) {
    super('Recupera primero la operación pendiente de esta cuenta.')
    this.name = 'RecepcionPendingError'
    this.intencion = intencion
  }
}
export const recepcionStoreKey = (actor: string) => `r3foresta:t4:recepcion:${validarId(actor)}`
export function withRecepcionLock<T>(actor: string, callback: () => Promise<T> | T): Promise<T> {
  return withPrivateCommandLock(recepcionStoreKey(actor), callback)
}
function freezeIntention(intention: IntencionRecepcion): IntencionRecepcion {
  if (intention.accion === 'RECIBIR') Object.freeze(intention.entrada.evidencia_ids)
  Object.freeze(intention.entrada)
  return Object.freeze(intention)
}
export function cargarIntencionRecepcion(actor: string): IntencionRecepcion | null {
  try {
    const raw = localStorage.getItem(recepcionStoreKey(actor))
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (value && typeof value === 'object' && !('accion' in value)) {
      throw new RecepcionStorageError('Hay una operación conservada del flujo anterior. Conserva estos datos y revisa su resultado antes del cambio de backend; no se reenviará ni se convertirá al flujo nuevo.')
    }
    const intention = validarIntencionRecepcion(value)
    if (intention.actor_id !== actor) throw new Error('La intención guardada pertenece a otra cuenta.')
    return freezeIntention(intention)
  } catch (error) {
    if (error instanceof RecepcionStorageError) throw error
    throw new RecepcionStorageError('No se pudo leer la operación guardada. Conserva los datos locales y recupera con la cuenta original antes de confirmar otra acción.', error)
  }
}
// Debe llamarse bajo withRecepcionLock: localStorage no tiene compare-and-set.
export function guardarIntencionRecepcion(value: IntencionRecepcion): IntencionRecepcion {
  const intention = validarIntencionRecepcion(value)
  const existing = cargarIntencionRecepcion(intention.actor_id)
  if (existing) throw new RecepcionPendingError(existing)
  try {
    const serialized = JSON.stringify(intention)
    localStorage.setItem(recepcionStoreKey(intention.actor_id), serialized)
    if (localStorage.getItem(recepcionStoreKey(intention.actor_id)) !== serialized) throw new Error('No se pudo comprobar la persistencia.')
    return freezeIntention(intention)
  } catch (error) {
    throw new RecepcionStorageError('No se pudo conservar la operación en este dispositivo. La confirmación no se ha enviado.', error)
  }
}
export function mismaIntencionRecepcion(left: IntencionRecepcion, right: IntencionRecepcion): boolean {
  if (left.actor_id !== right.actor_id || left.recoleccion_id !== right.recoleccion_id || left.accion !== right.accion
    || left.entrada.comando_id !== right.entrada.comando_id || left.entrada.revision_esperada !== right.entrada.revision_esperada) return false
  if (left.accion === 'RECHAZAR' && right.accion === 'RECHAZAR') return left.entrada.motivo_rechazo === right.entrada.motivo_rechazo
  return left.accion === 'RECIBIR' && right.accion === 'RECIBIR'
    && left.entrada.cantidad_recibida === right.entrada.cantidad_recibida
    && left.entrada.unidad_recibida === right.entrada.unidad_recibida
    && left.entrada.fecha_recepcion === right.entrada.fecha_recepcion
    && left.entrada.evidencia_ids.length === right.entrada.evidencia_ids.length
    && left.entrada.evidencia_ids.every((id, index) => id === right.entrada.evidencia_ids[index])
}
// Sólo un recibo terminal validado permite liberar el slot de esa intención.
export async function limpiarIntencionRecepcion(intention: IntencionRecepcion): Promise<IntencionRecepcion | null> {
  return withRecepcionLock(intention.actor_id, () => {
    const stored = cargarIntencionRecepcion(intention.actor_id)
    if (!stored || !mismaIntencionRecepcion(stored, intention)) return stored
    try {
      localStorage.removeItem(recepcionStoreKey(intention.actor_id))
      if (localStorage.getItem(recepcionStoreKey(intention.actor_id)) !== null) throw new Error('El envío sigue guardado.')
      return null
    } catch (error) {
      throw new RecepcionStorageError('El servidor confirmó el resultado, pero no se pudo liberar la operación local. Conserva su clave y vuelve a consultar.', error)
    }
  })
}
