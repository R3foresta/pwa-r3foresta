import { outsideError, requestPrivada, successful } from '../../api/participacion.transport'
import { verificarActorParticipacion } from '../../api/participacion.api'
import type { ContextoCorreccionLectura, CorreccionObservacionesIntento, HistorialCorreccionesLectura, ReciboCorreccion } from '../types'
const op='CORREGIR_OBSERVACIONES_PLANTACION'
export class CorreccionesService {
 static async contexto(actor:string,registro:string,signal?:AbortSignal){const t=await verificarActorParticipacion(actor,signal);const r=await requestPrivada(`/plantaciones/${registro}/contexto-correccion`,{signal},t);if(r.status!==200)throw outsideError(r);return successful(r) as ContextoCorreccionLectura}
 static async historial(actor:string,registro:string,o:{limite?:number;cursor?:string}={},signal?:AbortSignal){const t=await verificarActorParticipacion(actor,signal);const q=new URLSearchParams();if(o.limite)q.set('limite',String(o.limite));if(o.cursor)q.set('cursor',o.cursor);const r=await requestPrivada(`/plantaciones/${registro}/historial-correcciones${q.size?'?'+q:''}`,{signal},t);if(r.status!==200)throw outsideError(r);return successful(r) as HistorialCorreccionesLectura}
 static async enviar(i:CorreccionObservacionesIntento,signal?:AbortSignal){const t=await verificarActorParticipacion(i.actor_id,signal);const r=await requestPrivada(`/plantaciones/${i.registro_id}/correcciones/observaciones`,{method:'POST',signal,body:JSON.stringify(i.payload)},t);if(![200,403,404,409,422].includes(r.status))throw outsideError(r);if(r.status!==200)throw outsideError(r);return successful(r) as ReciboCorreccion}
 static async recuperar(i:CorreccionObservacionesIntento,signal?:AbortSignal){const t=await verificarActorParticipacion(i.actor_id,signal);const r=await requestPrivada(`/participacion/comandos/${i.payload.comando_id}?operacion=${op}`,{signal},t);if(r.status!==200)throw outsideError(r);return successful(r) as ReciboCorreccion}
}
