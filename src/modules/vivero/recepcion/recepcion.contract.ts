import { validarId, validarRevision } from '../../participacion/api/participacion.contract'

export type EntradaRecepcion = { comando_id: string; revision_esperada: string; cantidad_recibida: number; unidad_recibida: 'G'|'KG'|'UNIDAD'; fecha_recepcion: string; evidencia_ids: string[]; incidencia_id?: string; motivo_resolucion?: string }
export type IntencionRecepcion = { actor_id: string; recoleccion_id: string; entrada: EntradaRecepcion }
export type OrigenRecepcion = {
  recoleccion_id: string; vivero_id: string; recolector_id: string; codigo_trazabilidad: string; fecha_recoleccion: string; tipo_material: string
  nombre_cientifico_snapshot: string|null; nombre_comercial_snapshot: string|null; nombre_recolector_snapshot: string|null
  cantidad_declarada: number; unidad_declarada: 'G'|'UNIDAD'; saldo_actual: number; revision: string; estado_registro: string
  recepcion: { id: string; fecha_recepcion: string; recibido_por: string; registrado_en: string }|null
  incidencia: { id: string; cantidad_observada: number; unidad_observada: string; fecha_recepcion: string; registrado_en: string }|null
  requiere_conciliacion: boolean; puede_recibir_validar: boolean
}
export type HistorialRecepcion = { id: string; clase: 'CONFORME'|'INCIDENCIA'; actor_id: string; cantidad_declarada: number; unidad_declarada: string; cantidad_observada: number; unidad_observada: string; fecha_recepcion: string; incidencia_id: string|null; motivo_resolucion: string|null; registrado_en: string }
export type DetalleRecepcion = OrigenRecepcion & { historial: HistorialRecepcion[]; evidencias: { id: string; public_url: string; titulo: string; mime_type: string; observacion_id: string|null }[] }
export type ReciboRecepcion = { comando_id: string; estado: 'CONFIRMADO'|'INCIDENCIA'|'RECHAZADO'|'SIN_RESULTADO'|'CONFLICTO_CLAVE'; resultado: {
  recoleccion_id: string; vivero_id: string; observacion_id: string; recepcion_id: string|null; incidencia_id: string|null
  revision_anterior: string; revision_nueva: string; cantidad_recibida: number; unidad_recibida: string; fecha_recepcion: string; recibido_por: string
  saldo_actual: number; estado_registro: string; anclaje_externo: 'PENDIENTE_NO_EJECUTADO'
}|null; error: { codigo: string }|null; finalizado_en: string|null }
const assert: (v: unknown) => asserts v = v => { if (!v) throw new Error('La respuesta de recepción no cumple el contrato. Conserva la misma operación para recuperarla.') }
const obj = (v: unknown): Record<string, unknown> => { assert(v && typeof v==='object' && !Array.isArray(v)); return v as Record<string, unknown> }
const validarComandoId = (v: unknown) => assert(typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v))
const numero = (v: unknown) => assert(typeof v==='number' && Number.isFinite(v))
const fecha = (v: unknown) => assert(typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v)
const instante = (v: unknown) => assert(typeof v==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)))
export function validarIntencionRecepcion(value: unknown): IntencionRecepcion {
  const i=obj(value), e=obj(i.entrada); validarId(i.actor_id);validarId(i.recoleccion_id);validarComandoId(e.comando_id);validarRevision(e.revision_esperada)
  assert(Object.keys(i).length===3 && Object.keys(e).every(k=>['comando_id','revision_esperada','cantidad_recibida','unidad_recibida','fecha_recepcion','evidencia_ids','incidencia_id','motivo_resolucion'].includes(k)))
  numero(e.cantidad_recibida);assert(Number(e.cantidad_recibida)>0 && ['G','KG','UNIDAD'].includes(String(e.unidad_recibida)));fecha(e.fecha_recepcion)
  assert(Array.isArray(e.evidencia_ids) && e.evidencia_ids.length>=1 && e.evidencia_ids.length<=5 && new Set(e.evidencia_ids).size===e.evidencia_ids.length); e.evidencia_ids.forEach(v=>validarId(v))
  if (e.incidencia_id!==undefined || e.motivo_resolucion!==undefined) { validarId(e.incidencia_id);assert(typeof e.motivo_resolucion==='string' && e.motivo_resolucion.trim().length>=10 && e.motivo_resolucion.length<=500) }
  return structuredClone(value) as IntencionRecepcion
}
export function validarOrigenRecepcion(value: unknown, detalle=false): OrigenRecepcion | DetalleRecepcion {
  const o=obj(value);for (const k of ['recoleccion_id','vivero_id','recolector_id']) validarId(o[k]);validarRevision(o.revision)
  for (const k of ['codigo_trazabilidad','tipo_material','estado_registro']) assert(typeof o[k]==='string')
  for (const k of ['nombre_cientifico_snapshot','nombre_comercial_snapshot','nombre_recolector_snapshot']) assert(o[k]===null || typeof o[k]==='string')
  fecha(o.fecha_recoleccion);numero(o.cantidad_declarada);numero(o.saldo_actual);assert(['G','UNIDAD'].includes(String(o.unidad_declarada)))
  for (const k of ['requiere_conciliacion','puede_recibir_validar']) assert(typeof o[k]==='boolean')
  if(o.recepcion!==null) { const r=obj(o.recepcion);validarId(r.id);validarId(r.recibido_por);fecha(r.fecha_recepcion);instante(r.registrado_en) }
  if(o.incidencia!==null) { const r=obj(o.incidencia);validarId(r.id);numero(r.cantidad_observada);assert(['G','UNIDAD'].includes(String(r.unidad_observada)));fecha(r.fecha_recepcion);instante(r.registrado_en) }
  if(detalle) {
    assert(Array.isArray(o.historial) && Array.isArray(o.evidencias))
    for(const v of o.historial) { const h=obj(v);validarId(h.id);validarId(h.actor_id);assert(['CONFORME','INCIDENCIA'].includes(String(h.clase)));numero(h.cantidad_observada);fecha(h.fecha_recepcion);instante(h.registrado_en);if(h.incidencia_id!==null) validarId(h.incidencia_id) }
    for(const v of o.evidencias) { const e=obj(v);validarId(e.id);assert(typeof e.public_url==='string' && /^https?:\/\//.test(e.public_url));assert(typeof e.titulo==='string' || e.titulo===null);if(e.observacion_id!==null) validarId(e.observacion_id) }
  }
  return value as OrigenRecepcion | DetalleRecepcion
}
export function validarReciboRecepcion(value: unknown, intento: IntencionRecepcion): ReciboRecepcion {
  const b=obj(value);assert(Object.keys(b).length===5 && ['comando_id','estado','resultado','error','finalizado_en'].every(k=>k in b) && b.comando_id===intento.entrada.comando_id)
  assert(['CONFIRMADO','INCIDENCIA','RECHAZADO','SIN_RESULTADO','CONFLICTO_CLAVE'].includes(String(b.estado)))
  if(b.estado==='CONFIRMADO' || b.estado==='INCIDENCIA') {
    instante(b.finalizado_en);assert(b.error===null);const r=obj(b.resultado)
    for(const k of ['recoleccion_id','vivero_id','observacion_id','recibido_por']) validarId(r[k])
    assert(r.recoleccion_id===intento.recoleccion_id && r.recibido_por===intento.actor_id && r.revision_anterior===intento.entrada.revision_esperada)
    assert(BigInt(validarRevision(r.revision_nueva))===BigInt(validarRevision(r.revision_anterior))+1n)
    if(b.estado==='CONFIRMADO') { validarId(r.recepcion_id);assert(r.estado_registro==='VALIDADO') } else {validarId(r.incidencia_id);assert(r.recepcion_id===null)}
    numero(r.cantidad_recibida);numero(r.saldo_actual);fecha(r.fecha_recepcion);assert(r.anclaje_externo==='PENDIENTE_NO_EJECUTADO')
  } else { assert(b.resultado===null);if(b.estado==='RECHAZADO') {instante(b.finalizado_en);assert(typeof obj(b.error).codigo==='string')} else {assert(b.finalizado_en===null);if(b.estado==='SIN_RESULTADO') assert(b.error===null);else assert(obj(b.error).codigo==='CLAVE_REUTILIZADA')} }
  return value as ReciboRecepcion
}
export function validarColaRecepcion(value: unknown) {
  const v=obj(value);assert(Array.isArray(v.data));if(v.siguiente_antes_de_id!==null) validarId(v.siguiente_antes_de_id)
  return { data:v.data.map(o=>validarOrigenRecepcion(o) as OrigenRecepcion),siguiente_antes_de_id:v.siguiente_antes_de_id as string|null }
}
