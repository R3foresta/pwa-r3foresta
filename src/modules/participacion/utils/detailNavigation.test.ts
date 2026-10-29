import { describe, expect, it } from 'vitest'
import { safeCampaniaMapReturn, safeImpactoReturn } from '../../impacto/utils/consulta'
import { safeParticipacionReturn } from './detailNavigation'

describe('retorno al detalle participante', () => {
  it('admite enlaces antiguos y conserva pestaña y selección con BIGINT exacto', () => {
    for (const path of ['/participar', '/participar?campania_id=7&subcampania_id=11', '/participar?campania_id=7&subcampania_id=9007199254740993&pestana=mapa&registro=9007199254740995', '/app/planting/subcampanias/51', '/app/planting/subcampanias/9007199254740993?pestana=mapa&registro=9007199254740995']) {
      expect(safeParticipacionReturn(path)).toBe(path)
      expect(safeImpactoReturn(path)).toBe(path)
    }
  })
  it.each(['//otro.test/participar', 'https://otro.test/participar', '/participar?campania_id=7&token=privado', '/participar?campania_id=7&subcampania_id=11&subcampania_id=12', '/participar?campania_id=7&pestana=desconocida', '/participar?campania_id=7#fragmento'])('rechaza destinos no permitidos: %s', path => {
    expect(safeParticipacionReturn(path)).toBeNull()
    expect(safeImpactoReturn(path)).toBeNull()
  })
})

describe('retorno público al mapa interno de campaña', () => {
  it('liga el contexto a la campaña y subcampaña consultadas sin redondear BIGINT', () => {
    const path = '/app/planting/campanias/9007199254740993?pestana=mapa&subcampania=9007199254740995&registro=9007199254740997'
    expect(safeCampaniaMapReturn(path, '9007199254740993', '9007199254740995')).toBe(path)
    expect(safeCampaniaMapReturn(path, '9007199254740992', '9007199254740995')).toBeNull()
    expect(safeCampaniaMapReturn(path, '9007199254740993', '9007199254740994')).toBeNull()
    expect(safeCampaniaMapReturn('/app/planting/campanias/7?pestana=mapa', '7', '11')).toBe('/app/planting/campanias/7?pestana=mapa')
    expect(safeCampaniaMapReturn({ campaniaReturnTo: path }, '9007199254740993', '9007199254740995')).toBeNull()
  })
  it.each([
    '/app/planting/campanias/7?pestana=mapa',
    '/app/planting/campanias/7?pestana=mapa&subcampania=11',
    '/app/planting/campanias/7?pestana=mapa&registro=13',
    '/app/planting/campanias/9007199254740993?pestana=mapa&subcampania=9007199254740995&registro=9007199254740997',
  ])('conserva el destino y sus IDs decimales exactos: %s', path => {
    expect(safeImpactoReturn(path)).toBe(path)
    expect(safeParticipacionReturn(path)).toBeNull()
  })

  it.each([
    '//otro.test/app/planting/campanias/7?pestana=mapa',
    'https://otro.test/app/planting/campanias/7?pestana=mapa',
    '/app/planting/campanias/7',
    '/app/planting/campanias/7?pestana=resumen',
    '/app/planting/campanias/7?pestana=mapa&token=privado',
    '/app/planting/campanias/7?pestana=mapa&subcampania=11&subcampania=12',
    '/app/planting/campanias/7?pestana=mapa&registro=13&registro=14',
    '/app/planting/campanias/7?pestana=mapa&registro=13&subcampania=11',
    '/app/planting/campanias/0?pestana=mapa',
    '/app/planting/campanias/07?pestana=mapa',
    '/app/planting/campanias/7?pestana=mapa&subcampania=-11',
    '/app/planting/campanias/7?pestana=mapa&registro=1.3',
    '/app/planting/campanias/7?pestana=mapa&registro=1e3',
    '/app/planting/campanias/7?pestana=mapa&registro=',
    '/app/planting/campanias/7?pestana=mapa#fragmento',
    '/app/planting/campanias/7?pestana=mapa\n',
  ])('rechaza destinos fuera del retorno canónico: %s', path => {
    expect(safeImpactoReturn(path)).toBeNull()
  })
})
