import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OperationalAccessGate } from './OperationalAccessGate'
import { OperationalAccessContext, useOperationalAccess, type AccessState } from './capabilitiesContext'
import { OperationalAccessProvider } from './OperationalAccessProvider'
import { AccesosService } from './accesos.api'
import { assigned, m1Fixture, m2Fixture, VIVERO_A } from './test-fixtures'
import type { AccesoM1, AccesoM2 } from './types'

const account = vi.hoisted(() => ({ id: '7', login: vi.fn() }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: account.id, auth_id: `synthetic-${account.id}` }, login: account.login }) }))
function state<T>(data: T | null, status: AccessState<T>['status'] = 'ready'): AccessState<T> { return { data, status, error: status === 'error' ? 'Fallo sintético de permisos' : null, refresh: vi.fn().mockResolvedValue(undefined) } }
const effectiveM1 = () => m1Fixture({ acceso_efectivo: true, capacidades: { crear: true, mantener_propias: true, confirmar_propias: false, desechar: false } }).data
function gate(path: string, m1: AccessState<AccesoM1>, m2: AccessState<AccesoM2>) {
  return render(<OperationalAccessContext.Provider value={{ m1, m2 }}><MemoryRouter initialEntries={[path]}><Routes><Route element={<OperationalAccessGate domain={path.includes('/vivero') ? 'M2' : 'M1'} />}><Route path="*" element={<p>Operación montada</p>} /></Route></Routes></MemoryRouter></OperationalAccessContext.Provider>)
}
beforeEach(() => { account.id = '7'; localStorage.setItem('authToken', 'synthetic-7') })

describe('URLs directas por acceso efectivo', () => {
  it.each([
    ['solo M1', true, false], ['solo M2', false, true], ['ambos', true, true], ['ninguno', false, false],
  ])('%s abre únicamente sus módulos', (_name, m1, m2) => {
    const v1 = gate('/app/collections/new', state(m1 ? effectiveM1() : m1Fixture().data), state(m2Fixture({ viveros: m2 ? [assigned()] : [] }).data))
    expect(Boolean(screen.queryByText('Operación montada'))).toBe(m1)
    v1.unmount()
    gate('/app/vivero/new', state(m1 ? effectiveM1() : m1Fixture().data), state(m2Fixture({ viveros: m2 ? [assigned()] : [] }).data))
    expect(Boolean(screen.queryByText('Operación montada'))).toBe(m2)
  })
  it('VALIDADOR con M2 y sin M1 abre revisión documental pero no captura', () => {
    const m2 = state(m2Fixture({ rol_global: 'VALIDADOR', viveros: [assigned(VIVERO_A, true)] }).data)
    const view = gate('/app/collections/validate', state(m1Fixture().data), m2)
    expect(screen.getByText('Operación montada')).toBeTruthy()
    view.unmount()
    gate('/app/collections/new', state(m1Fixture().data), m2)
    expect(screen.queryByText('Operación montada')).toBeNull()
  })
  it('la captura usa crear; mantener lo propio no abre una creación nueva', () => {
    gate('/app/collections/new', state(m1Fixture({ capacidades: { crear: false, mantener_propias: true, confirmar_propias: false, desechar: false } }).data), state(m2Fixture().data))
    expect(screen.queryByText('Operación montada')).toBeNull()
  })
  it('no convierte error o carga en ausencia de permisos', () => {
    const view = gate('/app/vivero/new', state<AccesoM1>(null), state<AccesoM2>(null, 'loading'))
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText(/Tu cuenta no tiene/)).toBeNull()
    view.unmount()
    gate('/app/vivero/new', state<AccesoM1>(null), state<AccesoM2>(null, 'error'))
    expect(screen.getByRole('alert').textContent).toBe('Fallo sintético de permisos')
    expect(screen.queryByText('Operación montada')).toBeNull()
  })
})

function Observed() {
  const { m1, m2 } = useOperationalAccess()
  return <div><p>M1: {m1.status} {m1.data?.usuario_id}</p><p>M2: {m2.status} {m2.data?.usuario_id}</p></div>
}
describe('lecturas propias aisladas por identidad', () => {
  it('un fallo M1 no revoca M2 y se descarta la lectura de otra cuenta', async () => {
    let resolve!: (value: ReturnType<typeof m2Fixture>) => void
    vi.spyOn(AccesosService, 'm1').mockRejectedValue(new Error('Fallo sintético M1'))
    vi.spyOn(AccesosService, 'm2').mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValue(m2Fixture({ usuario_id: '8', viveros: [assigned()] }))
    const view = render(<OperationalAccessProvider><Observed /></OperationalAccessProvider>)
    await waitFor(() => expect(AccesosService.m2).toHaveBeenCalledTimes(1))
    await screen.findByText('M1: error')
    account.id = '8'; localStorage.setItem('authToken', 'synthetic-8')
    view.rerender(<OperationalAccessProvider><Observed /></OperationalAccessProvider>)
    await screen.findByText('M2: ready 8')
    await act(async () => resolve(m2Fixture({ usuario_id: '7' })))
    expect(screen.queryByText('M2: ready 7')).toBeNull()
    expect(vi.mocked(AccesosService.m2).mock.calls[0][3]?.aborted).toBe(true)
  })
})
