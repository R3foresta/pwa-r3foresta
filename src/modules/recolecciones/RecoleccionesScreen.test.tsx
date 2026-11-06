import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService } from '../../services/recolecciones.service'
import { OperationalAccessGate } from '../accesos/OperationalAccessGate'
import { OperationalAccessContext, type AccessState } from '../accesos/capabilitiesContext'
import { assigned, m1Fixture, m2Fixture } from '../accesos/test-fixtures'
import type { AccesoM1 } from '../accesos/types'
import RecoleccionesScreen from './RecoleccionesScreen'
import RecoleccionesValidacionScreen from './RecoleccionesValidacionScreen'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '8', rol: 'VALIDADOR' } }) }))
const pagination = { page: 1, limit: 30, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
const refresh = vi.fn().mockResolvedValue(undefined)
const m1Ready = (enabled: boolean): AccessState<AccesoM1> => ({ status: 'ready', error: null, refresh, data: m1Fixture({ usuario_id: '8', rol_global: 'VALIDADOR', acceso_efectivo: enabled, capacidades: { crear: enabled, mantener_propias: enabled, confirmar_propias: false, desechar: false } }).data })
function Location() { return <p>Ruta actual: {useLocation().pathname}</p> }
function entry(m1: AccessState<AccesoM1>, m2Enabled = true) {
  const m2 = { status: 'ready' as const, error: null, refresh, data: m2Fixture({ usuario_id: '8', rol_global: 'VALIDADOR', viveros: m2Enabled ? [assigned(undefined, true)] : [] }).data }
  return <OperationalAccessContext.Provider value={{ m1, m2 }}>
    <MemoryRouter initialEntries={['/app/collections']}><Location /><Routes><Route path="/app/home" element={<h1>Inicio sintético</h1>} />
      <Route path="/app/collections" element={<OperationalAccessGate domain="M1" />}>
        <Route index element={<RecoleccionesScreen />} />
        <Route path="validate" element={<RecoleccionesValidacionScreen />} />
      </Route>
    </Routes></MemoryRouter>
  </OperationalAccessContext.Provider>
}
beforeEach(() => {
  vi.spyOn(RecoleccionesService, 'list').mockRejectedValue(new Error('403: la lista propia requiere M1'))
  vi.spyOn(RecoleccionesService, 'getPendingValidation').mockResolvedValue({ success: true, data: [], pagination })
})

describe('entrada normal de Recolección desde el índice', () => {
  it('VALIDADOR con M2 y sin M1 llega a la cola sin pedir la lista propia prohibida', async () => {
    render(entry(m1Ready(false)))
    await screen.findByRole('heading', { name: 'Validar' })
    expect(screen.getByText('Ruta actual: /app/collections/validate')).toBeTruthy()
    await waitFor(() => expect(RecoleccionesService.getPendingValidation).toHaveBeenCalledTimes(1))
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
    expect(screen.queryByText(/403/)).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByRole('heading', { name: 'Inicio sintético' })).toBeTruthy()
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
  })
  it.each([false, true])('M1 conserva su lista propia con revisión M2=%s', async m2Enabled => {
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [], pagination })
    render(entry(m1Ready(true), m2Enabled))
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: 'Recolecciones' })).toBeTruthy()
    expect(screen.getByText('Ruta actual: /app/collections')).toBeTruthy()
    expect(RecoleccionesService.getPendingValidation).not.toHaveBeenCalled()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Pendientes' }))
    await screen.findByRole('heading', { name: 'Validar' })
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByRole('heading', { name: 'Recolecciones' })).toBeTruthy()
    expect(screen.getByText('Ruta actual: /app/collections')).toBeTruthy()
  })
  it.each(['error', 'sessionExpired'] as const)('un fallo M1 (%s) no exige conceder M1 al revisor M2', async status => {
    render(entry({ status, data: null, error: 'No se pudo consultar M1', refresh }))
    await screen.findByRole('heading', { name: 'Validar' })
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
    expect(RecoleccionesService.getPendingValidation).toHaveBeenCalledTimes(1)
  })
  it.each([false, true])('espera la lectura M1 antes de resolver el índice: M1 efectivo=%s', async enabled => {
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [], pagination })
    const view = render(entry({ status: 'loading', data: null, error: null, refresh }))
    expect(screen.getByRole('status').textContent).toContain('Consultando tu acceso')
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
    expect(RecoleccionesService.getPendingValidation).not.toHaveBeenCalled()
    view.rerender(entry(m1Ready(enabled)))
    await screen.findByRole('heading', { name: enabled ? 'Recolecciones' : 'Validar' })
    if (enabled) {
      await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
      expect(RecoleccionesService.getPendingValidation).not.toHaveBeenCalled()
    } else {
      await waitFor(() => expect(RecoleccionesService.getPendingValidation).toHaveBeenCalledTimes(1))
      expect(RecoleccionesService.list).not.toHaveBeenCalled()
    }
  })
})
