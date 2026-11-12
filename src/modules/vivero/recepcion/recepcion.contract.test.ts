import { describe, expect, it } from 'vitest'
import { validarColaRecepcion, validarIntencionRecepcion, validarOrigenRecepcion, validarReciboRecepcion } from './recepcion.contract'
import { detalleFixture, origenFixture, recibirFixture, rechazarFixture, reciboFixture } from './recepcion.test-fixtures'
import { coincideCantidadRecepcion } from './recepcion.cantidad'

describe('contrato de recepción única100', () => {
  it('preserva IDs/revisiones BIGINT y las dos decisiones', () => {
    for (const intention of [recibirFixture(), rechazarFixture()]) {
      expect(validarIntencionRecepcion(intention)).toEqual(intention)
      expect(validarReciboRecepcion(reciboFixture(intention), intention).resultado?.revision_nueva).toBe('9007199254740993')
    }
    const intention = recibirFixture()
    expect(() => validarIntencionRecepcion({ ...intention, recoleccion_id: Number(intention.recoleccion_id) })).toThrow()
    expect(() => validarIntencionRecepcion({ ...intention, entrada: { ...intention.entrada, revision_esperada: Number(intention.entrada.revision_esperada) } })).toThrow()
  })
  it('rechazar la ficha es CONFIRMADO y se distingue de un error del comando', () => {
    const intention = rechazarFixture()
    expect(validarReciboRecepcion(reciboFixture(intention), intention)).toMatchObject({ estado: 'CONFIRMADO', resultado: { estado_registro: 'RECHAZADO', accion: 'RECHAZAR', recepcion_id: null } })
    expect(validarReciboRecepcion({ comando_id: intention.entrada.comando_id, estado: 'RECHAZADO', resultado: null, error: { codigo: 'REVISION_OBSOLETA' }, finalizado_en: '2026-11-12T00:00:00Z' }, intention).resultado).toBeNull()
  })
  it('compara identidad, acción, revisión, fecha y cantidad normalizada del recibo', () => {
    const intention = recibirFixture()
    const receipt = reciboFixture(intention)
    expect(validarReciboRecepcion(receipt, intention).resultado?.cantidad_recibida).toBe(100)
    for (const mismatch of [
      { actor_id: '8' }, { recoleccion_id: '9007199254740992' }, { accion: 'RECHAZAR' },
      { revision_anterior: '9007199254740993' }, { revision_nueva: '9007199254740992' },
      { fecha_recepcion: '2026-11-11' }, { cantidad_recibida: 99, saldo_actual: 99 },
      { unidad_recibida: 'UNIDAD' }, { anclaje_externo: 'PENDIENTE_NO_EJECUTADO' },
    ]) expect(() => validarReciboRecepcion({ ...receipt, resultado: { ...receipt.resultado, ...mismatch } }, intention)).toThrow()
  })
  it('compara el motivo normalizado al rechazar y no admite recepción fabricada', () => {
    const intention = rechazarFixture()
    intention.entrada.motivo_rechazo = '  La recepcio\u0301n requiere corregir la cantidad.  '
    const receipt = reciboFixture(intention)
    expect(validarReciboRecepcion(receipt, intention)).toEqual(receipt)
    for (const mismatch of [{ motivo_rechazo: 'Un motivo distinto al confirmado.' }, { recepcion_id: '33' }, { cantidad_recibida: 100 }]) {
      expect(() => validarReciboRecepcion({ ...receipt, resultado: { ...receipt.resultado, ...mismatch } }, intention)).toThrow()
    }
  })
  it('descarta campos/estados del flujo retirado y claves adicionales', () => {
    const intention = recibirFixture()
    for (const input of [
      { ...intention, accion: undefined },
      { ...intention, entrada: { ...intention.entrada, incidencia_id: '1', motivo_resolucion: 'No aplica al flujo nuevo' } },
      { ...intention, permiso: true },
    ]) expect(() => validarIntencionRecepcion(input)).toThrow()
    expect(() => validarReciboRecepcion({ ...reciboFixture(), estado: 'INCIDENCIA' }, intention)).toThrow()
    expect(() => validarReciboRecepcion({ ...reciboFixture(), extra: true }, intention)).toThrow()
  })
  it.each([
    [0.000001, 'G', true], [0.0000001, 'G', false], [0.000000001, 'KG', true],
    [0.0000000001, 'KG', false], [1.1, 'UNIDAD', false], [1, 'UNIDAD', true], [0, 'G', false],
  ])('verifica precisión contractual %s %s', (amount, unit, valid) => {
    const intention = recibirFixture()
    const validate = () => validarIntencionRecepcion({ ...intention, entrada: { ...intention.entrada, cantidad_recibida: amount, unidad_recibida: unit } })
    if (valid) expect(validate()).toBeTruthy()
    else expect(validate).toThrow()
  })
  it('exige evidencias únicas y motivos de10–500 caracteres', () => {
    const intention = recibirFixture()
    for (const ids of [[], ['2', '2'], ['1', '2', '3', '4', '5', '6'], [2]]) {
      expect(() => validarIntencionRecepcion({ ...intention, entrada: { ...intention.entrada, evidencia_ids: ids } })).toThrow()
    }
    const rejection = rechazarFixture()
    expect(() => validarIntencionRecepcion({ ...rejection, entrada: { ...rejection.entrada, motivo_rechazo: 'corto' } })).toThrow()
  })
  it('lee la proyección real con fotos, revisión e historial congelado', () => {
    const detail = detalleFixture()
    expect(validarOrigenRecepcion(detail, true)).toEqual(detail)
    expect(detail.historial[0].metadata.ficha_revisada).toEqual({ cantidad_inicial_canonica: 110 })
    expect(validarColaRecepcion({ data: [origenFixture()], siguiente_antes_de_id: null }).data).toHaveLength(1)
    expect(() => validarOrigenRecepcion({ ...detail, incidencia: null }, true)).toThrow()
    expect(() => validarOrigenRecepcion({ ...detail, ubicacion: { ...detail.ubicacion, id: '11' } }, true)).toThrow()
    expect(() => validarColaRecepcion({ data: [origenFixture(), origenFixture()], siguiente_antes_de_id: null })).toThrow()
  })
  it.each(['2026-11-11', '2026-11-11T00:00:00+00:00', '2026-11-11T10:23:45.123-04:00'])('conserva fecha de historial %s sin truncarla', fecha => {
    const detail = detalleFixture()
    detail.historial[0].fecha = fecha
    expect((validarOrigenRecepcion(detail, true) as typeof detail).historial[0].fecha).toBe(fecha)
  })
  it('no acepta ESQUEJE en G ni saldo fraccionario en UNIDAD', () => {
    expect(() => validarOrigenRecepcion({ ...origenFixture(), tipo_material: 'ESQUEJE' })).toThrow()
    expect(() => validarOrigenRecepcion({ ...origenFixture(), tipo_material: 'ESQUEJE', unidad_declarada: 'UNIDAD', saldo_actual: 1.2 })).toThrow()
  })
})

describe('comparación decimal de recepción', () => {
  it.each([
    [1.001, 'KG', 1001, 'G', true], [1.001000001, 'KG', 1001, 'G', false],
    [0.000000001, 'KG', 0.000001, 'G', true], [0.1, 'KG', 100, 'G', true],
    [1001.000001, 'G', 1001, 'G', false], [100, 'UNIDAD', 100, 'UNIDAD', true],
    [100.1, 'UNIDAD', 100, 'UNIDAD', false], [100, 'UNIDAD', 100, 'G', false],
  ] as const)('compara %s %s con %s %s', (amount, unit, expected, expectedUnit, matches) => {
    expect(coincideCantidadRecepcion(amount, unit, expected, expectedUnit)).toBe(matches)
  })
})
