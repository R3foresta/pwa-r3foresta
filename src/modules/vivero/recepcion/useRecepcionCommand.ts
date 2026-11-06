import { useEffect, useRef, useState } from 'react'
import { cargarIntencionRecepcion, guardarIntencionRecepcion, recepcionStoreKey, RecepcionService } from './recepcion.api'
import type { EntradaRecepcion, IntencionRecepcion, ReciboRecepcion } from './recepcion.contract'

export function useRecepcionCommand(actor: string) {
  const [pending,setPending]=useState<IntencionRecepcion|null>(()=>{try{return cargarIntencionRecepcion(actor)}catch{return null}})
  const [error,setError]=useState<string|null>(()=>{try{cargarIntencionRecepcion(actor);return null}catch{return 'No se pudo leer la operación guardada. Conserva los datos locales y recupera con la cuenta original.'}})
  const [receipt,setReceipt]=useState<ReciboRecepcion|null>(null),[busy,setBusy]=useState(false),[missing,setMissing]=useState(false)
  const working=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null)
  useEffect(()=>{
    alive.current=true
    const sync=()=>{try{setPending(cargarIntencionRecepcion(actor))}catch{setError('No se pudo leer la recepción pendiente.')}}
    window.addEventListener('storage',sync)
    return ()=>{alive.current=false;controller.current?.abort();window.removeEventListener('storage',sync)}
  },[actor])
  async function run(i: IntencionRecepcion,recover: boolean) {
    const r=await RecepcionService.comando(i,recover,controller.current?.signal)
    if(!alive.current)return
    setReceipt(r)
    if(['CONFIRMADO','INCIDENCIA','RECHAZADO'].includes(r.estado)) {
      if(cargarIntencionRecepcion(actor)?.entrada.comando_id===i.entrada.comando_id)localStorage.removeItem(recepcionStoreKey(actor))
      setPending(null);setMissing(false)
    } else {setMissing(r.estado==='SIN_RESULTADO');setError(r.estado==='SIN_RESULTADO'?'Aún no hay un resultado confirmado. Consulta otra vez o reenvía expresamente la misma intención.':'La clave pertenece a otra carga. Recupera el comando original. No crees otra intención.')}
  }
  async function act(task:()=>Promise<void>) {
    if(working.current)return;working.current=true;setBusy(true);setError(null);controller.current=new AbortController()
    try {await task()} catch(e) {if(alive.current)setError(e instanceof Error?e.message:'No se pudo determinar el resultado. Recupera la misma operación.')} finally {working.current=false;if(alive.current)setBusy(false)}
  }
  return {pending,error,receipt,busy,missing,setError,clearReceipt:()=>setReceipt(null),
    confirmar:(origen:string,entrada:Omit<EntradaRecepcion,'comando_id'|'evidencia_ids'>,files:File[])=>act(async()=>{
      if(cargarIntencionRecepcion(actor))throw new Error('Recupera primero la operación pendiente.')
      const ids=await RecepcionService.fotos(actor,origen,files,controller.current?.signal)
      const i:IntencionRecepcion={actor_id:actor,recoleccion_id:origen,entrada:{...entrada,comando_id:crypto.randomUUID(),evidencia_ids:ids}}
      guardarIntencionRecepcion(i);if(alive.current)setPending(i);await run(i,false)
    }),
    recuperar:()=>act(async()=>{const i=cargarIntencionRecepcion(actor);if(i)await run(i,true)}),
    reenviar:()=>act(async()=>{const i=cargarIntencionRecepcion(actor);if(i)await run(i,false)}),
  }
}
