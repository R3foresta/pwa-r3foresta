import type { LoteViveroDetalle, TimelineEventDto, TipoEventoVivero } from './types/contracts'

export const BIG_A = '9007199254740992'
export const BIG_B = '9007199254740993'
export function loteFixture(overrides: Partial<LoteViveroDetalle> = {}): LoteViveroDetalle {
  return {
    id: BIG_A, codigo_trazabilidad: 'VIV-SINTETICO', estado_lote: 'ACTIVO', motivo_cierre: null,
    origen: { tipo: 'INCORPORACION', evento_id: BIG_B, modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', fecha_evento: '2026-11-12', cantidad: 210, tercero_origen: null, referencia_documental: null, observaciones: 'Conteo sintético', historia_previa_no_registrada: true },
    recoleccion_id: null, planta_id: '3', vivero_id: '1', responsable_id: '7',
    nombre_cientifico_snapshot: 'Científico histórico', nombre_comercial_snapshot: 'Nombre histórico',
    tipo_material_snapshot: null, variedad_snapshot: 'Variedad histórica', nombre_comunidad_origen_snapshot: null,
    nombre_responsable_snapshot: 'Responsable histórico', fecha_inicio: '2026-11-12',
    cantidad_inicial_en_proceso: null, unidad_medida_inicial: null, plantas_vivas_iniciales: 210,
    saldo_vivo_actual: 180, stock_vivo_actual: 180, subetapa_actual: null, created_at: '2026-11-12', updated_at: '2026-11-13',
    vivero: { id: '1', codigo: 'V-S', nombre: 'Vivero sintético' }, recoleccion: null,
    planta: { id: '3', nombre_cientifico: 'Científico actual', nombre_comun_principal: 'Nombre actual', especie: 'Familia actual', variedad: 'Variedad actual', imagen_url: null },
    responsable: { id: '7', nombre: 'Nombre actual', apellido: 'Apellido actual', username: 'actual', correo: null },
    ultimo_evento_por_tipo: { INICIO: null, INCORPORACION: null, EMBOLSADO: null, ADAPTABILIDAD: null, MERMA: null, DESPACHO: null, DEVOLUCION_PLANTACION: null, CIERRE_AUTOMATICO: null, DESCARTE_PRE_EMBOLSADO: null },
    ...overrides,
  }
}
export function eventoFixture(kind: TipoEventoVivero | string = 'INCORPORACION', overrides: Partial<TimelineEventDto> = {}): TimelineEventDto {
  return { id: BIG_B, tipo_evento: kind, fecha_evento: '2026-11-12', responsable_nombre: 'Responsable histórico', observaciones: null,
    payload: { tipo: kind, cantidad: 210, procedencia: { modalidad: 'SALDO_INICIAL', procedencia: 'DONACION', tercero_origen: null, referencia_documental: null } },
    evidencias: [{ id: '9007199254740994', bucket: 'vivero_incorporaciones', signed_url: 'https://storage.example.test/signed/foto?v=1', url_expira_en_segundos: 300, mime_type: 'image/jpeg' }], ...overrides }
}
export function m1LoteFixture(overrides: Partial<LoteViveroDetalle> = {}): LoteViveroDetalle {
  return loteFixture({ origen: { tipo: 'RECOLECCION', recoleccion_id: '5' }, recoleccion_id: '5', tipo_material_snapshot: 'SEMILLA', cantidad_inicial_en_proceso: 5, unidad_medida_inicial: 'G', plantas_vivas_iniciales: null, saldo_vivo_actual: null, stock_vivo_actual: null,
    recoleccion: { id: '5', codigo_trazabilidad: 'REC-SINTETICA', fecha: '2026-11-12', tipo_material: 'SEMILLA', estado_registro: 'VALIDADO', estado_operativo: 'CERRADO', saldo_actual: 0, unidad_canonica: 'G' }, ...overrides })
}
