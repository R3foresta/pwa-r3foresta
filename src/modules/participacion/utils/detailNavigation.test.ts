import { describe, expect, it } from 'vitest'
import { safeImpactoReturn } from '../../impacto/utils/consulta'
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
