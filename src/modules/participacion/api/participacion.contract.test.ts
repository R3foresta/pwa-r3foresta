import { describe, expect, it } from 'vitest'
import type { AccesoEntrada, IntentoAcceso, OperacionSimple, ReciboAcceso } from '../types'
import { validarCapacidades, validarId, validarIntentoAcceso, validarMiembros, validarPersonas, validarReciboAcceso, validarRevision, validarRevisionAccesos } from './participacion.contract'

const date = '2026-10-15T10:08:34.097494Z'
const command = '3db713df-36a1-479c-82b9-91ac76cc1db6'
const payload: AccesoEntrada = { comando_id: command, usuario_destino_id: '9007199254740993', ambitos: [{ subcampania_id: '9007199254740995', revision_esperada: '9007199254740997' }] }
const attempt: IntentoAcceso = { actor_id: '600', operacion: 'OTORGAR_PLANTADOR', payload }
const change = { usuario_id: payload.usuario_destino_id, permiso_anterior: null, permiso_nuevo: 'PLANTADOR', revision_anterior: '9007199254740997', revision_nueva: '9007199254740998', cambio: 'CAMBIO_APLICADO', conserva_acceso_global: false }
const receipt = () => ({ comando_id: command, operacion: 'OTORGAR_PLANTADOR', estado: 'CONFIRMADO', error: null, finalizado_en: date, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: payload.ambitos[0].subcampania_id, usuarios: [{ ...change }] }] } })
const envelope = (data: unknown) => ({ data, observado_en: date, siguiente_cursor: null })
const person = { usuario_id: '1', nombre: 'Ana', organizacion: null }
const member = { ...person, permiso_contextual: null, revision_permiso: '0', acceso_global: true, etiqueta_acceso_global: 'Administrador · Acceso global', responsabilidad_logistica: 'COORDINADOR' }

describe('contrato v1 de participación', () => {
  it('preserva IDs y revisiones BIGINT exactos incluso por encima de Number.MAX_SAFE_INTEGER', () => {
    expect(validarReciboAcceso(receipt(), attempt).resultado?.cambios[0].usuarios[0].revision_nueva).toBe('9007199254740998')
    expect(validarId('9223372036854775807')).toBe('9223372036854775807')
    expect(validarRevision('0')).toBe('0')
  })
  it.each([1, 9007199254740992, '', '0', '-1', '01', '1.0', '1e1', '9223372036854775808'])('rechaza ID no canónico o sin precisión: %s', value => {
    expect(() => validarId(value)).toThrow()
  })
  it.each([0, '-1', '00', '9223372036854775808'])('rechaza revisiones fuera del contrato: %s', value => {
    expect(() => validarRevision(value)).toThrow()
  })
  it('acepta capacidades vacías válidas y rechaza datos de autoridad mal tipados', () => {
    const data = { actor: { usuario_id: '600', rol_global: 'VOLUNTARIO' }, capacidades_globales: { asignar_roles: false, designar_administradores: false, leer_plan: true }, subcampanias: [] }
    expect(validarCapacidades(envelope(data)).data.subcampanias).toEqual([])
    expect(() => validarCapacidades(envelope({ ...data, actor: { usuario_id: 600, rol_global: 'ADMIN' } }))).toThrow()
    expect(() => validarCapacidades(envelope({ ...data, capacidades_globales: { ...data.capacidades_globales, asignar_roles: 'true' } }))).toThrow()
  })
  it('la proyección mínima admite homónimos sin afiliación y no publica correos ni perfiles', () => {
    expect(validarPersonas(envelope([person, { ...person, usuario_id: '2' }])).data).toHaveLength(2)
    expect(() => validarPersonas(envelope([{ ...person, correo: 'privado@example.test' }]))).toThrow()
    expect(() => validarPersonas(envelope([person, person]))).toThrow()
    expect(() => validarMiembros(envelope([{ ...member, rol_global: 'ADMIN' }]))).toThrow()
    expect(() => validarMiembros(envelope([member, member]))).toThrow()
    expect(() => validarMiembros(envelope([{ ...member, etiqueta_acceso_global: null }]))).toThrow()
    expect(validarMiembros(envelope([member])).data[0].responsabilidad_logistica).toBe('COORDINADOR')
  })
  it('vincula revisión con la persona y todos los ámbitos pedidos', () => {
    const value = { data: { usuario: person, ambitos: [{ subcampania_id: '11', permiso_contextual: null, revision_permiso: '0', acceso_global: false }] }, observado_en: date }
    expect(validarRevisionAccesos(value, { usuario_destino_id: '1', subcampania_ids: ['11'] }).data.usuario).toEqual(person)
    expect(() => validarRevisionAccesos(value, { usuario_destino_id: '2', subcampania_ids: ['11'] })).toThrow()
    expect(() => validarRevisionAccesos(value, { usuario_destino_id: '1', subcampania_ids: ['11', '12'] })).toThrow()
    expect(() => validarRevisionAccesos(value, { usuario_destino_id: '1', subcampania_ids: ['12'] })).toThrow()
  })
  it('no acepta campos de actor/rol, duplicados o más de 100 ámbitos en el intento', () => {
    expect(() => validarIntentoAcceso({ ...attempt, payload: { ...payload, actor_id: '600' } })).toThrow()
    expect(() => validarIntentoAcceso({ ...attempt, payload: { ...payload, ambitos: [payload.ambitos[0], payload.ambitos[0]] } })).toThrow()
    expect(() => validarIntentoAcceso({ ...attempt, payload: { ...payload, ambitos: Array.from({ length: 101 }, (_, index) => ({ subcampania_id: String(index + 1), revision_esperada: '0' })) } })).toThrow()
  })
})

describe('recibo vinculado a la intención confirmada', () => {
  it.each([
    ['OTORGAR_PLANTADOR', null, 'PLANTADOR'],
    ['OTORGAR_PLANTADOR', 'PLANTADOR', 'PLANTADOR'],
    ['RETIRAR_PLANTADOR', 'PLANTADOR', null],
    ['RETIRAR_PLANTADOR', null, null],
    ['DESIGNAR_ADMINISTRADOR', 'PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'],
    ['DESIGNAR_ADMINISTRADOR', 'ADMINISTRADOR_SUBCAMPANIA', 'ADMINISTRADOR_SUBCAMPANIA'],
    ['CAMBIAR_ADMINISTRADOR_A_PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA', 'PLANTADOR'],
    ['RETIRAR_ADMINISTRADOR', 'ADMINISTRADOR_SUBCAMPANIA', null],
  ] as const)('valida el efecto y SIN_CAMBIOS de %s (%s → %s)', (operacion, previous, next) => {
    const value = receipt()
    const same = previous === next
    const result = { ...value, operacion, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: payload.ambitos[0].subcampania_id, usuarios: [{ ...change, permiso_anterior: previous, permiso_nuevo: next, revision_nueva: same ? change.revision_anterior : change.revision_nueva, cambio: same ? 'SIN_CAMBIOS' : 'CAMBIO_APLICADO' }] }] } }
    expect(validarReciboAcceso(result, { ...attempt, operacion: operacion as OperacionSimple }).estado).toBe('CONFIRMADO')
  })
  it('verifica ambas personas y revisiones en reemplazo, incluso si entrante ya administra', () => {
    const replacement: IntentoAcceso = { actor_id: '600', operacion: 'REEMPLAZAR_ADMINISTRADOR', payload: { comando_id: command, usuario_saliente_id: '602', usuario_reemplazo_id: '604', tratamiento_saliente: 'SIN_ACCESO', ambitos: [{ subcampania_id: '600', revision_saliente_esperada: '2', revision_reemplazo_esperada: '4' }] } }
    const value = { ...receipt(), operacion: replacement.operacion, resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: '600', usuarios: [
      { ...change, usuario_id: '602', permiso_anterior: 'ADMINISTRADOR_SUBCAMPANIA', permiso_nuevo: null, revision_anterior: '2', revision_nueva: '3' },
      { ...change, usuario_id: '604', permiso_anterior: 'ADMINISTRADOR_SUBCAMPANIA', permiso_nuevo: 'ADMINISTRADOR_SUBCAMPANIA', revision_anterior: '4', revision_nueva: '4', cambio: 'SIN_CAMBIOS' },
    ] }] } }
    expect(validarReciboAcceso(value, replacement).estado).toBe('CONFIRMADO')
    value.resultado.cambios[0].usuarios.pop()
    expect(() => validarReciboAcceso(value, replacement)).toThrow()
  })
  it.each([
    (value: ReturnType<typeof receipt>) => { value.comando_id = '9f043c84-bacb-44b4-8c9f-f5fcc0510a56' },
    (value: ReturnType<typeof receipt>) => { value.operacion = 'RETIRAR_PLANTADOR' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].subcampania_id = '99' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios[0].usuario_id = '99' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios[0].revision_anterior = '2' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios[0].revision_nueva = '9007199254740999' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios[0].cambio = 'SIN_CAMBIOS' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios[0].permiso_nuevo = 'ADMINISTRADOR_SUBCAMPANIA' },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios.push(value.resultado.cambios[0]) },
    (value: ReturnType<typeof receipt>) => { value.resultado.cambios[0].usuarios.push(value.resultado.cambios[0].usuarios[0]) },
    (value: ReturnType<typeof receipt>) => { value.finalizado_en = '2026-10-15T10:08:34-04:00' },
  ])('conserva incertidumbre ante un recibo que no representa la intención', mutate => {
    const value = receipt()
    mutate(value)
    expect(() => validarReciboAcceso(value, attempt)).toThrow()
  })
  it('no acepta quitar administración mediante la operación de retirar plantador', () => {
    const value = receipt()
    const result = { ...value, operacion: 'RETIRAR_PLANTADOR', resultado: { tipo: 'ACCESO', cambios: [{ subcampania_id: payload.ambitos[0].subcampania_id, usuarios: [{ ...change, permiso_anterior: 'ADMINISTRADOR_SUBCAMPANIA', permiso_nuevo: null }] }] } }
    expect(() => validarReciboAcceso(result, { ...attempt, operacion: 'RETIRAR_PLANTADOR' })).toThrow()
  })
  it('rechazo durable no lleva resultados parciales ni ámbitos ajenos', () => {
    const error = { codigo: 'REVISION_OBSOLETA', mensaje: 'La revisión cambió', campos: [], ambitos: [], reintento: 'NUEVA_CONFIRMACION' }
    const rejected = { ...receipt(), estado: 'RECHAZADO', resultado: null, error }
    expect(validarReciboAcceso(rejected, attempt).estado).toBe('RECHAZADO')
    expect(() => validarReciboAcceso({ ...rejected, resultado: receipt().resultado }, attempt)).toThrow()
    expect(() => validarReciboAcceso({ ...rejected, error: { ...error, ambitos: ['99'] } }, attempt)).toThrow()
    expect(() => validarReciboAcceso({ ...receipt(), error } as unknown as ReciboAcceso, attempt)).toThrow()
  })
})
