import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { requestPrivada, successful } from '../../participacion/api/participacion.transport'
import { validarId } from '../../participacion/api/participacion.contract'
import { exactId } from '../../accesos/accessPolicy'
import { fail, object, row, text } from '../../accesos/accesos.contract'

export type OrigenMaterial = {
  recoleccion_id: string; vivero_almacenamiento_id: string; recolector_id: string; planta_id: string
  codigo_trazabilidad: string; fecha: string; tipo_material: 'SEMILLA' | 'ESQUEJE'
  nombre_cientifico_snapshot: string | null; nombre_comercial_snapshot: string | null; variedad_snapshot: string | null
  estado_registro: 'VALIDADO'; estado_operativo: 'ABIERTO'; saldo_actual: number; unidad_canonica: 'G' | 'UNIDAD'
}
export type OrigenesLectura = { success: true; data: OrigenMaterial[]; pagination: { page: number; limit: number; total: number } }
export function validarOrigenes(value: unknown, viveroId: string, page: number): OrigenesLectura {
  const input = row(value, ['success', 'data', 'pagination']), pagination = row(input.pagination, ['page', 'limit', 'total'])
  if (input.success !== true || !Array.isArray(input.data) || pagination.page !== page || pagination.limit !== 20 || !Number.isSafeInteger(pagination.total) || (pagination.total as number) < 0) return fail()
  const data = input.data.map((value): OrigenMaterial => {
    const item = row(value, ['recoleccion_id', 'vivero_almacenamiento_id', 'recolector_id', 'codigo_trazabilidad', 'fecha', 'planta_id', 'tipo_material', 'nombre_cientifico_snapshot', 'nombre_comercial_snapshot', 'variedad_snapshot', 'estado_registro', 'estado_operativo', 'saldo_actual', 'unidad_canonica'])
    if (validarId(item.vivero_almacenamiento_id) !== viveroId || !['SEMILLA', 'ESQUEJE'].includes(text(item.tipo_material)) || item.estado_registro !== 'VALIDADO' || item.estado_operativo !== 'ABIERTO' || !['G', 'UNIDAD'].includes(text(item.unidad_canonica)) || typeof item.saldo_actual !== 'number' || !Number.isFinite(item.saldo_actual) || item.saldo_actual <= 0) return fail()
    return { recoleccion_id: validarId(item.recoleccion_id), vivero_almacenamiento_id: viveroId, recolector_id: validarId(item.recolector_id), planta_id: validarId(item.planta_id), codigo_trazabilidad: text(item.codigo_trazabilidad), fecha: text(item.fecha), tipo_material: item.tipo_material as OrigenMaterial['tipo_material'], nombre_cientifico_snapshot: item.nombre_cientifico_snapshot === null ? null : text(item.nombre_cientifico_snapshot), nombre_comercial_snapshot: item.nombre_comercial_snapshot === null ? null : text(item.nombre_comercial_snapshot), variedad_snapshot: item.variedad_snapshot === null ? null : text(item.variedad_snapshot), estado_registro: 'VALIDADO', estado_operativo: 'ABIERTO', saldo_actual: item.saldo_actual, unidad_canonica: item.unidad_canonica as OrigenMaterial['unidad_canonica'] }
  })
  if (new Set(data.map(item => item.recoleccion_id)).size !== data.length || data.length > 20) return fail()
  return { success: true, data, pagination: { page, limit: 20, total: pagination.total as number } }
}
export const OrigenesService = {
  async listar(actorId: string, viveroId: string, page = 1, signal?: AbortSignal): Promise<OrigenesLectura> {
    const user = validarId(actorId), vivero = exactId(viveroId)
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return fail()
    const token = await verificarActorParticipacion(user, signal)
    const query = new URLSearchParams({ vivero_id: vivero, page: String(page), limit: '20' })
    return validarOrigenes(successful(await requestPrivada(`/vivero/origenes?${query}`, { signal }, token)), vivero, page)
  },
}
// El catálogo público legado puede emitir IDs numéricos seguros o cadenas BIGINT.
export function validarViveroCatalogoId(value: unknown): string { return exactId(object(value).id) }
