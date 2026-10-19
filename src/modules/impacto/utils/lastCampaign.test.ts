import { beforeEach, describe, expect, it } from 'vitest'
import { readLastCampaign, saveLastCampaign } from './lastCampaign'

beforeEach(() => localStorage.clear())
describe('preferencia de campaña por cuenta', () => {
  it('separa las cuentas y conserva IDs exactas sin guardar credenciales', () => {
    saveLastCampaign('42', '9007199254740997')
    saveLastCampaign('43', '18')
    expect(readLastCampaign('42')).toBe('9007199254740997')
    expect(readLastCampaign('43')).toBe('18')
    expect(readLastCampaign('44')).toBeNull()
    expect(Object.values(localStorage)).toEqual(['9007199254740997', '18'])
  })
  it('recupera la selección INT04 de la misma cuenta sin inventar otra campaña', () => {
    localStorage.setItem('r3foresta:registro-scope:v1:42', JSON.stringify({ campania_id: '8', subcampania_id: '91' }))
    expect(readLastCampaign('42')).toBe('8')
    expect(readLastCampaign('43')).toBeNull()
    saveLastCampaign('42', '9')
    expect(readLastCampaign('42')).toBe('9')
  })
  it('descarta preferencias inválidas y fuera de BIGINT', () => {
    saveLastCampaign('42', '01')
    expect(readLastCampaign('42')).toBeNull()
    saveLastCampaign('42', '9223372036854775808')
    expect(readLastCampaign('42')).toBeNull()
    localStorage.setItem('r3foresta:registro-scope:v1:42', '{invalido')
    expect(readLastCampaign('42')).toBeNull()
  })
})
