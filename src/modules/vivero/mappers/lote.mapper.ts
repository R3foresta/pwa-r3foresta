import type { LoteViveroItem } from '../types/contracts'
import type { ViveroLotCardData, ViveroLotDetailView } from '../types/view-models'

function daysBetween(start: string, end = new Date()): number {
  const startDate = new Date(`${start}T00:00:00`)
  if (Number.isNaN(startDate.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
}

function getCurrentBalance(lot: LoteViveroItem): number | null {
  if (typeof lot.saldo_vivo_actual === 'number') return lot.saldo_vivo_actual
  if (typeof lot.stock_vivo_actual === 'number') return lot.stock_vivo_actual
  return null
}

function getLotSpecies(lot: LoteViveroItem): string {
  return (
    lot.planta?.especie ||
    lot.nombre_comercial_snapshot ||
    lot.nombre_cientifico_snapshot ||
    'Sin especie'
  )
}

export function mapLoteToCardData(lot: LoteViveroItem): ViveroLotCardData {
  return {
    id: lot.id,
    codigo: lot.codigo_trazabilidad || `VIV-${lot.id}`,
    especie: getLotSpecies(lot),
    fuente: lot.tipo_material_snapshot ?? lot.recoleccion?.tipo_material ?? 'SEMILLA',
    estadoLote: lot.estado_lote,
    subetapaActual: lot.subetapa_actual ?? null,
    fechaInicio: lot.fecha_inicio,
    diasDesdeInicio: daysBetween(lot.fecha_inicio),
    cantidadInicial: lot.cantidad_inicial_en_proceso,
    cantidadActual: getCurrentBalance(lot),
    unidadMedida: lot.unidad_medida_inicial,
    vivero: lot.vivero?.nombre || `Vivero #${lot.vivero_id}`,
  }
}

export function mapLoteToDetailView(lot: LoteViveroItem): ViveroLotDetailView {
  const responsableNombre =
    lot.responsable?.nombre ||
    lot.nombre_responsable_snapshot ||
    lot.responsable?.username ||
    'Sin responsable'

  return {
    id: lot.id,
    codigo: lot.codigo_trazabilidad || `VIV-${lot.id}`,
    estadoLote: lot.estado_lote,
    subetapaActual: lot.subetapa_actual ?? null,
    motivoCierre: lot.motivo_cierre,
    fechaInicio: lot.fecha_inicio,
    diasDesdeInicio: daysBetween(lot.fecha_inicio),
    cantidadInicialEnProceso: lot.cantidad_inicial_en_proceso,
    unidadMedidaInicial: lot.unidad_medida_inicial,
    plantasVivasIniciales: lot.plantas_vivas_iniciales,
    saldoVivoActual: lot.saldo_vivo_actual,
    stockVivoActual: lot.stock_vivo_actual,
    especie: getLotSpecies(lot),
    nombreCientifico: lot.planta?.nombre_cientifico || lot.nombre_cientifico_snapshot || 'N/D',
    nombreComercial: lot.planta?.nombre_comun_principal || lot.nombre_comercial_snapshot || 'N/D',
    variedad: lot.planta?.variedad || lot.variedad_snapshot || null,
    viveroNombre: lot.vivero?.nombre || `Vivero #${lot.vivero_id}`,
    viveroCodigo: lot.vivero?.codigo || 'N/D',
    responsableNombre,
    responsableUsername: lot.responsable?.username || null,
    recoleccionCodigo: lot.recoleccion?.codigo_trazabilidad || `REC-${lot.recoleccion_id}`,
    recoleccionTipoMaterial: lot.recoleccion?.tipo_material || lot.tipo_material_snapshot || 'SEMILLA',
    createdAt: lot.created_at,
    updatedAt: lot.updated_at,
  }
}
