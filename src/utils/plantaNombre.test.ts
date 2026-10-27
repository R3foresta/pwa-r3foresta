import { describe, expect, it } from 'vitest'
import { getPlantaNombre } from './plantaNombre'

describe('nombre operativo de una planta', () => {
  it('elige el común frente al científico', () => {
    expect(getPlantaNombre({ nombre_comun_principal: ' Lechuga de agua ', nombre_cientifico: 'Pistia stratiotes' })).toBe('Lechuga de agua')
  })
  it.each([null, undefined, '', '   '])('usa científico cuando común es %s', nombre_comun_principal => {
    expect(getPlantaNombre({ nombre_comun_principal, nombre_cientifico: ' Pistia stratiotes ' })).toBe('Pistia stratiotes')
  })
  it('identifica la planta si no hay ningún nombre', () => {
    expect(getPlantaNombre({ nombre_comun_principal: ' ', nombre_cientifico: null }, 'Planta #50')).toBe('Planta #50')
  })
})
