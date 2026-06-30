import type { EvidenciaDto, LoteViveroItem } from '../types/contracts'
import type { ViveroLotCardData, ViveroLotDetailView } from '../types/view-models'
import type { TimelineEventDto, TipoEventoVivero } from '../types/contracts'
import type { ViveroLotEventView } from '../types/view-models'

const VALID_KINDS = new Set<TipoEventoVivero>([
  'INICIO',
  'EMBOLSADO',
  'ADAPTABILIDAD',
  'MERMA',
  'DESPACHO',
  'CIERRE_AUTOMATICO',
]);

// TODO(p1 — datos no expuestos restantes):
//   • recoleccion.saldo_actual     → si la recolección origen sigue con saldo.
//   • recoleccion.estado_operativo → ABIERTO/CERRADO.
//   Útiles para mostrar contexto del origen en ViveroDetailScreen.
//
// TODO(estructural — fuera de P1):
//   La sección "Datos de origen" hoy mezcla campos de origen
//   (recolección, comunidad) con metadatos del lote (vivero, responsable,
//   fechas). Cuando se rediseñe el detail, separar en 2 secciones distintas:
//   "Origen" (recolección + comunidad + tipo material) vs
//   "Lote" (vivero + responsable + fechas).

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
  // `nombre_comercial_snapshot` y `nombre_cientifico_snapshot` están garantizados
  // (el backend los hereda al crear el lote). El nombre comercial se usa como
  // etiqueta principal porque es el nombre operativo visible para el usuario.
  // Fallback final 'Sin especie' como red de seguridad: si los tres vienen
  // como string vacío (caso improbable según contrato pero posible si llega
  // data legacy o un endpoint distinto), evita devolver "" y romper labels UI.
  return (
    lot.nombre_comercial_snapshot ||
    lot.planta?.nombre_comun_principal ||
    lot.planta?.especie ||
    lot.nombre_cientifico_snapshot ||
    'Sin especie'
  )
}

export function mapLoteToCardData(lot: LoteViveroItem): ViveroLotCardData {
  return {
    id: lot.id,
    codigo: lot.codigo_trazabilidad || `VIV-${lot.id}`,
    especie: getLotSpecies(lot),
    estadoLote: lot.estado_lote,
    subetapaActual: lot.subetapa_actual ?? null,
    plantasVivasIniciales: lot.plantas_vivas_iniciales,
    fechaInicio: lot.fecha_inicio,
    diasDesdeInicio: daysBetween(lot.fecha_inicio),
    cantidadInicial: lot.cantidad_inicial_en_proceso,
    cantidadActual: getCurrentBalance(lot),
    unidadMedida: lot.unidad_medida_inicial,
    vivero: lot.vivero?.nombre || `Vivero #${lot.vivero_id}`,
    saldoAsignadoTotal: lot.saldo_asignado_total,
    saldoVivoDisponibleAsignacion: lot.saldo_vivo_disponible_asignacion,
    cantidadAsignacionesActivas: lot.cantidad_asignaciones_activas,
  }
}

export function mapLoteToDetailView(lot: LoteViveroItem): ViveroLotDetailView {
  const especie = getLotSpecies(lot)
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
    especie,
    nombreCientifico:
      lot.nombre_cientifico_snapshot || lot.planta?.nombre_cientifico || 'Sin nombre científico',
    nombreComercial: lot.nombre_comercial_snapshot || lot.planta?.nombre_comun_principal || especie,
    variedad: lot.planta?.variedad || lot.variedad_snapshot || null,
    plantaImagenUrl: lot.planta?.imagen_url || null,
    viveroNombre: lot.vivero?.nombre || `Vivero #${lot.vivero_id}`,
    viveroCodigo: lot.vivero?.codigo || 'N/D',
    responsableNombre,
    responsableUsername: lot.responsable?.username || null,
    recoleccionId: lot.recoleccion_id,
    recoleccionCodigo: lot.recoleccion?.codigo_trazabilidad || `REC-${lot.recoleccion_id}`,
    recoleccionFecha: lot.recoleccion?.fecha ?? null,
    recoleccionTipoMaterial: lot.recoleccion?.tipo_material || lot.tipo_material_snapshot,
    nombreComunidadOrigen: lot.nombre_comunidad_origen_snapshot,
    createdAt: lot.created_at,
    updatedAt: lot.updated_at,
    saldoAsignadoTotal: lot.saldo_asignado_total,
    saldoVivoDisponibleAsignacion: lot.saldo_vivo_disponible_asignacion,
    cantidadAsignacionesActivas: lot.cantidad_asignaciones_activas,
  }
}

export function mapTimelineEventToView(e: TimelineEventDto): ViveroLotEventView | null {
  if (!VALID_KINDS.has(e.tipo_evento as TipoEventoVivero)) return null;

  const p = e.payload as Record<string, unknown> | undefined;

  const cantidadRaw = typeof p?.cantidad_afectada === 'number'
    ? p.cantidad_afectada
    : (typeof p?.plantas_vivas_iniciales === 'number' ? p.plantas_vivas_iniciales : null);

  return {
    id: e.id,
    kind: (e.tipo_evento as TipoEventoVivero) || 'INICIO',
    label: e.label || `${e.tipo_evento?.replace(/_/g, ' ') || 'Evento'} registrado`,
    fecha: e.fecha_evento ? new Date(e.fecha_evento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha',
    fechaIso: e.fecha_evento || new Date().toISOString(),
    // Se oculta temporalmente la hora. El backend está enviando
    // timestamps sin tiempo real (00:00:00 UTC), lo que en GMT-4 resulta en "20:00" falso.
    hora: null,
    responsableNombre: e.responsable_nombre || 'Operador de campo',
    cantidad: cantidadRaw,
    saldoAntes: typeof p?.saldo_vivo_antes === 'number' ? p.saldo_vivo_antes : null,
    saldoDespues: typeof p?.saldo_vivo_despues === 'number' ? p.saldo_vivo_despues : null,
    observacion: e.observaciones || null,
    causa: (p?.causa_merma as string | undefined) || null,
    subetapa: (p?.subetapa_destino as string | undefined) || null,
    destino: (p?.destino_tipo as string | undefined) || null,
    referencia: (p?.destino_referencia as string | undefined) || null,
    comunidad: (p?.comunidad_destino as string | undefined) || null,
    materialIngresado: (p?.material_ingresado as string | undefined) || null,
    sustrato: (p?.sustrato as string | undefined) || null,

    fotos: (e.evidencias || []).map((f: EvidenciaDto) => ({
      id: f.id,
      url: f.public_url || '',
      titulo: f.titulo || 'Evidencia técnica',
      fecha: f.tomado_en ? new Date(f.tomado_en).toLocaleDateString('es-ES') : (e.fecha_evento || 'Sin fecha')
    }))
  };
}
