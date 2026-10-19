import { describe, expect, it } from 'vitest'
import examples from './impacto.test-fixtures.json'
import {
  ImpactoContratoError, validarImpactoConsulta, validarImpactoId, validarImpactoQuery,
  validarImpactoRegistro, validarMisRegistros, validarMisRegistrosQuery,
} from './impacto.contract'

const clone = <T,>(value: T): T => structuredClone(value)

describe('contratos INT05 con respuestas HTTP sintéticas de SQL 081 / OpenAPI 1.3.0', () => {
  it.each(['global', 'campania', 'subcampania'] as const)('acepta ejemplo real %s y conserva los hechos sin recalcularlos', key => {
    const scope = key === 'global' ? { tipo: 'global' as const } : key === 'campania' ? { tipo: 'campania' as const, id: '800' } : { tipo: 'subcampania' as const, id: '826' }
    expect(validarImpactoConsulta(examples[key], scope)).toEqual(examples[key])
  })
  it('conserva 125%, bajas/reposiciones separadas, snapshots y personas del grupo', () => {
    const { data } = validarImpactoConsulta(examples.subcampania, { tipo: 'subcampania', id: '826' })
    expect(data.subcampanias[0]).toMatchObject({ plantacion_inicial: 25, meta_inicial: 20, avance_porcentaje: 125, faltantes: 0, bajas_reportadas: 6, reposiciones: 4 })
    const record = validarImpactoRegistro(examples.registro, '826000').data
    expect(record.personas).toHaveLength(3)
    expect(record.personas[0].afiliacion.nombre).toBe('Organización sintética al plantar')
    expect(record.organizaciones_campania).toHaveLength(2)
    expect(record.seguimiento).toMatchObject({ bajas_reportadas: 6, reposiciones_registradas: 4 })
    expect(record).not.toHaveProperty('observaciones')
  })
  it('acepta historia sin disponibilidad y no la convierte en no declarada', () => {
    const record = validarImpactoConsulta(examples.global).data.registros.find(item => item.id === '827000')!
    expect(record.personas[0].afiliacion.estado).toBe('HISTORICA_NO_DISPONIBLE')
  })
  it('acepta Mis registros con relaciones dobles y ámbito privado', () => {
    expect(validarMisRegistros(examples.mis_registros)).toEqual(examples.mis_registros)
    expect(validarMisRegistros(examples.mis_registros).data.registros.find(item => item.id === '826000')?.relaciones).toEqual(['AUTOR', 'PARTICIPANTE'])
  })
  it.each(['0', '01', '-1', '+1', '1.0', '1e2', ' 1', '1 ', '9223372036854775808', 42, null, ['1']])('rechaza ID no canónico %j', id => {
    expect(() => validarImpactoId(id)).toThrow(ImpactoContratoError)
  })
  it('mantiene BIGINT exacto hasta el límite', () => {
    expect(validarImpactoId('9007199254740993')).toBe('9007199254740993')
    expect(validarImpactoId('9223372036854775807')).toBe('9223372036854775807')
  })
  it.each([
    { campo_extra: '1' }, { desde: '2026-02-30' }, { desde: '2026-10-17', hasta: '2026-10-16' },
    { desde: '2026-1-01' }, { cursor: '00' }, { limite: 0 }, { limite: 101 }, { limite: 1.2 },
    { limite: '20' }, { campania_id: ['800', '801'] },
  ])('rechaza filtros desconocidos/repetidos o inválidos %j', query => {
    expect(() => validarImpactoQuery({ tipo: 'global' }, query)).toThrow(ImpactoContratoError)
  })
  it('no deja sustituir ámbito path y la lista propia admite solo paginación', () => {
    expect(() => validarImpactoQuery({ tipo: 'campania', id: '800' }, { campania_id: '800' })).toThrow()
    expect(() => validarImpactoQuery({ tipo: 'subcampania', id: '826' }, { subcampania_id: '826' })).toThrow()
    expect(() => validarMisRegistrosQuery({ organizacion_id: '1' })).toThrow()
    expect(validarImpactoQuery({ tipo: 'global' }, { campania_id: '800', desde: '2024-02-29', limite: 100 })).toEqual({ campania_id: '800', desde: '2024-02-29', limite: 100 })
  })
  it('pagina únicamente registros; mapa/indicadores conservan el ámbito completo', () => {
    const first = clone(examples.global)
    first.data.registros = first.data.registros.slice(0, 2)
    Object.assign(first.data, { siguiente_cursor: first.data.registros.at(-1)!.id })
    const readFirst = validarImpactoConsulta(first, { tipo: 'global' }, { limite: 2 })
    const second = clone(examples.global)
    second.data.registros = second.data.registros.slice(2)
    expect(validarImpactoConsulta(second, { tipo: 'global' }, { limite: 2, cursor: readFirst.data.siguiente_cursor! }).data.indicadores.plantacion_inicial).toBe(50)
    expect(readFirst.data.mapa).toHaveLength(4)
  })
  it('rechaza respuestas fuera del ámbito solicitado y páginas incoherentes', () => {
    expect(() => validarImpactoConsulta(examples.global, { tipo: 'campania', id: '800' })).toThrow()
    expect(() => validarImpactoConsulta(examples.global, { tipo: 'global' }, { desde: '2026-10-16' })).toThrow()
    expect(() => validarImpactoConsulta(examples.global, { tipo: 'global' }, { cursor: '826000' })).toThrow()
    expect(() => validarImpactoRegistro(examples.registro, '827000')).toThrow()
    const duplicate = clone(examples.global); duplicate.data.registros.push(duplicate.data.registros[0])
    expect(() => validarImpactoConsulta(duplicate)).toThrow()
    const wrongMap = clone(examples.global); wrongMap.data.mapa[0].cantidad_total_plantada++
    expect(() => validarImpactoConsulta(wrongMap)).toThrow()
  })
  it.each(['observaciones', 'usuario_id', 'bucket', 'ruta_archivo'])('rechaza campo privado infiltrado %s', key => {
    const example = clone(examples.registro)
    Object.assign(example.data, { [key]: 'dato privado' })
    expect(() => validarImpactoRegistro(example)).toThrow()
  })
  it('rechaza URL externa, destino distinto, metadatos foto y snapshot ambiguo', () => {
    const external = clone(examples.registro); external.data.fotos[0].url = 'https://malicioso.test/imagen'
    expect(() => validarImpactoRegistro(external)).toThrow()
    const wrongId = clone(examples.registro); wrongId.data.url_publica = '/api/v1/impact/registros/827000'
    expect(() => validarImpactoRegistro(wrongId)).toThrow()
    const metadata = clone(examples.registro); Object.assign(metadata.data.fotos[0], { takenAt: 'fecha privada' })
    expect(() => validarImpactoRegistro(metadata)).toThrow()
    const snapshot = clone(examples.registro); Object.assign(snapshot.data.personas[2].afiliacion, { nombre: 'Perfil actual' })
    expect(() => validarImpactoRegistro(snapshot)).toThrow()
  })
  it('rechaza cálculos incoherentes sin limitar el avance a 100%', () => {
    const bad = clone(examples.subcampania); bad.data.subcampanias[0].avance_porcentaje = 100
    expect(() => validarImpactoConsulta(bad)).toThrow()
    const duplicate = clone(examples.registro); duplicate.data.especies.push(duplicate.data.especies[0])
    expect(() => validarImpactoRegistro(duplicate)).toThrow()
    const sum = clone(examples.registro); sum.data.especies[0].cantidad++
    expect(() => validarImpactoRegistro(sum)).toThrow()
  })
  it('rechaza estados no públicos, responsables duplicados y relaciones propias repetidas', () => {
    const hidden = clone(examples.subcampania); hidden.data.subcampanias[0].estado = 'PAUSADA'
    expect(() => validarImpactoConsulta(hidden)).toThrow()
    const responsible = clone(examples.registro); responsible.data.personas[1].es_responsable = true
    expect(() => validarImpactoRegistro(responsible)).toThrow()
    const own = clone(examples.mis_registros); own.data.registros[0].relaciones = ['AUTOR', 'AUTOR']
    expect(() => validarMisRegistros(own)).toThrow()
  })
  it('rechaza envelopes extra, seguimiento con fecha inválida y destino propio alterado', () => {
    expect(() => validarImpactoRegistro({ ...examples.registro, success: true })).toThrow()
    const track = clone(examples.registro); track.data.seguimiento.bajas[0].fecha = '2026-02-30T04:00:00Z'
    expect(() => validarImpactoRegistro(track)).toThrow()
    const own = clone(examples.mis_registros); own.data.registros[0].url_detalle_propio = '/api/v1/plantaciones/826000/detalle-propio'
    expect(() => validarMisRegistros(own)).toThrow()
  })
})
