import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { requestPrivada, outsideError, successful } from '../../participacion/api/participacion.transport'
import { validarId } from '../../participacion/api/participacion.contract'
import { validarColaRecepcion, validarIntencionRecepcion, validarOrigenRecepcion, validarReciboRecepcion, type DetalleRecepcion, type IntencionRecepcion } from './recepcion.contract'
const base='/recepcion-semillas'
async function token(actor: string, signal?: AbortSignal) { return verificarActorParticipacion(validarId(actor),signal) }
export const RecepcionService = {
  async cola(actor: string, antes?: string, signal?: AbortSignal) {
    const t=await token(actor,signal);return validarColaRecepcion(successful(await requestPrivada(`${base}${antes?'?antes_de_id='+validarId(antes):''}`,{signal},t)))
  },
  async detalle(actor: string, origen: string, signal?: AbortSignal) {
    const t=await token(actor,signal);const r=validarOrigenRecepcion(successful(await requestPrivada(`${base}/${validarId(origen)}`,{signal},t)),true) as DetalleRecepcion
    if(r.recoleccion_id!==origen) throw new Error('El detalle no corresponde al origen.');return r
  },
  async fotos(actor: string, origen: string, fotos: File[], signal?: AbortSignal) {
    const t=await token(actor,signal),form=new FormData();fotos.forEach(f=>form.append('fotos',f))
    const response=await requestPrivada(`${base}/${validarId(origen)}/evidencias`,{method:'POST',body:form,signal},t)
    if(![200,201].includes(response.status)) throw outsideError(response)
    const r=response.body as {evidencia_ids?:unknown}
    if(!Array.isArray(r?.evidencia_ids) || r.evidencia_ids.length!==fotos.length) throw new Error('No se pudo confirmar la carga de fotos.')
    return r.evidencia_ids.map(v=>validarId(v))
  },
  async comando(value: IntencionRecepcion, recuperar: boolean, signal?: AbortSignal) {
    const i=validarIntencionRecepcion(value),t=await token(i.actor_id,signal)
    const response=await requestPrivada(recuperar?`${base}/comandos/${i.entrada.comando_id}`:`${base}/${i.recoleccion_id}/recibir-validar`,recuperar?{signal}:{method:'POST',body:JSON.stringify(i.entrada),signal},t)
    if(recuperar ? ![200,202].includes(response.status) : ![200,403,404,409,422].includes(response.status)) throw outsideError(response)
    const recibo=validarReciboRecepcion(response.body,i)
    if(['CONFIRMADO','INCIDENCIA'].includes(recibo.estado) && response.status!==200) throw outsideError(response)
    return recibo
  },
}
export const recepcionStoreKey = (actor: string) => 'r3foresta:t4:recepcion:'+validarId(actor)
export function cargarIntencionRecepcion(actor: string): IntencionRecepcion|null {
  const raw=localStorage.getItem(recepcionStoreKey(actor));if(!raw)return null
  const i=validarIntencionRecepcion(JSON.parse(raw));if(i.actor_id!==actor)throw new Error('La intención guardada pertenece a otra cuenta.');return i
}
export function guardarIntencionRecepcion(i: IntencionRecepcion) {
  const existing=cargarIntencionRecepcion(i.actor_id)
  if(existing)throw new Error('Hay una recepción pendiente de recuperar en esta cuenta.')
  localStorage.setItem(recepcionStoreKey(i.actor_id),JSON.stringify(validarIntencionRecepcion(i)))
}
