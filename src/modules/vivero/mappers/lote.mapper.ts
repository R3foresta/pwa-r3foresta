import { exactId } from '../../accesos/accessPolicy'
import type { LoteViveroDetalle, LoteViveroItem, TimelineEventDto, TipoEventoVivero } from '../types/contracts'
import type { OrigenLoteView, ViveroLotCardData, ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'
import { daysSinceViveroDate, formatViveroDate, formatViveroPhotoDate } from '../utils/presentation'

export const VALID_KINDS = new Set<TipoEventoVivero>([
  'INICIO', 'INCORPORACION', 'EMBOLSADO', 'DESCARTE_PRE_EMBOLSADO',
  'ADAPTABILIDAD', 'MERMA', 'DESPACHO', 'DEVOLUCION_PLANTACION', 'CIERRE_AUTOMATICO',
])

// Normalización de IDs en la frontera de lectura. Rechaza números JSON ya
// redondeados antes de que lleguen a navegación, formularios o evidencias.
export function normalizeLoteIds<T extends LoteViveroItem>(lot: T): T {
  const normalized = {
    ...lot, id: exactId(lot.id), vivero_id: exactId(lot.vivero_id),
    planta_id: exactId(lot.planta_id), responsable_id: exactId(lot.responsable_id),
    recoleccion_id: lot.recoleccion_id == null ? null : exactId(lot.recoleccion_id),
    origen: getOrigen(lot),
    recoleccion: lot.recoleccion ? { ...lot.recoleccion, id: exactId(lot.recoleccion.id) } : null,
    vivero: lot.vivero ? { ...lot.vivero, id: exactId(lot.vivero.id) } : null,
    planta: lot.planta ? { ...lot.planta, id: exactId(lot.planta.id) } : null,
    responsable: lot.responsable ? { ...lot.responsable, id: exactId(lot.responsable.id) } : null,
  }
  if ('ultimo_evento_por_tipo' in lot) {
    const detail = lot as LoteViveroItem & Pick<LoteViveroDetalle, 'ultimo_evento_por_tipo'>
    return { ...normalized, ultimo_evento_por_tipo: Object.fromEntries(Object.entries(detail.ultimo_evento_por_tipo).map(([kind, event]) => [kind, event ? { ...event, id: exactId(event.id), responsable_id: exactId(event.responsable_id) } : null])) }
  }
  return normalized
}

function getLotSpecies(lot: LoteViveroItem): string {
  return lot.nombre_comercial_snapshot || lot.nombre_cientifico_snapshot || 'Especie no registrada'
}
function getOrigen(lot: LoteViveroItem): OrigenLoteView | null {
  const origen = lot.origen
  if (origen?.tipo === 'RECOLECCION') return { ...origen, recoleccion_id: exactId(origen.recoleccion_id) }
  if (origen?.tipo === 'INCORPORACION') return { ...origen, evento_id: exactId(origen.evento_id) }
  return null
}
function canDescartarPreEmbolsado(lot: LoteViveroItem): boolean {
  const ultimo = (lot as Partial<LoteViveroDetalle>).ultimo_evento_por_tipo
  return lot.origen?.tipo !== 'INCORPORACION' && lot.estado_lote === 'ACTIVO' &&
    ultimo?.INICIO != null && ultimo.EMBOLSADO === null && ultimo.DESCARTE_PRE_EMBOLSADO === null
}

export function mapLoteToCardData(lot: LoteViveroItem): ViveroLotCardData {
  return {
    id: exactId(lot.id), origen: getOrigen(lot),
    codigo: lot.codigo_trazabilidad || `VIV-${exactId(lot.id)}`,
    especie: getLotSpecies(lot), estadoLote: lot.estado_lote,
    subetapaActual: lot.subetapa_actual ?? null,
    plantasVivasIniciales: lot.plantas_vivas_iniciales ?? null,
    fechaInicio: lot.fecha_inicio, diasDesdeInicio: daysSinceViveroDate(lot.fecha_inicio),
    cantidadInicial: lot.cantidad_inicial_en_proceso ?? null,
    cantidadActual: lot.saldo_vivo_actual ?? null,
    unidadMedida: lot.unidad_medida_inicial ?? null,
    vivero: lot.vivero?.nombre || 'Vivero no disponible',
    saldoAsignadoSubcampanias: lot.saldo_asignado_subcampanias,
    cantidadAsignacionesActivas: lot.cantidad_asignaciones_activas,
    puedeDescartarPreEmbolsado: canDescartarPreEmbolsado(lot),
  }
}
export function mapLoteToDetailView(lot: LoteViveroItem): ViveroLotDetailView {
  const origen = getOrigen(lot)
  return {
    id: exactId(lot.id), viveroId: exactId(lot.vivero_id), origen,
    codigo: lot.codigo_trazabilidad || `VIV-${exactId(lot.id)}`,
    estadoLote: lot.estado_lote, subetapaActual: lot.subetapa_actual ?? null,
    motivoCierre: lot.motivo_cierre,
    fechaInicio: lot.fecha_inicio, diasDesdeInicio: daysSinceViveroDate(lot.fecha_inicio),
    cantidadInicialEnProceso: lot.cantidad_inicial_en_proceso ?? null,
    unidadMedidaInicial: lot.unidad_medida_inicial ?? null,
    plantasVivasIniciales: lot.plantas_vivas_iniciales ?? null,
    saldoVivoActual: lot.saldo_vivo_actual ?? null,
    stockVivoActual: lot.stock_vivo_actual ?? null,
    especie: getLotSpecies(lot),
    nombreCientifico: lot.nombre_cientifico_snapshot || 'Nombre científico no registrado',
    nombreComercial: lot.nombre_comercial_snapshot || 'Nombre comercial no registrado',
    variedad: lot.variedad_snapshot ?? null,
    plantaImagenUrl: lot.planta?.imagen_url || null,
    viveroNombre: lot.vivero?.nombre || 'Vivero no disponible',
    viveroCodigo: lot.vivero?.codigo || 'No disponible',
    responsableNombre: lot.nombre_responsable_snapshot || 'Responsable inicial no registrado',
    responsableUsername: lot.responsable?.username ?? null,
    recoleccionId: origen?.tipo === 'RECOLECCION' ? exactId(origen.recoleccion_id) : null,
    recoleccionCodigo: origen?.tipo === 'RECOLECCION' ? lot.recoleccion?.codigo_trazabilidad ?? null : null,
    recoleccionFecha: origen?.tipo === 'RECOLECCION' ? lot.recoleccion?.fecha ?? null : null,
    recoleccionTipoMaterial: lot.tipo_material_snapshot ?? null,
    nombreComunidadOrigen: lot.nombre_comunidad_origen_snapshot,
    createdAt: lot.created_at, updatedAt: lot.updated_at,
    saldoAsignadoSubcampanias: lot.saldo_asignado_subcampanias,
    cantidadAsignacionesActivas: lot.cantidad_asignaciones_activas,
    puedeDescartarPreEmbolsado: canDescartarPreEmbolsado(lot),
  }
}

const textOrNull = (value: unknown) => typeof value === 'string' && value ? value : null
const numberOrNull = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null

export function mapTimelineEventToView(e: TimelineEventDto): ViveroLotEventView {
  const p = e.payload
  const conocido = VALID_KINDS.has(e.tipo_evento as TipoEventoVivero)
  const procedencia = p?.procedencia && typeof p.procedencia === 'object' ? p.procedencia as Record<string, unknown> : null
  const unidad = p?.unidad_medida_evento ?? p?.unidad_medida
  const cantidad = numberOrNull(p?.cantidad_afectada ?? p?.plantas_vivas_iniciales ?? p?.cantidad_material_afectado ?? p?.cantidad_inicial ?? p?.cantidad)
  const unit = unidad === 'UNIDAD' || unidad === 'G' ? unidad :
    ['INCORPORACION', 'EMBOLSADO', 'MERMA', 'DESPACHO', 'DEVOLUCION_PLANTACION'].includes(e.tipo_evento) ? 'UNIDAD' : null
  return {
    id: exactId(e.id), kind: e.tipo_evento || 'TIPO_NO_DISPONIBLE', conocido,
    label: e.label || (conocido ? `${e.tipo_evento.replaceAll('_', ' ')} registrado` : `Evento no reconocido: ${e.tipo_evento || 'tipo no disponible'}`),
    fecha: formatViveroDate(e.fecha_evento), fechaIso: e.fecha_evento || '', hora: null,
    responsableNombre: e.responsable_nombre || 'Responsable no disponible',
    responsableEsSnapshot: e.tipo_evento === 'INCORPORACION',
    cantidad, unidadMedidaEvento: unit,
    saldoAntes: numberOrNull(p?.saldo_vivo_antes), saldoDespues: numberOrNull(p?.saldo_vivo_despues),
    observacion: e.observaciones ?? null,
    causa: textOrNull(p?.causa_merma ?? p?.causa_descarte_pre_embolsado ?? p?.motivo_cierre ?? p?.motivo_cierre_calculado),
    subetapa: textOrNull(p?.subetapa_destino), destino: textOrNull(p?.destino_tipo),
    referencia: textOrNull(p?.destino_referencia), comunidad: textOrNull(p?.comunidad_destino),
    materialIngresado: e.tipo_evento === 'INICIO' && cantidad !== null && unit ? `${cantidad} ${unit}` : null,
    sustrato: textOrNull(p?.sustrato),
    procedencia: procedencia ? { modalidad: textOrNull(procedencia.modalidad), procedencia: textOrNull(procedencia.procedencia), tercero: textOrNull(procedencia.tercero_origen), referencia: textOrNull(procedencia.referencia_documental) } : null,
    fotos: (e.evidencias ?? []).map(f => ({
      id: exactId(f.id),
      // El bucket privado nunca puede caer a public_url ni construirse desde ruta_archivo.
      url: f.signed_url || (f.bucket === 'vivero_incorporaciones' ? null : f.public_url) || null,
      expiraEn: f.signed_url && typeof f.url_expira_en_segundos === 'number' ? Date.now() + f.url_expira_en_segundos * 1000 : null,
      titulo: f.titulo || `Evidencia #${exactId(f.id)}`,
      fecha: formatViveroPhotoDate(f.tomado_en ?? f.creado_en),
      mimeType: f.mime_type ?? f.tipo_archivo ?? null, tamanoBytes: f.tamano_bytes ?? null,
    })),
  }
}
