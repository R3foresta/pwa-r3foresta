import type { LoteViveroItem } from '../types/contracts'
import type { ViveroLotCardData, ViveroLotDetailView } from '../types/view-models'

// TODO(p0.1 — fallbacks obsoletos):
//   El backend endureció a NO nullable los campos snapshot:
//     • tipo_material_snapshot
//     • nombre_cientifico_snapshot
//     • nombre_comercial_snapshot
//   Los `?? 'SEMILLA'` y `|| 'N/D'` que hay abajo ya son código muerto.
//   Cuando trabajemos P0, sacarlos. Si TS deja de quejarse al borrarlos,
//   está confirmado que el contrato los garantiza.
//
// TODO(p1 — datos no expuestos):
//   Estos campos vienen del API pero no llegan a ningún view-model:
//     • nombre_comunidad_origen_snapshot  → RF-VIV-07 lo exige visible.
//     • recoleccion.fecha                  → "origen recolectado el dd/mm".
//     • recoleccion.saldo_actual           → si la recolección sigue abierta.
//     • recoleccion.estado_operativo       → ABIERTO/CERRADO.
//   Cuando rediseñemos ViveroDetailScreen, agregar al ViveroLotDetailView.

function daysBetween(start: string, end = new Date()): number {
  if (!start) return 0
  const datePart = start.includes('T') ? start.split('T')[0] : start
  const parts = datePart.split('-').map(Number)
  if (parts.length !== 3) return 0

  const startDate = new Date(parts[0], parts[1] - 1, parts[2])
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))
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
    plantasVivasIniciales: lot.plantas_vivas_iniciales,
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
    plantaImagenUrl: lot.planta?.imagen_url || null,
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
