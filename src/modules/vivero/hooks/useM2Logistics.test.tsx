import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import { useM2Logistics } from './useM2Logistics'
import { assigned, m2Fixture, VIVERO_A, VIVERO_B } from '../../accesos/test-fixtures'
import type { AccesoM2 } from '../../accesos/types'

const account = vi.hoisted(() => ({ actor: '9007199254740993', access: null as AccesoM2 | null }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: account.actor } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: account.access } }) }))
beforeEach(() => { account.actor = '9007199254740993'; account.access = m2Fixture({ viveros: [assigned(VIVERO_B)] }).data })
describe('intersección M2 y responsabilidad M3', () => {
  it('coordinador del ámbito necesita además operar el vivero exacto', async () => {
    const read = vi.spyOn(PlantacionService, 'getSubcampaniaEquipoExacto').mockResolvedValue([{ id: 1, usuario_id: account.actor, rol: 'COORDINADOR' }])
    const view = renderHook(({ vivero }) => useM2Logistics(vivero, '31'), { initialProps: { vivero: VIVERO_B } })
    await waitFor(() => expect(view.result.current.allowed).toBe(true))
    view.rerender({ vivero: VIVERO_A })
    expect(view.result.current.allowed).toBe(false)
    expect(read).toHaveBeenCalledTimes(1)
  })
  it('un coordinador BIGINT vecino u OPERARIO no concede entrega/devolución', async () => {
    vi.spyOn(PlantacionService, 'getSubcampaniaEquipoExacto').mockResolvedValue([{ id: 1, usuario_id: '9007199254740992', rol: 'COORDINADOR' }, { id: 2, usuario_id: account.actor, rol: 'OPERARIO' }])
    const view = renderHook(() => useM2Logistics(VIVERO_B, '31'))
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.allowed).toBe(false)
  })
  it('ADMIN deriva operación global sin consultar un equipo para inventar asignación', () => {
    account.access = m2Fixture({ rol_global: 'ADMIN', alcance_global: true, capacidades_globales: { administrar: true, operar_cualquier_vivero: true, desechar_semillas_cualquier_vivero: true, recibir_y_validar_cualquier_vivero: true } }).data
    const read = vi.spyOn(PlantacionService, 'getSubcampaniaEquipoExacto')
    const view = renderHook(() => useM2Logistics(VIVERO_A, '31'))
    expect(view.result.current.allowed).toBe(true)
    expect(read).not.toHaveBeenCalled()
  })
  it('cambiar de ámbito descarta una respuesta tardía y diferencia fallo de permisos', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof PlantacionService.getSubcampaniaEquipoExacto>>) => void
    vi.spyOn(PlantacionService, 'getSubcampaniaEquipoExacto').mockReturnValueOnce(new Promise(done => { resolve = done })).mockRejectedValueOnce(new Error('Equipo sintético no disponible'))
    const view = renderHook(({ scope }) => useM2Logistics(VIVERO_B, scope), { initialProps: { scope: '31' } })
    view.rerender({ scope: '32' })
    await waitFor(() => expect(view.result.current.error).toContain('no disponible'))
    await act(async () => resolve([{ id: 1, usuario_id: account.actor, rol: 'COORDINADOR' }]))
    expect(view.result.current.allowed).toBe(false)
    expect(view.result.current.error).toContain('no disponible')
  })
})
