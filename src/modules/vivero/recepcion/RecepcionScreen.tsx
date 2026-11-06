import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { Button, Card } from '../../../components/ui'
import ConfirmDialog from '../../../components/ConfirmDialog'
import SuccessModal from '../../../components/SuccessModal'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { canAtVivero, hasViveroCapability, sameId } from '../../accesos/accessPolicy'
import { RecepcionService } from './recepcion.api'
import type { DetalleRecepcion, OrigenRecepcion } from './recepcion.contract'
import RecepcionForm from './RecepcionForm'
import { useRecepcionCommand } from './useRecepcionCommand'

function SessionRecepcion({actor}:{actor:string}) {
  const { id }=useParams(),[params]=useSearchParams(),{m2}=useOperationalAccess(),{login}=useAuth()
  const allowed=m2.status==='ready' && hasViveroCapability(m2.data,'operar')
  const [state,setState]=useState<{loading:boolean;error:string|null;list:OrigenRecepcion[];next:string|null;detail:DetalleRecepcion|null}>({loading:true,error:null,list:[],next:null,detail:null})
  const [version,setVersion]=useState(0),[retryConfirm,setRetryConfirm]=useState(false)
  const command=useRecepcionCommand(actor),cursor=params.get('antes_de_id')??undefined
  useEffect(()=>{
    const controller=new AbortController()
    const timer=window.setTimeout(()=>{
      setState({loading:allowed,error:null,list:[],next:null,detail:null})
      if(!allowed)return
      void (async()=>{
        try {
          if(id) {const detail=await RecepcionService.detalle(actor,id,controller.signal);if(!controller.signal.aborted)setState({loading:false,error:null,list:[],next:null,detail})}
          else {const q=await RecepcionService.cola(actor,cursor,controller.signal);if(!controller.signal.aborted)setState({loading:false,error:null,list:q.data,next:q.siguiente_antes_de_id,detail:null})}
        } catch(e) {if(!controller.signal.aborted)setState({loading:false,error:e instanceof Error?e.message:'No se pudo consultar recepción.',list:[],next:null,detail:null})}
      })()
    },0)
    return ()=>{window.clearTimeout(timer);controller.abort()}
  },[actor,id,cursor,allowed,m2.data,version])
  const d=state.detail && canAtVivero(m2.data,state.detail.vivero_id,'operar') ? state.detail : null
  const list=state.list.filter(o=>canAtVivero(m2.data,o.vivero_id,'operar'))
  const canReceive=Boolean(d && d.puede_recibir_validar && !sameId(actor,d.recolector_id) && canAtVivero(m2.data,d.vivero_id,'operar'))
  const closeReceipt=()=>{command.clearReceipt();setVersion(v=>v+1)}
  return <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-6 text-neutral-800">
    <Link className="inline-flex min-h-11 items-center underline" to={id?'/app/recepciones-semillas':'/app/vivero'}>{id?'Volver a recepciones':'Volver a Vivero'}</Link>
    <h1 className="text-2xl font-extrabold">Recepción de semillas y esquejes</h1>
    <p>Confirma el material de otro recolector en tu vivero. Aprobación documental y recepción física se muestran por separado.</p>
    {command.pending && <Card className="space-y-3 border-amber-300 bg-amber-50">
      <h2 className="font-bold">Recepción pendiente de confirmar</h2><p>Origen {command.pending.recoleccion_id} · {command.pending.entrada.cantidad_recibida} {command.pending.entrada.unidad_recibida} · {command.pending.entrada.fecha_recepcion}</p>
      <p>Conservamos la misma intención. Consulta el resultado antes de iniciar otra recepción.</p>
      <Button disabled={command.busy} onClick={()=>void command.recuperar()}>{command.busy?'Consultando…':'Recuperar resultado'}</Button>
      {command.missing && <Button disabled={command.busy} onClick={()=>setRetryConfirm(true)}>Reenviar la misma intención</Button>}
    </Card>}
    {command.error && <p role="alert" className="rounded-2xl bg-danger-50 p-4 text-danger-700">{command.error}</p>}
    {command.receipt?.estado==='RECHAZADO' && <Card><p role="alert">Operación rechazada: {command.receipt.error?.codigo}. Consulta de nuevo la ficha antes de corregir y confirmar otra intención.</p><Button onClick={closeReceipt}>Actualizar ficha</Button></Card>}
    {!allowed && <Card>{m2.status==='loading'?<p role="status">Consultando acceso M2…</p>:m2.status==='error' || m2.status==='sessionExpired'?<><p role="alert">{m2.error}</p><Button onClick={()=>void (m2.status==='sessionExpired'?login():m2.refresh())}>Reintentar acceso</Button></>:<p>Tu cuenta no tiene un vivero operativo asignado. La recuperación de tu operación propia sigue disponible.</p>}</Card>}
    {allowed && state.loading && <p role="status">Cargando recepción…</p>}
    {allowed && state.error && <Card><p role="alert">{state.error}</p><Button onClick={()=>setVersion(v=>v+1)}>Reintentar consulta</Button></Card>}
    {allowed && !state.loading && !state.error && !id && <>
      {list.length===0?<Card>No hay material pendiente de recepción en tus viveros.</Card>:<ul className="space-y-3">{list.map(o=><li key={o.recoleccion_id}><Card className="space-y-2">
        <h2 className="font-bold">{o.nombre_comercial_snapshot ?? o.nombre_cientifico_snapshot ?? o.codigo_trazabilidad}</h2><p>{o.codigo_trazabilidad} · Vivero {o.vivero_id}</p><p>{o.cantidad_declarada} {o.unidad_declarada} · {o.nombre_recolector_snapshot ?? o.recolector_id}</p>
        <p>{o.incidencia?'Incidencia física abierta':o.estado_registro==='VALIDADO'?'Aprobada documentalmente · sin recepción acreditada':'Pendiente de recibir y validar'}</p>
        {o.requiere_conciliacion && <p className="text-amber-800">Requiere conciliación histórica antes del corte.</p>}
        {sameId(actor,o.recolector_id) && <p>Tu recolección necesita otro receptor autorizado.</p>}
        <Link className="inline-flex min-h-11 items-center font-semibold underline" to={`/app/recepciones-semillas/${o.recoleccion_id}`}>Ver recepción</Link>
      </Card></li>)}</ul>}
      <nav className="flex flex-wrap gap-4">{cursor && <Link className="min-h-11 underline" to="/app/recepciones-semillas">Primera página</Link>}{state.next && <Link className="min-h-11 underline" to={`?antes_de_id=${state.next}`}>Siguiente página</Link>}</nav>
    </>}
    {allowed && !state.loading && d && <>
      <Card className="space-y-2"><h2 className="text-xl font-bold">{d.codigo_trazabilidad}</h2><p>{d.nombre_comercial_snapshot ?? d.nombre_cientifico_snapshot} · Vivero {d.vivero_id}</p><p>Recolector: {d.nombre_recolector_snapshot ?? d.recolector_id}. Recolección: {d.fecha_recoleccion}.</p>
        <p>Aprobación documental: {d.estado_registro==='VALIDADO'?'VALIDADO':d.estado_registro}.</p><p>Recepción física: {d.recepcion?`conforme el ${d.recepcion.fecha_recepcion}, receptor ${d.recepcion.recibido_por}`:'sin recepción conforme acreditada'}.</p>
        <p>Declarado: {d.cantidad_declarada} {d.unidad_declarada}. Saldo M1: {d.saldo_actual} {d.unidad_declarada}.</p>
      </Card>
      {d.incidencia && <Card className="border-amber-300 bg-amber-50"><h2 className="font-bold">Incidencia física abierta</h2><p>Observado: {d.incidencia.cantidad_observada} {d.incidencia.unidad_observada} el {d.incidencia.fecha_recepcion}. No habilita consumo ni desecho.</p><p>Resuelve mediante nueva comprobación total conforme. La corrección documental de faltantes requiere un procedimiento autorizado.</p></Card>}
      {d.requiere_conciliacion && <Card>Este origen tiene movimientos, saldo previo o fecha fuera de la ventana vigente. Requiere conciliación histórica; esta acción no repone stock ni inventa recepción.</Card>}
      {sameId(actor,d.recolector_id) && <Card>No puedes recibir tu propia recolección, incluso como ADMIN. Necesita otra persona autorizada.</Card>}
      {canReceive && !command.pending && !command.receipt && <RecepcionForm key={`${d.recoleccion_id}:${d.revision}`} origen={d} actor={actor} busy={command.busy} onConfirm={(entrada,fotos)=>command.confirmar(d.recoleccion_id,entrada,fotos)}/>}
      <Card className="space-y-3"><h2 className="font-bold">Evidencia autorizada</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{d.evidencias.map(e=><figure key={e.id}><a href={e.public_url} target="_blank" rel="noreferrer"><img className="aspect-square w-full rounded-xl object-cover" src={e.public_url} alt={e.titulo ?? 'Evidencia de recolección'} loading="lazy"/></a><figcaption className="text-sm">{e.observacion_id?'Comprobación física':'Evidencia de origen'}</figcaption></figure>)}</div><p className="text-xs">Las imágenes del bucket existente conservan su audiencia pública.</p></Card>
      {d.historial.length>0 && <Card><h2 className="font-bold">Historial de comprobaciones</h2><ol className="space-y-3">{d.historial.map(h=><li key={h.id} className="border-b py-3"><strong>{h.clase==='CONFORME'?'Conforme':'Incidencia'}</strong> · {h.cantidad_observada} {h.unidad_observada} · {h.fecha_recepcion}<p>Actor {h.actor_id}. Registrado: {h.registrado_en}.</p>{h.motivo_resolucion && <p>Resolución de incidencia {h.incidencia_id}: {h.motivo_resolucion}</p>}</li>)}</ol></Card>}
    </>}
    <ConfirmDialog open={retryConfirm} title="Reenviar la misma intención" description="Se utilizarán la misma clave, revisión, cantidad, fecha y evidencia. No se crea otra recepción." confirmLabel="Reenviar misma intención" onCancel={()=>setRetryConfirm(false)} onConfirm={()=>{setRetryConfirm(false);void command.reenviar()}}/>
    {(command.receipt?.estado==='CONFIRMADO' || command.receipt?.estado==='INCIDENCIA') && <SuccessModal title={command.receipt.estado==='CONFIRMADO'?'Recepción conforme confirmada':'Incidencia registrada'} description={command.receipt.estado==='CONFIRMADO'?'La recepción física y la validación están confirmadas en el sistema.':'Se conserva la diferencia observada. No se habilitó consumo ni desecho.'} summaryText={`${command.receipt.resultado?.cantidad_recibida} ${command.receipt.resultado?.unidad_recibida}`} primaryLabel="Ver estado actualizado" onPrimaryAction={closeReceipt}/>}
  </main>
}
export default function RecepcionScreen() {
  const {user}=useAuth()
  if(!user)return null
  return <SessionRecepcion key={`${user.id}:${user.auth_id}:${localStorage.getItem('authToken')??''}`} actor={user.id}/>
}
