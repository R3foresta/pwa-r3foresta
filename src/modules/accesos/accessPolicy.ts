import type { AccesoM1, AccesoM2, CapacidadVivero } from './types'
import { validarId } from '../participacion/api/participacion.contract'

// Compatibilidad con JSON legado: jamás transformar un Number ya redondeado en autoridad.
export function exactId(value: unknown): string {
  return validarId(typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value)
}
export function isExactId(value: unknown): boolean {
  try { exactId(value); return true } catch { return false }
}
export function sameId(a: unknown, b: unknown): boolean {
  try { return exactId(a) === exactId(b) } catch { return false }
}
export function canAtVivero(data: AccesoM2 | null, viveroId: unknown, action: CapacidadVivero): boolean {
  if (!data?.activo) return false
  let id: string
  try { id = exactId(viveroId) } catch { return false }
  const globalKey = action === 'recibir_y_validar' ? 'recibir_y_validar_cualquier_vivero' : action === 'desechar_semillas' ? 'desechar_semillas_cualquier_vivero' : 'operar_cualquier_vivero'
  return data.capacidades_globales[globalKey] || data.viveros.some(row => row.vivero_id === id && row.acceso_efectivo && row.capacidades[action])
}
export function hasViveroCapability(data: AccesoM2 | null, action: CapacidadVivero): boolean {
  if (!data?.activo) return false
  const globalKey = action === 'recibir_y_validar' ? 'recibir_y_validar_cualquier_vivero' : action === 'desechar_semillas' ? 'desechar_semillas_cualquier_vivero' : 'operar_cualquier_vivero'
  return data.capacidades_globales[globalKey] || data.viveros.some(row => row.acceso_efectivo && row.capacidades[action])
}
export function canMaintain(data: AccesoM1 | null, actorId: unknown, ownerId: unknown): boolean {
  return Boolean(data?.activo && data.capacidades.mantener_propias && (data.origen === 'ADMIN' || sameId(actorId, ownerId)))
}
export function canReview(data: AccesoM2 | null, actorId: unknown, ownerId: unknown, viveroId: unknown): boolean {
  return isExactId(actorId) && isExactId(ownerId) && !sameId(actorId, ownerId) && canAtVivero(data, viveroId, 'recibir_y_validar')
}
