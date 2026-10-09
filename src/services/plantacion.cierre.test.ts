import { describe, expect, it, vi } from 'vitest'
import { listSubcampaniasByCampaniaApi } from '../api/plantacion.api'
import type { CerrarSubcampaniaInput } from '../modules/plantacion/types/contracts'
import { PlantacionService } from './plantacion.service'

const input: CerrarSubcampaniaInput = {
  estado_final: 'COMPLETADA',
  fecha_cierre_operativo: '2026-10-08',
  fecha_fin_mantenimiento: '2029-10-08',
}

describe('PlantacionService.cerrarSubcampania', () => {
  it('envía el cierre al endpoint existente con autenticación y devuelve la confirmación', async () => {
    localStorage.setItem('authToken', 'jwt')
    const data = { id: 54, estado: 'COMPLETADA', fase_mantenimiento: 'MANTENIMIENTO_ACTIVO' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await PlantacionService.cerrarSubcampania(54, input, 'auth-1')).toEqual(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/54/cerrar'), {
      method: 'POST',
      headers: { 'x-auth-id': 'auth-1', Authorization: 'Bearer jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it('mantiene el rechazo de permisos del backend como error, sin simular un cierre', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Solo ADMIN puede cerrar.' }), { status: 403 })))
    await expect(PlantacionService.cerrarSubcampania(54, input, 'auth-1')).rejects.toMatchObject({
      message: 'Solo ADMIN puede cerrar.', status: 403,
    })
  })

  it('no envía el cierre parcial si falta el motivo obligatorio', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(PlantacionService.cerrarSubcampania(54, { ...input, estado_final: 'FINALIZADA_PARCIAL' }, 'auth-1'))
      .rejects.toThrow('Selecciona un motivo para el cierre parcial.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mantiene las subcampañas finalizadas parcialmente en el listado de la campaña', async () => {
    localStorage.setItem('auth_id', 'auth-1')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await listSubcampaniasByCampaniaApi(20)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('FINALIZADA_PARCIAL'), expect.any(Object))
  })
})
