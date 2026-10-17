import type { ContextoRegistroLectura, DetallePropioRegistroLectura, IntentoRegistro, ReciboRegistro, RegistroIdentity } from '../registroTypes'

export const instant = '2026-10-15T20:21:46.993005Z'
export const comandoId = '38b19c04-2fb0-465c-962b-f7e5991482fa'
export const cargaId = '2b2ef11c-f19f-4684-a250-32b5e96b4a69'
export const capture: RegistroIdentity = { actor_id: '801', subcampania_id: '821', comando_id: comandoId }
export const attempt: IntentoRegistro = { ...capture, payload: { comando_id: comandoId, subcampania_id: '821', plan_revision_esperada: '0', fecha_plantacion: '2026-10-15', latitud: -16.5, longitud: -68.1, especies: [{ planta_id: '8', cantidad: 1 }], coresponsable_ids: ['802'], evidencia_ids: ['62'], observaciones: 'Nota privada HTTP' } }
export const receipt: ReciboRegistro = {
  error: null, estado: 'CONFIRMADO', operacion: 'REGISTRAR_PLANTACION_INICIAL', comando_id: comandoId, finalizado_en: '2026-10-15T20:21:51.522313Z',
  resultado: { tipo: 'PLANTACION_INICIAL', especies: [{ cantidad: 1, planta_id: '8' }], responsable_id: '801', subcampania_id: '821', fecha_plantacion: '2026-10-15', revision_inicial: '0', codigo_trazabilidad: 'PLT-001-INT03A-821', gps_dentro_poligono: true, registro_plantacion_id: '21', cantidad_total_plantada: 1, gps_distancia_a_poligono_m: 0 },
}
export const context: ContextoRegistroLectura = { data: {
  actor: { usuario_id: '801', fuente_autoridad: 'CONTEXTUAL' },
  reglas: { fotos_max: 10, fotos_min: 1, fecha_maxima: '2026-10-15', zona_horaria: 'America/La_Paz', hoy_operativo: '2026-10-15', exterior_permitido: true, fecha_minima_ventana: '2026-10-05', ventana_retroactiva_dias: 10 },
  especies: [{ nombre: 'Tara sintética', planta_id: '8', saldo_elegible: 20, cantidad_objetivo: 2, porcentaje_objetivo: 100 }],
  subcampania: { id: '821', estado: 'ACTIVA', nombre: 'Ámbito INT03-A 821', poligono: { type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68, -16.6], [-68, -16.4], [-68.2, -16.4], [-68.2, -16.6]]] }, campania_id: '800', plan_revision: '0', campania_nombre: 'Campaña INT03-A', meta_total_arboles: 2 }, disponibilidad: 'DISPONIBLE',
}, observado_en: instant }
export const detail: DetallePropioRegistroLectura = { data: {
  latitud: -16.5, especies: [{ cantidad: 1, planta_id: '8' }], longitud: -68.1, relaciones: ['AUTOR'], evidencia_ids: ['62'],
  participantes: [
    { usuario_id: '801', es_responsable: true, afiliacion_tipo: 'OTRA', nombre_snapshot: 'Perfil después', afiliacion_estado: 'DECLARADA', afiliacion_snapshot: 'Otra actual', organizacion_id_snapshot: null },
    { usuario_id: '802', es_responsable: false, afiliacion_tipo: null, nombre_snapshot: 'Participante congelado', afiliacion_estado: 'NO_DECLARADA', afiliacion_snapshot: null, organizacion_id_snapshot: null },
  ], subcampania_id: '821', fecha_plantacion: '2026-10-15', revision_registro: '0', codigo_trazabilidad: 'PLT-001-INT03A-821', gps_dentro_poligono: true, observaciones_autor: 'Nota privada HTTP', registro_plantacion_id: '21', cantidad_total_plantada: 1,
}, observado_en: '2026-10-15T20:21:51.544519Z' }
export const stableError = { codigo: 'REVISION_OBSOLETA', mensaje: 'El plan cambió', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' as const }
export const prepared = { data: { comando_id: comandoId, operacion: 'REGISTRAR_PLANTACION_INICIAL', subcampania_id: '821', estado: 'PREPARADO' }, observado_en: instant }
export const available = { data: { carga_id: cargaId, estado: 'DISPONIBLE', evidencia_id: '62', creado_en: instant, expira_en: '2026-11-14T20:21:46Z' }, observado_en: instant }
