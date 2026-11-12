import type { DetalleRecepcion, IntencionRecepcion, OrigenRecepcion, ReciboRecepcion } from './recepcion.contract'

export const origenId = '9007199254740993'
export const revisionId = '9007199254740992'
export const comandoId = '4ff8f9bb-4280-463d-95c8-97a3f11f122c'
export function recibirFixture(): Extract<IntencionRecepcion, { accion: 'RECIBIR' }> {
  return {
    accion: 'RECIBIR', actor_id: '7', recoleccion_id: origenId,
    entrada: { comando_id: comandoId, revision_esperada: revisionId, cantidad_recibida: 0.1, unidad_recibida: 'KG', fecha_recepcion: '2026-11-12', evidencia_ids: ['9007199254740994'] },
  }
}
export function rechazarFixture(): Extract<IntencionRecepcion, { accion: 'RECHAZAR' }> {
  return {
    accion: 'RECHAZAR', actor_id: '7', recoleccion_id: origenId,
    entrada: { comando_id: comandoId, revision_esperada: revisionId, motivo_rechazo: 'La cantidad declarada no corresponde con la entrega.' },
  }
}
export function reciboFixture(intention: IntencionRecepcion = recibirFixture()): ReciboRecepcion {
  const base = {
    recoleccion_id: intention.recoleccion_id, vivero_id: '9007199254740995',
    revision_anterior: intention.entrada.revision_esperada,
    revision_nueva: (BigInt(intention.entrada.revision_esperada) + 1n).toString(),
    actor_id: intention.actor_id, saldo_actual: 100, registrado_en: '2026-11-12T14:00:00+00:00',
  }
  return {
    comando_id: intention.entrada.comando_id, estado: 'CONFIRMADO', error: null, finalizado_en: '2026-11-12T14:00:00+00:00',
    resultado: intention.accion === 'RECIBIR'
      ? { ...base, accion: 'RECIBIR', recepcion_id: '33', cantidad_recibida: 100, unidad_recibida: 'G', fecha_recepcion: intention.entrada.fecha_recepcion, estado_registro: 'VALIDADO', anclaje_externo: 'FUERA_TRANSACCION', motivo_rechazo: null }
      : { ...base, accion: 'RECHAZAR', recepcion_id: null, cantidad_recibida: null, unidad_recibida: null, fecha_recepcion: null, estado_registro: 'RECHAZADO', anclaje_externo: 'NO_APLICA', motivo_rechazo: intention.entrada.motivo_rechazo.trim().normalize('NFC') },
  }
}
export function origenFixture(): OrigenRecepcion {
  return {
    recoleccion_id: origenId, vivero_id: '9007199254740995', recolector_id: '8', codigo_trazabilidad: 'REC-PRUEBA', fecha_recoleccion: '2026-11-10', tipo_material: 'SEMILLA',
    nombre_comercial_snapshot: 'Tara', nombre_cientifico_snapshot: 'Especie sintética', nombre_recolector_snapshot: 'Recolector',
    cantidad_declarada: 100, unidad_declarada: 'G', saldo_actual: 100, revision: revisionId, estado_registro: 'PENDIENTE_VALIDACION',
    motivo_rechazo: null, recepcion: null, puede_recibir_validar: true, puede_rechazar: true,
  }
}
export function detalleFixture(): DetalleRecepcion {
  return {
    ...origenFixture(), observaciones: 'Material recibido para revisión', ubicacion_id: '10', metodo_id: '2', planta_id: '3',
    ubicacion: { id: '10', pais_id: '1', division_id: null, nombre: 'Lugar original', referencia: null, latitud: -16, longitud: -68, precision_m: 5, fuente: 'GPS' },
    historial: [{ id: '21', tipo_historial: 'VALIDACION_RECHAZADA', estado_origen: 'PENDIENTE_VALIDACION', estado_destino: 'RECHAZADO', actor_id: '7', fecha: '2026-11-11T00:00:00+00:00', metadata: { ficha_revisada: { cantidad_inicial_canonica: 110 }, motivo_rechazo: 'Cantidad distinta de lo declarado' } }],
    evidencias: [{ id: '41', bucket: 'recoleccion_fotos', ruta_archivo: 'foto.jpg', mime_type: 'image/jpeg', titulo: null, recepcion_id: null, public_url: 'https://example.invalid/foto.jpg' }],
  }
}
