import type { CapacidadSubcampania } from '../types'

export function canRegisterPlantacion(scope: CapacidadSubcampania) {
  return scope.estado === 'ACTIVA' && scope.acciones.preparar_registro && scope.acciones.registrar_inicial
}

export function scopeRole(scope: CapacidadSubcampania) {
  if (scope.fuente_autoridad === 'GLOBAL') return 'Administrador · Acceso global'
  return scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA' ? 'Administrador de subcampaña' : 'Plantador'
}
