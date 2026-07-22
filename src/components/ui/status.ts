import type { BadgeVariant } from './Badge'

/**
 * Único mapa estado (dominio) → variante de color de badge.
 * Reemplaza los 6 mapas duplicados (recoleccionStatus, lote.mapper, dispatchFlow,
 * stageFilters, ViveroLotCard, dashboardAggregates). Ver FRONTEND_UI_STANDARD.md §5.
 *
 * SOLO presentación. La etiqueta de texto y la resolución del estado siguen
 * viviendo en los mappers de cada módulo. Los valores se sembraron desde los
 * colores actuales para preservar paridad visual; se completa al migrar cada módulo.
 */
export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // Recolección — estado de registro
  BORRADOR: 'warning', // hoy amber
  PENDIENTE_VALIDACION: 'warning',
  VALIDADO: 'success', // hoy emerald
  RECHAZADO: 'danger',
  // Recolección — estado operativo
  ABIERTO: 'info', // hoy cyan → se consolida a info (sky), distinto de VALIDADO
  CERRADO: 'neutral',
  // Vivero — estado de lote
  ACTIVO: 'success',
  FINALIZADO: 'neutral',
}

export function statusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return 'neutral'
  return STATUS_VARIANT[status.trim().toUpperCase()] ?? 'neutral'
}
