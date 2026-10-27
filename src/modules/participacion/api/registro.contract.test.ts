import { describe, expect, it } from 'vitest'
import {
  validarCargaRegistro, validarCargasRegistro, validarContextoRegistro, validarDetallePropioRegistro,
  validarPreparacionRegistro, validarPreviewRegistro, validarReciboRegistro, validarRegistroEntrada,
  validarRegistroFecha, validarRegistroIdentity, validarRegistroSinResultado,
} from './registro.contract'
import { attempt, available, capture, cargaId, context, detail, instant, prepared, receipt, stableError } from './registro.test-fixtures'

describe('registro v1, DTO y datos reales de INT03-A', () => {
  it('acepta contexto/recibo/detalle conforme a los ejemplos HTTP de backend', () => {
    expect(validarContextoRegistro(context, '801', '821')).toEqual(context)
    expect(validarReciboRegistro(receipt, attempt)).toEqual(receipt)
    expect(validarDetallePropioRegistro(detail, '801', '21')).toEqual(detail)
  })
  it('preserva BIGINT exacto, revisión cero y declaraciones null diferentes de omisión', () => {
    const payload = validarRegistroEntrada({ ...attempt.payload, subcampania_id: '9007199254740993', plan_revision_esperada: '9223372036854775807', afiliaciones_declaradas: [{ usuario_id: '801', afiliacion: null }] }, '801')
    expect(payload.subcampania_id).toBe('9007199254740993')
    expect(payload.plan_revision_esperada).toBe('9223372036854775807')
    expect(payload.afiliaciones_declaradas).toEqual([{ usuario_id: '801', afiliacion: null }])
    expect(validarRegistroEntrada(attempt.payload, '801').afiliaciones_declaradas).toEqual([])
  })
  it('normaliza NFC/trim sin modificar espacio interior y no sustituye revisión ni fecha', () => {
    const result = validarRegistroEntrada({ ...attempt.payload, observaciones: '  Árbol  nuevo  ', afiliaciones_declaradas: [{ usuario_id: '801', afiliacion: { tipo: 'OTRA', nombre: ' Área  Norte ' } }] }, '801')
    expect(result.observaciones).toBe('Árbol  nuevo')
    expect(result.afiliaciones_declaradas?.[0].afiliacion).toEqual({ tipo: 'OTRA', nombre: 'Área  Norte' })
    expect(result.plan_revision_esperada).toBe('0')
  })
  it.each([
    { ...attempt.payload, actor_id: '801' }, { ...attempt.payload, es_reposicion: false }, { ...attempt.payload, detalles: [] },
    { ...attempt.payload, subcampania_id: 821 }, { ...attempt.payload, plan_revision_esperada: 0 },
    { ...attempt.payload, coresponsable_ids: ['801'] }, { ...attempt.payload, coresponsable_ids: ['802', '802'] },
    { ...attempt.payload, evidencia_ids: [] }, { ...attempt.payload, evidencia_ids: ['62', '62'] },
    { ...attempt.payload, especies: [{ planta_id: '8', cantidad: 1.5 }] }, { ...attempt.payload, especies: [{ planta_id: '8', cantidad: 2147483648 }] },
    { ...attempt.payload, especies: [{ planta_id: '8', cantidad: 2147483647 }, { planta_id: '9', cantidad: 1 }] },
    { ...attempt.payload, latitud: -16.1234567 }, { ...attempt.payload, longitud: Infinity },
    { ...attempt.payload, fecha_plantacion: '2026-02-30' }, { ...attempt.payload, afiliaciones_declaradas: null },
    { ...attempt.payload, afiliaciones_declaradas: [{ usuario_id: '899', afiliacion: null }] },
  ])('rechaza identidad, reparto, precisión o conjuntos fuera del contrato', payload => {
    expect(() => validarRegistroEntrada(payload, '801')).toThrow()
  })
  it.each(['2026-02-29', '2026-02-31', '2026-2-01', '0000-01-01', 'fecha'])('rechaza fecha inexistente/no canónica %s', value => {
    expect(() => validarRegistroFecha(value)).toThrow()
  })
  it('no permite modificar UUID o ámbito al vincular payload guardado', () => {
    expect(validarRegistroIdentity(capture)).toEqual(capture)
    expect(() => validarRegistroIdentity({ ...capture, payload: { ...attempt.payload, subcampania_id: '822' } })).toThrow()
    expect(() => validarRegistroIdentity({ ...capture, payload: { ...attempt.payload, comando_id: cargaId } })).toThrow()
  })
  it('SIN_STOCK es un contexto válido y no equivale a falta de permiso', () => {
    const value = structuredClone(context); value.data.especies[0].saldo_elegible = 0; value.data.disponibilidad = 'SIN_STOCK'
    expect(validarContextoRegistro(value, '801', '821').data.disponibilidad).toBe('SIN_STOCK')
    value.data.disponibilidad = 'DISPONIBLE'
    expect(() => validarContextoRegistro(value, '801', '821')).toThrow()
  })
  it.each([null, 'https://example.com/plantas/tara.jpg'])('conserva la foto opcional %s sin cambiar nombres, stock o revisión', imagen_url => {
    const value = structuredClone(context)
    value.data.especies[0].imagen_url = imagen_url
    expect(validarContextoRegistro(value, '801', '821')).toEqual(value)
    expect(validarContextoRegistro(context, '801', '821')).toEqual(context)
  })
  it.each([42, {}, '', false])('rechaza una foto fuera del tipo acordado: %s', imagen_url => {
    const value = { ...context, data: { ...context.data, especies: [{ ...context.data.especies[0], imagen_url }] } }
    expect(() => validarContextoRegistro(value, '801', '821')).toThrow()
  })
  it('acepta el avance ampliado completo y mantiene compatible el contexto anterior', () => {
    const ampliado = structuredClone(context)
    ampliado.data.especies[0].plantado_inicial = 3
    ampliado.data.especies[0].pendiente_meta = 0
    expect(validarContextoRegistro(ampliado, '801', '821')).toEqual(ampliado)
    expect(validarContextoRegistro(context, '801', '821')).toEqual(context)

    const incompleto = structuredClone(ampliado)
    delete incompleto.data.especies[0].pendiente_meta
    expect(() => validarContextoRegistro(incompleto, '801', '821')).toThrow()
    const inconsistente = structuredClone(ampliado)
    inconsistente.data.especies[0].pendiente_meta = 1
    expect(() => validarContextoRegistro(inconsistente, '801', '821')).toThrow()
    const mezclado = structuredClone(ampliado)
    mezclado.data.especies.push({ ...context.data.especies[0], planta_id: '9' })
    expect(() => validarContextoRegistro(mezclado, '801', '821')).toThrow()
    const negativo = structuredClone(ampliado)
    negativo.data.especies[0].plantado_inicial = -1
    expect(() => validarContextoRegistro(negativo, '801', '821')).toThrow()
  })
  it('contexto vincula cuenta y ámbito y rechaza datos internos, geometría o reglas ajenas', () => {
    expect(() => validarContextoRegistro(context, '802', '821')).toThrow()
    expect(() => validarContextoRegistro(context, '801', '822')).toThrow()
    expect(() => validarContextoRegistro({ ...context, data: { ...context.data, equipo: [] } }, '801', '821')).toThrow()
    const value = structuredClone(context); value.data.subcampania.poligono.coordinates[0].pop()
    expect(() => validarContextoRegistro(value, '801', '821')).toThrow()
  })
})

describe('preparación, cargas y recibos', () => {
  it('preparación fija UUID/ámbito y un GET202 válido no afirma ejecución', () => {
    expect(validarPreparacionRegistro(prepared, capture).data.estado).toBe('PREPARADO')
    expect(() => validarPreparacionRegistro(prepared, { ...capture, subcampania_id: '822' })).toThrow()
    const pending = { comando_id: capture.comando_id, operacion: 'REGISTRAR_PLANTACION_INICIAL', estado: 'SIN_RESULTADO', resultado: null, error: null, finalizado_en: null }
    expect(() => validarRegistroSinResultado(pending, capture)).not.toThrow()
    expect(() => validarRegistroSinResultado({ ...pending, operacion: 'OTORGAR_PLANTADOR' }, capture)).toThrow()
  })
  it('carga válida requiere el mismo UUID y no llama disponible a una foto sin evidencia', () => {
    expect(validarCargaRegistro(available, cargaId).data.evidencia_id).toBe('62')
    expect(() => validarCargaRegistro(available, capture.comando_id)).toThrow()
    expect(() => validarCargaRegistro({ ...available, data: { ...available.data, evidencia_id: null } }, cargaId)).toThrow()
    expect(() => validarCargasRegistro({ data: [available.data, available.data], observado_en: instant })).toThrow()
    expect(() => validarCargaRegistro({ ...available, data: { ...available.data, bucket: 'privado' } }, cargaId)).toThrow()
  })
  it('preview admite solamente una URL temporal HTTP/HTTPS y campos mínimos', () => {
    expect(validarPreviewRegistro({ data: { url: 'http://127.0.0.1:3303/preview/foto', expira_en: instant }, observado_en: instant }).data.url).toContain('/preview/foto')
    expect(() => validarPreviewRegistro({ data: { url: 'javascript:alert(1)', expira_en: instant }, observado_en: instant })).toThrow()
    expect(() => validarPreviewRegistro({ data: { url: 'https://usuario:clave@ejemplo.test/foto', expira_en: instant }, observado_en: instant })).toThrow()
  })
  it('recupera terminal propio aun sin payload final local; con payload verifica fecha/especies/cantidad', () => {
    expect(validarReciboRegistro(receipt, capture).estado).toBe('CONFIRMADO')
    expect(() => validarReciboRegistro(receipt, { ...attempt, payload: { ...attempt.payload, fecha_plantacion: '2026-10-14' } })).toThrow()
    expect(() => validarReciboRegistro(receipt, { ...attempt, payload: { ...attempt.payload, especies: [{ planta_id: '8', cantidad: 2 }] } })).toThrow()
  })
  it.each(['comando', 'actor', 'ambito', 'total', 'especie', 'revision', 'tipo', 'operacion'] as const)('rechaza un recibo con %s distinto', field => {
    const value = structuredClone(receipt)
    if (value.estado !== 'CONFIRMADO') throw new Error('fixture')
    if (field === 'comando') value.comando_id = cargaId
    if (field === 'actor') value.resultado.responsable_id = '802'
    if (field === 'ambito') value.resultado.subcampania_id = '822'
    if (field === 'total') value.resultado.cantidad_total_plantada = 2
    if (field === 'especie') value.resultado.especies[0].planta_id = '9'
    if (field === 'revision') (value.resultado as unknown as Record<string, unknown>).revision_inicial = '1'
    if (field === 'tipo') (value.resultado as unknown as Record<string, unknown>).tipo = 'ACCESO'
    if (field === 'operacion') (value as unknown as Record<string, unknown>).operacion = 'OTORGAR_PLANTADOR'
    expect(() => validarReciboRegistro(value, attempt)).toThrow()
  })
  it('cancelación terminal sin payload final se conserva; rechazo no admite resultados parciales', () => {
    const value = { ...receipt, estado: 'RECHAZADO', resultado: null, error: { ...stableError, codigo: 'PREPARACION_CANCELADA' } }
    expect(validarReciboRegistro(value, capture).error?.codigo).toBe('PREPARACION_CANCELADA')
    expect(() => validarReciboRegistro({ ...value, resultado: receipt.resultado }, capture)).toThrow()
    expect(() => validarReciboRegistro({ ...value, error: { ...stableError, ambitos: ['822'] } }, capture)).toThrow()
  })
})

describe('detalle propio respeta snapshots y audiencia', () => {
  it('participante histórico consulta sin observaciones privadas del autor', () => {
    const value = structuredClone(detail); value.data.relaciones = ['PARTICIPANTE']; value.data.observaciones_autor = null
    expect(validarDetallePropioRegistro(value, '802', '21').data.relaciones).toEqual(['PARTICIPANTE'])
    value.data.observaciones_autor = 'Privado'
    expect(() => validarDetallePropioRegistro(value, '802', '21')).toThrow()
  })
  it('no reconstruye una afiliación histórica ausente con el perfil actual', () => {
    const value = structuredClone(detail); value.data.participantes[0] = { usuario_id: '801', es_responsable: true, afiliacion_tipo: null, nombre_snapshot: null, afiliacion_estado: 'HISTORICA_NO_DISPONIBLE', afiliacion_snapshot: null, organizacion_id_snapshot: null }
    expect(validarDetallePropioRegistro(value, '801', '21').data.participantes[0].afiliacion_estado).toBe('HISTORICA_NO_DISPONIBLE')
    expect(() => validarDetallePropioRegistro(value, '999', '21')).toThrow()
    expect(() => validarDetallePropioRegistro(value, '801', '22')).toThrow()
  })
})
