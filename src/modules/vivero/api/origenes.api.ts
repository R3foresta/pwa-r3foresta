import { verificarActorParticipacion } from '../../participacion/api/participacion.api'
import { requestPrivada } from '../../participacion/api/participacion.transport'
import { validarId } from '../../participacion/api/participacion.contract'
import { exactId } from '../../accesos/accessPolicy'
import { fail, object, row, text } from '../../accesos/accesos.contract'

const ESTADOS_HABILITACION = [
  'RECEPCION_CONFORME',
  'PENDIENTE_RECEPCION',
] as const
export type EstadoHabilitacion = typeof ESTADOS_HABILITACION[number]

export type OrigenMaterial = {
  recoleccion_id: string; vivero_almacenamiento_id: string; recolector_id: string; planta_id: string | null
  codigo_trazabilidad: string | null; fecha: string; tipo_material: 'SEMILLA' | 'ESQUEJE'
  nombre_cientifico_snapshot: string | null; nombre_comercial_snapshot: string | null; variedad_snapshot: string | null
  estado_registro: 'VALIDADO'; estado_operativo: 'ABIERTO'; saldo_actual: number; unidad_canonica: 'G' | 'UNIDAD'
  estado_habilitacion: EstadoHabilitacion
  motivo_no_inicio?: string | null; saldo_actual_exacto?: string
}
export function esMaterialHabilitado(origen: OrigenMaterial): boolean {
  return origen.estado_habilitacion === 'RECEPCION_CONFORME'
}

export function esOrigenAptoParaInicio(origen: OrigenMaterial): boolean {
  return esMaterialHabilitado(origen) && origen.motivo_no_inicio === null
}

export type OrigenesLectura = { success: true; data: OrigenMaterial[]; pagination: { page: number; limit: number; total: number } }
function snapshot(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return fail()
  return value.trim() ? value : null
}

export function validarOrigenes(value: unknown, viveroId: string, page: number, incluirRequisitosInicio = false): OrigenesLectura {
  const input = row(value, ['success', 'data', 'pagination'])
  const pagination = row(input.pagination, ['page', 'limit', 'total'])
  if (input.success !== true || !Array.isArray(input.data) || pagination.page !== page ||
    pagination.limit !== 20 || typeof pagination.total !== 'number' ||
    !Number.isSafeInteger(pagination.total) || pagination.total < 0) return fail()

  const data = input.data.map((value): OrigenMaterial => {
    const item = row(value, [
      'recoleccion_id', 'vivero_almacenamiento_id', 'recolector_id', 'codigo_trazabilidad', 'fecha',
      'planta_id', 'tipo_material', 'nombre_cientifico_snapshot', 'nombre_comercial_snapshot',
      'variedad_snapshot', 'estado_registro', 'estado_operativo', 'saldo_actual', 'unidad_canonica',
      'estado_habilitacion',
      ...(incluirRequisitosInicio ? ['motivo_no_inicio', 'saldo_actual_exacto'] : []),
    ])
    const estado = ESTADOS_HABILITACION.find(estado => estado === item.estado_habilitacion)
    if (validarId(item.vivero_almacenamiento_id) !== viveroId ||
      item.tipo_material !== 'SEMILLA' && item.tipo_material !== 'ESQUEJE' ||
      item.estado_registro !== 'VALIDADO' || item.estado_operativo !== 'ABIERTO' ||
      item.unidad_canonica !== 'G' && item.unidad_canonica !== 'UNIDAD' ||
      typeof item.saldo_actual !== 'number' || !Number.isFinite(item.saldo_actual) || item.saldo_actual <= 0 ||
      (item.codigo_trazabilidad !== null && typeof item.codigo_trazabilidad !== 'string') || !estado) return fail()

    let requisitosInicio: Pick<OrigenMaterial, 'motivo_no_inicio' | 'saldo_actual_exacto'> = {}
    if (incluirRequisitosInicio) {
      const motivo = item.motivo_no_inicio === null ? null : text(item.motivo_no_inicio)
      const saldoExacto = text(item.saldo_actual_exacto)
      if (!/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(saldoExacto) || Number(saldoExacto) !== item.saldo_actual ||
        (motivo === null && estado !== 'RECEPCION_CONFORME')) return fail()
      requisitosInicio = { motivo_no_inicio: motivo, saldo_actual_exacto: saldoExacto }
    }
    return {
      ...requisitosInicio,
      recoleccion_id: validarId(item.recoleccion_id),
      vivero_almacenamiento_id: viveroId,
      recolector_id: validarId(item.recolector_id),
      planta_id: item.planta_id === null ? null : validarId(item.planta_id),
      codigo_trazabilidad: item.codigo_trazabilidad,
      fecha: text(item.fecha),
      tipo_material: item.tipo_material,
      nombre_cientifico_snapshot: snapshot(item.nombre_cientifico_snapshot),
      nombre_comercial_snapshot: snapshot(item.nombre_comercial_snapshot),
      variedad_snapshot: snapshot(item.variedad_snapshot),
      estado_registro: 'VALIDADO',
      estado_operativo: 'ABIERTO',
      saldo_actual: item.saldo_actual,
      unidad_canonica: item.unidad_canonica,
      estado_habilitacion: estado,
    }
  })
  if (new Set(data.map(item => item.recoleccion_id)).size !== data.length || data.length > 20) return fail()
  return { success: true, data, pagination: { page, limit: 20, total: pagination.total } }
}
export const OrigenesService = {
  async listar(actorId: string, viveroId: string, page = 1, signal?: AbortSignal, incluirRequisitosInicio = false): Promise<OrigenesLectura> {
    const user = validarId(actorId), vivero = exactId(viveroId)
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return fail()
    const token = await verificarActorParticipacion(user, signal)
    const query = new URLSearchParams({ vivero_id: vivero, page: String(page), limit: '20', incluir_pendientes: 'true' })
    if (incluirRequisitosInicio) query.set('incluir_requisitos_inicio', 'true')
    const response = await requestPrivada(`/vivero/origenes?${query}`, { signal }, token)
    if (response.status === 401) throw new Error('La sesión venció. Ingresa nuevamente para consultar el material.')
    if (response.status === 403) throw new Error('Tu cuenta no tiene acceso a este vivero.')
    if (response.status !== 200) throw new Error('No se pudo consultar el material de origen.')
    return validarOrigenes(response.body, vivero, page, incluirRequisitosInicio)
  },
}
// El catálogo público legado puede emitir IDs numéricos seguros o cadenas BIGINT.
export function validarViveroCatalogoId(value: unknown): string { return exactId(object(value).id) }
