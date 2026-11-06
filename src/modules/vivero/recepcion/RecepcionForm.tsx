import { useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button } from '../../../components/ui'
import { coincideCantidadRecepcion } from './recepcion.cantidad'
import type { DetalleRecepcion, EntradaRecepcion } from './recepcion.contract'
const hoyRecepcion = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export type RecepcionDraft = Omit<EntradaRecepcion,'comando_id'|'evidencia_ids'>
export default function RecepcionForm({origen,actor,busy,onConfirm}:{origen:DetalleRecepcion;actor:string;busy:boolean;onConfirm:(entrada:RecepcionDraft,fotos:File[])=>Promise<void>}) {
  const [cantidad,setCantidad]=useState(String(origen.cantidad_declarada)),[unidad,setUnidad]=useState<EntradaRecepcion['unidad_recibida']>(origen.unidad_declarada)
  const [fecha,setFecha]=useState(hoyRecepcion),[fotos,setFotos]=useState<File[]>([]),[motivo,setMotivo]=useState(''),[confirm,setConfirm]=useState(false),[error,setError]=useState<string|null>(null)
  const coincide=coincideCantidadRecepcion(Number(cantidad),unidad,origen.cantidad_declarada,origen.unidad_declarada)
  const entrada:RecepcionDraft={revision_esperada:origen.revision,cantidad_recibida:Number(cantidad),unidad_recibida:unidad,fecha_recepcion:fecha,
    ...(origen.incidencia?{incidencia_id:origen.incidencia.id,motivo_resolucion:motivo.trim()}: {})}
  return <form className="space-y-4 rounded-3xl bg-white p-5 shadow-soft" onSubmit={e=>{
    e.preventDefault();setError(null)
    if(!Number.isFinite(Number(cantidad)) || Number(cantidad)<=0 || unidad==='UNIDAD' && !Number.isInteger(Number(cantidad)))return setError('Indica una cantidad válida; UNIDAD exige entero.')
    if(fotos.length<1 || fotos.length>5 || fotos.some(f=>f.size>15*1024*1024))return setError('Adjunta de 1 a 5 fotos de hasta 15 MB cada una.')
    if(origen.incidencia && (!coincide || motivo.trim().length<10))return setError('La incidencia solo se resuelve con comprobación total conforme y motivo de al menos 10 caracteres.')
    setConfirm(true)
  }}>
    <h2 className="text-lg font-bold">{origen.incidencia?'Nueva comprobación física':'Recibir y validar'}</h2>
    <p>Declarado: <strong>{origen.cantidad_declarada} {origen.unidad_declarada}</strong>. Recolector: {origen.nombre_recolector_snapshot ?? origen.recolector_id}.</p>
    <label className="block">Cantidad recibida<input className="mt-1 min-h-12 w-full rounded-xl border p-3" type="number" min={unidad==='KG'?'0.000000001':unidad==='G'?'0.000001':'1'} step="any" required value={cantidad} disabled={busy} onChange={e=>setCantidad(e.target.value)}/></label>
    <label className="block">Unidad recibida<select className="mt-1 min-h-12 w-full rounded-xl border p-3" value={unidad} disabled={busy} onChange={e=>setUnidad(e.target.value as EntradaRecepcion['unidad_recibida'])}>
      <option value="UNIDAD">UNIDAD</option>{origen.tipo_material!=='ESQUEJE' && <><option value="G">G</option><option value="KG">kg</option></>}
    </select></label>
    <label className="block">Fecha física de recepción<input className="mt-1 min-h-12 w-full rounded-xl border p-3" type="date" required min={origen.fecha_recoleccion} max={hoyRecepcion()} value={fecha} disabled={busy} onChange={e=>setFecha(e.target.value)}/></label>
    <label className="block">Fotos de la comprobación<input className="mt-1 w-full rounded-xl border p-3" type="file" accept="image/*,.heic,.heif" multiple aria-required="true" disabled={busy} onChange={e=>setFotos(Array.from(e.target.files??[]))}/></label>
    {fotos.length>0 && <ul className="text-sm">{fotos.map((f,n)=><li key={n}>{f.name} · {Math.ceil(f.size/1024)} KB</li>)}</ul>}
    {origen.incidencia && <label className="block">Motivo de resolución<textarea className="mt-1 w-full rounded-xl border p-3" minLength={10} maxLength={500} required value={motivo} disabled={busy} onChange={e=>setMotivo(e.target.value)}/></label>}
    <p className={coincide?'text-brand-700':'text-amber-800'}>{coincide?'La recepción conforme valida la ficha y conserva su saldo M1.':'La diferencia registrará una incidencia. La ficha y el saldo no se aprueban ni consumen.'}</p>
    {error && <p role="alert" className="text-danger-700">{error}</p>}
    <Button type="submit" disabled={busy}>{busy?'Confirmando…':origen.incidencia?'Resolver con recepción conforme':'Recibir y validar'}</Button>
    <ConfirmDialog open={confirm} title={coincide?'Confirmar recepción conforme':'Confirmar incidencia física'} confirmLabel={coincide?'Recibir y validar':'Registrar incidencia'} loading={busy} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);void onConfirm(entrada,fotos)}}>
      <p>Origen {origen.codigo_trazabilidad} · Vivero {origen.vivero_id}</p><p>{cantidad} {unidad} · {fecha} · {fotos.length} foto(s)</p><p>Receptor: {actor}. Autor original: {origen.nombre_recolector_snapshot ?? origen.recolector_id}.</p>
      <p>{coincide?'Confirmo la recepción física total conforme. No se añade stock.':'Confirmo la diferencia observada; quedará pendiente de resolución.'}</p>
    </ConfirmDialog>
  </form>
}
