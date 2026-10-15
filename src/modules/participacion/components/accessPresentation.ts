import type { AccionesParticipacion, CapacidadSubcampania, OperacionAcceso, PermisoContextual } from '../types'

export const ACCESS_ACTIONS: { operation: OperacionAcceso; capability: keyof AccionesParticipacion; label: string; consequence: string }[] = [
  { operation: 'OTORGAR_PLANTADOR', capability: 'incorporar_plantador', label: 'Habilitar plantador', consequence: 'Podrá plantar cuando la subcampaña esté activa y cumpla las validaciones de registro.' },
  { operation: 'RETIRAR_PLANTADOR', capability: 'retirar_plantador', label: 'Retirar plantador', consequence: 'Pierde el permiso contextual para plantar. Conserva sus registros históricos.' },
  { operation: 'DESIGNAR_ADMINISTRADOR', capability: 'designar_administrador', label: 'Designar administrador', consequence: 'Podrá gestionar plantadores y plantar en subcampañas activas. No cambia su rol global ni la logística.' },
  { operation: 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR', capability: 'cambiar_administrador', label: 'Cambiar administrador a plantador', consequence: 'Deja de administrar y conserva el permiso contextual para plantar. Debe permanecer otro administrador vigente.' },
  { operation: 'RETIRAR_ADMINISTRADOR', capability: 'retirar_administrador', label: 'Retirar administrador', consequence: 'Pierde todo acceso contextual. Conserva sus registros históricos. Debe permanecer otro administrador vigente.' },
  { operation: 'REEMPLAZAR_ADMINISTRADOR', capability: 'reemplazar_administrador', label: 'Reemplazar administrador', consequence: 'Se designa o conserva al reemplazo y se cambia al saliente en una sola operación. Debe mantenerse la continuidad de administración.' },
]

export function actionDefinition(operation: OperacionAcceso) {
  return ACCESS_ACTIONS.find((action) => action.operation === operation)!
}

export function permitsAction(scope: CapacidadSubcampania, operation: OperacionAcceso) {
  return scope.acciones[actionDefinition(operation).capability]
}

export function permissionLabel(permission: PermisoContextual | null) {
  if (permission === 'ADMINISTRADOR_SUBCAMPANIA') return 'Administrador de subcampaña'
  return permission === 'PLANTADOR' ? 'Plantador' : 'Sin permiso contextual'
}

export function nextPermission(operation: OperacionAcceso, treatment: 'PLANTADOR' | 'SIN_ACCESO'): PermisoContextual | null {
  if (operation === 'OTORGAR_PLANTADOR' || operation === 'CAMBIAR_ADMINISTRADOR_A_PLANTADOR') return 'PLANTADOR'
  if (operation === 'DESIGNAR_ADMINISTRADOR') return 'ADMINISTRADOR_SUBCAMPANIA'
  if (operation === 'REEMPLAZAR_ADMINISTRADOR') return treatment === 'PLANTADOR' ? 'PLANTADOR' : null
  return null
}

export function accessError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo consultar el acceso. Intenta nuevamente.'
}
