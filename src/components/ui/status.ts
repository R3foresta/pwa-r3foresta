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
  // Vivero — etapa / sub-etapa (antes ETAPA_BADGE inline en ViveroLotCard)
  INICIO: 'info', // hoy sky
  EMBOLSADO: 'warning', // hoy amber
  ADAPTABILIDAD: 'info', // hoy blue → se consolida a info (sky)
  DESPACHO: 'success',
  // Plantación — estado derivado de campaña (antes ESTADO_CAMPANIA_META.tone)
  // BORRADOR ya definido arriba (warning): la campaña BORRADOR se consolida a esa variante.
  ACTIVA: 'success', // hoy emerald
  CREADA: 'neutral', // hoy slate
  EN_MANTENIMIENTO: 'info', // hoy cyan → info
  MONITOREO_HISTORICO: 'neutral', // hoy slate
  COMPLETADA: 'info', // hoy blue → info
  FINALIZADA_PARCIAL: 'warning', // hoy amber
}

export function statusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return 'neutral'
  return STATUS_VARIANT[status.trim().toUpperCase()] ?? 'neutral'
}
