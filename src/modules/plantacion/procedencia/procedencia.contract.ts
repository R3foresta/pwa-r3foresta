import { validarId } from '../../participacion/api/participacion.contract'
import type { ModalidadIncorporacion, ProcedenciaIncorporacion } from '../../vivero/types/contracts'

export type OrigenConsumo =
  | { tipo: 'RECOLECCION'; recoleccion_id: string; modalidad: null; procedencia: null }
  | { tipo: 'INCORPORACION'; recoleccion_id: null; modalidad: ModalidadIncorporacion; procedencia: ProcedenciaIncorporacion }
  | { tipo: 'HISTORICO_SIN_ORIGEN'; recoleccion_id: null; modalidad: null; procedencia: null }
export type ConsumoPersistido = {
  detalle_id: string
  asignacion_id: string
  lote_vivero_id: string
  codigo_lote: string
  planta_id: string
  cantidad: number
  nombre_cientifico_snapshot: string | null
  nombre_comercial_snapshot: string | null
  variedad_snapshot: string | null
  origen: OrigenConsumo
}
export type ProcedenciaRegistro = {
  data: { registro_plantacion_id: string; cantidad_total_plantada: number; criterio_atribucion: 'CONSUMOS_PERSISTIDOS'; consumos: ConsumoPersistido[] }
  observado_en: string
}
function invalid(): never { throw new Error('La procedencia recibida está incompleta o no corresponde al registro. Vuelve a consultar.') }
function row(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) return invalid()
  return record
}
function text(value: unknown): string { if (typeof value !== 'string') return invalid(); return value }
function nullableText(value: unknown): string | null { return value === null ? null : text(value) }
function quantity(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return invalid(); return value }
function origin(value: unknown): OrigenConsumo {
  const r = row(value, ['tipo', 'recoleccion_id', 'modalidad', 'procedencia'])
  if (r.tipo === 'RECOLECCION' && r.modalidad === null && r.procedencia === null) return { tipo: r.tipo, recoleccion_id: validarId(r.recoleccion_id), modalidad: null, procedencia: null }
  if (r.recoleccion_id !== null) return invalid()
  if (r.tipo === 'HISTORICO_SIN_ORIGEN' && r.modalidad === null && r.procedencia === null) return { tipo: r.tipo, recoleccion_id: null, modalidad: null, procedencia: null }
  if (r.tipo !== 'INCORPORACION' || !['RECEPCION', 'SALDO_INICIAL'].includes(String(r.modalidad))) return invalid()
  const allowed = r.modalidad === 'RECEPCION' ? ['COMPRA', 'DONACION'] : ['COMPRA', 'DONACION', 'PRODUCCION_PROPIA', 'DESCONOCIDA']
  if (!allowed.includes(String(r.procedencia))) return invalid()
  return { tipo: r.tipo, recoleccion_id: null, modalidad: r.modalidad as ModalidadIncorporacion, procedencia: r.procedencia as ProcedenciaIncorporacion }
}
export function validarProcedencia(value: unknown, registroId: string): ProcedenciaRegistro {
  const envelope = row(value, ['data', 'observado_en'])
  const data = row(envelope.data, ['registro_plantacion_id', 'cantidad_total_plantada', 'criterio_atribucion', 'consumos'])
  const id = validarId(data.registro_plantacion_id)
  if (id !== validarId(registroId) || data.criterio_atribucion !== 'CONSUMOS_PERSISTIDOS' || !Array.isArray(data.consumos) || !data.consumos.length) return invalid()
  const consumos = data.consumos.map(value => {
    const r = row(value, ['detalle_id', 'asignacion_id', 'lote_vivero_id', 'codigo_lote', 'planta_id', 'cantidad', 'nombre_cientifico_snapshot', 'nombre_comercial_snapshot', 'variedad_snapshot', 'origen'])
    return {
      detalle_id: validarId(r.detalle_id), asignacion_id: validarId(r.asignacion_id), lote_vivero_id: validarId(r.lote_vivero_id),
      codigo_lote: text(r.codigo_lote), planta_id: validarId(r.planta_id), cantidad: quantity(r.cantidad),
      nombre_cientifico_snapshot: nullableText(r.nombre_cientifico_snapshot), nombre_comercial_snapshot: nullableText(r.nombre_comercial_snapshot),
      variedad_snapshot: nullableText(r.variedad_snapshot), origen: origin(r.origen),
    }
  })
  const total = quantity(data.cantidad_total_plantada)
  const sum = consumos.reduce((n, consumo) => n + consumo.cantidad, 0)
  if (!Number.isSafeInteger(sum) || sum !== total || new Set(consumos.map(c => c.detalle_id)).size !== consumos.length) return invalid()
  const observado_en = text(envelope.observado_en)
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(observado_en) || !Number.isFinite(Date.parse(observado_en))) return invalid()
  return { data: { registro_plantacion_id: id, cantidad_total_plantada: total, criterio_atribucion: 'CONSUMOS_PERSISTIDOS', consumos }, observado_en }
}
