import { getImageFileValidationError } from '../../../utils/imageValidation'
import type {
  CargaRegistroLectura, CargasRegistroLectura, ContextoRegistroLectura, DetallePropioRegistroLectura,
  IntentoRegistro, ParticipantesRegistroLectura, ParticipantesRegistroQuery, PreparacionOReciboRegistro,
  PreviewRegistroLectura, ReciboRegistro, RegistroIdentity,
} from '../registroTypes'
import { verificarActorParticipacion } from './participacion.api'
import { ParticipacionContratoError, validarId, validarPagina, validarPersonas } from './participacion.contract'
import { outsideError, PARTICIPACION_API_URL, ParticipacionApiError, requestPrivada, successful, type RespuestaPrivada } from './participacion.transport'
import {
  validarCargaRegistro, validarCargasRegistro, validarContextoRegistro, validarDetallePropioRegistro,
  validarPreparacionRegistro, validarPreviewRegistro, validarReciboRegistro, validarRegistroComandoId,
  validarRegistroIdentity, validarRegistroSinResultado,
} from './registro.contract'

const operation = 'REGISTRAR_PLANTACION_INICIAL'
const operationQuery = `operacion=${operation}`
export const REGISTRO_FOTO_MAX_BYTES = 10 * 1024 * 1024
function isTerminal(value: unknown): boolean { return Boolean(value && typeof value === 'object' && 'estado' in value && (value.estado === 'CONFIRMADO' || value.estado === 'RECHAZADO')) }
async function actorRequest(actorId: string, path: string, init: RequestInit = {}): Promise<RespuestaPrivada> {
  const token = await verificarActorParticipacion(validarId(actorId), init.signal ?? undefined)
  return requestPrivada(path, init, token)
}
function terminal(response: RespuestaPrivada, identity: RegistroIdentity, get = false): ReciboRegistro {
  if (response.status === 202) {
    validarRegistroSinResultado(response.body, identity)
    throw new ParticipacionApiError(202, {
      codigo: 'COMANDO_NO_CONFIRMADO',
      mensaje: 'El servidor todavía no tiene un resultado de guardado para este intento. Puedes reintentar el envío con los datos conservados.',
      campos: [], ambitos: [], reintento: 'MISMA_CLAVE',
    }, response.retryAfter)
  }
  if (!isTerminal(response.body) || (get ? response.status !== 200 : ![200, 403, 404, 409, 422, 503].includes(response.status))) throw outsideError(response)
  const receipt = validarReciboRegistro(response.body, identity)
  if (receipt.estado === 'CONFIRMADO' && response.status !== 200 || response.status === 503 && (receipt.estado !== 'RECHAZADO' || receipt.error.codigo !== 'EVALUADOR_NO_DISPONIBLE')) throw outsideError(response)
  return receipt
}
async function identityRequest(identity: RegistroIdentity, path: string, init: RequestInit = {}): Promise<RespuestaPrivada> {
  return actorRequest(identity.actor_id, path, init)
}
export class RegistroParticipacionService {
  static async contexto(actorId: string, subcampaniaId: string, signal?: AbortSignal): Promise<ContextoRegistroLectura> {
    return validarContextoRegistro(successful(await actorRequest(actorId, `/subcampanias/${validarId(subcampaniaId)}/contexto-registro`, { signal })), actorId, subcampaniaId)
  }
  static async participantes(actorId: string, subcampaniaId: string, options: ParticipantesRegistroQuery = {}, signal?: AbortSignal): Promise<ParticipantesRegistroLectura> {
    const page = validarPagina(options, 20), query = new URLSearchParams()
    if (page.cursor) query.set('cursor', page.cursor)
    if (page.limite !== undefined) query.set('limite', String(page.limite))
    if (options.q !== undefined) {
      const q = options.q.normalize('NFC').trim()
      if ([...q].length < 2 || [...q].length > 100) throw new ParticipacionContratoError('La búsqueda de participantes requiere entre 2 y 100 caracteres.')
      query.set('q', q)
    }
    const result = validarPersonas(successful(await actorRequest(actorId, `/subcampanias/${validarId(subcampaniaId)}/participantes-seleccionables${query.size ? `?${query}` : ''}`, { signal })))
    if (result.data.some(item => item.usuario_id === actorId)) throw new ParticipacionContratoError()
    return result
  }
  static async preparar(identityValue: RegistroIdentity, signal?: AbortSignal): Promise<PreparacionOReciboRegistro> {
    const identity = validarRegistroIdentity(identityValue)
    const response = await identityRequest(identity, '/participacion/comandos/preparaciones', { method: 'POST', signal, body: JSON.stringify({ comando_id: identity.comando_id, operacion: operation, subcampania_id: identity.subcampania_id }) })
    return isTerminal(response.body) ? terminal(response, identity) : validarPreparacionRegistro(successful(response), identity)
  }
  static async subirCarga(identityValue: RegistroIdentity, cargaId: string, file: File, signal?: AbortSignal): Promise<CargaRegistroLectura> {
    const identity = validarRegistroIdentity(identityValue), carga_id = validarRegistroComandoId(cargaId)
    if (!(file instanceof File) || file.size < 1 || file.size > REGISTRO_FOTO_MAX_BYTES || getImageFileValidationError(file)) throw new ParticipacionContratoError('La foto debe ser JPG, PNG, WEBP, HEIC o HEIF y pesar hasta 10 MiB.')
    const form = new FormData(); form.append('foto', file)
    const response = await identityRequest(identity, `/participacion/comandos/${identity.comando_id}/cargas/${carga_id}?${operationQuery}`, { method: 'PUT', signal, body: form })
    if (![200, 201, 202].includes(response.status)) throw outsideError(response)
    return validarCargaRegistro(response.body, carga_id)
  }
  static async listarCargas(identityValue: RegistroIdentity, signal?: AbortSignal): Promise<CargasRegistroLectura> {
    const identity = validarRegistroIdentity(identityValue)
    return validarCargasRegistro(successful(await identityRequest(identity, `/participacion/comandos/${identity.comando_id}/cargas?${operationQuery}`, { signal })))
  }
  static async preview(identityValue: RegistroIdentity, cargaId: string, signal?: AbortSignal): Promise<PreviewRegistroLectura> {
    const identity = validarRegistroIdentity(identityValue)
    return validarPreviewRegistro(successful(await identityRequest(identity, `/participacion/cargas/${validarRegistroComandoId(cargaId)}/preview`, { signal })))
  }
  static async cancelar(identityValue: RegistroIdentity, signal?: AbortSignal): Promise<ReciboRegistro> {
    const identity = validarRegistroIdentity(identityValue)
    return terminal(await identityRequest(identity, `/participacion/comandos/${identity.comando_id}/descarte-preparacion`, { method: 'POST', signal, body: JSON.stringify({ operacion: operation }) }), identity)
  }
  static async enviar(identityValue: IntentoRegistro, signal?: AbortSignal): Promise<ReciboRegistro> {
    const identity = validarRegistroIdentity(identityValue)
    if (!identity.payload) throw new ParticipacionContratoError('La confirmación requiere conservar el contenido completo del registro.')
    return terminal(await identityRequest(identity, '/plantaciones/iniciales', { method: 'POST', signal, body: JSON.stringify(identity.payload) }), identity)
  }
  static async recuperar(identityValue: RegistroIdentity, signal?: AbortSignal): Promise<ReciboRegistro> {
    const identity = validarRegistroIdentity(identityValue)
    return terminal(await identityRequest(identity, `/participacion/comandos/${identity.comando_id}?${operationQuery}`, { signal }), identity, true)
  }
  static async detallePropio(actorId: string, registroId: string, signal?: AbortSignal): Promise<DetallePropioRegistroLectura> {
    // La lectura histórica usa la sesión vigente; no depende de capacidades operativas.
    return validarDetallePropioRegistro(successful(await requestPrivada(`/plantaciones/${validarId(registroId)}/detalle-propio`, { signal })), validarId(actorId), registroId)
  }
  // Endpoint binario público de D: no añadir Bearer ni abrir originales/previews privados.
  static imagenPublicaUrl(evidenciaId: string): string { return `${PARTICIPACION_API_URL}/impact/imagenes/${validarId(evidenciaId)}` }
}
