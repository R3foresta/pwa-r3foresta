import { describe, expect, it } from 'vitest'
import { canOpenAppPath } from '../../utils/appAccess'

describe('Ruta administrativa y recuperación', () => {
  it('permite montar recuperación para una cuenta que perdió ADMIN', () => {
    expect(canOpenAppPath('/app/usuarios', 'VOLUNTARIO')).toBe(true)
    expect(canOpenAppPath('/app/usuarios?recuperar=1', 'GENERAL')).toBe(true)
  })
  it('la excepción no abre otras rutas internas a voluntarios', () => {
    expect(canOpenAppPath('/app/usuarios-ajenos', 'VOLUNTARIO')).toBe(false)
    expect(canOpenAppPath('/app/collections', 'VOLUNTARIO')).toBe(false)
  })
})
