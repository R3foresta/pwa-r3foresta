import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { OperationalAccessGate } from '../accesos/OperationalAccessGate'
import { OperationalAccessContext, type AccessState } from '../accesos/capabilitiesContext'
import { assigned, m1Fixture, m2Fixture } from '../accesos/test-fixtures'
import type { AccesoM1 } from '../accesos/types'
import RecoleccionesScreen from './RecoleccionesScreen'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '8', rol: 'VALIDADOR' } }) }))
const pagination = { page: 1, limit: 30, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
const refresh = vi.fn().mockResolvedValue(undefined)
const m1Ready = (enabled: boolean, maintain = enabled): AccessState<AccesoM1> => ({ status: 'ready', error: null, refresh, data: m1Fixture({ usuario_id: '8', rol_global: 'VALIDADOR', acceso_efectivo: enabled, capacidades: { crear: enabled, mantener_propias: maintain, confirmar_propias: false, desechar: false } }).data })
function entry(m1: AccessState<AccesoM1>, receives = true) {
  const m2 = { status: 'ready' as const, error: null, refresh, data: m2Fixture({ usuario_id: '8', rol_global: receives ? 'VALIDADOR' : 'GENERAL', viveros: [assigned(undefined, receives)] }).data }
  return <OperationalAccessContext.Provider value={{ m1, m2 }}>
    <MemoryRouter initialEntries={['/app/collections']}><Routes>
      <Route path="/app/collections" element={<OperationalAccessGate domain="M1" />}>
        <Route index element={<RecoleccionesScreen />} />
      </Route>
    </Routes></MemoryRouter>
  </OperationalAccessContext.Provider>
}
beforeEach(() => { vi.spyOn(RecoleccionesService, 'list').mockResolvedValue({ success: true, data: [], pagination }) })

describe('lista propia de Recolección separada de Recepción', () => {
  it.each([true, false])('la acción de revisar respeta can_edit=%s de la ficha', async canEdit => {
    const item = {
      id: 306, fecha: '2026-11-12', nombre_comercial: 'Tara', tipo_material: 'SEMILLA',
      usuario_id: '8', estado_registro: 'BORRADOR', estado_operativo: 'ABIERTO',
      cantidad_inicial_canonica: 10, saldo_actual: 10, unidad_canonica: 'UNIDAD', can_edit: canEdit,
    } as Recoleccion
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [item], pagination: { ...pagination, total: 1, totalPages: 1 } })
    render(entry(m1Ready(true)))
    await screen.findByText('Guardada sin enviar')
    const action = screen.queryByRole('link', { name: 'Revisar y enviar' })
    expect(Boolean(action)).toBe(canEdit)
    if (canEdit) expect(action?.getAttribute('href')).toBe('/app/collections/new?editId=306')
    else expect(screen.getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe('/app/collections/306')
  })

  it('al perder la capacidad de mantener se conserva el bloqueo de la lista', () => {
    const item = {
      id: 306, fecha: '2026-11-12', nombre_comercial: 'Tara', tipo_material: 'SEMILLA',
      usuario_id: '8', estado_registro: 'BORRADOR', estado_operativo: 'ABIERTO',
      cantidad_inicial_canonica: 10, saldo_actual: 10, unidad_canonica: 'UNIDAD', can_edit: true,
    } as Recoleccion
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [item], pagination: { ...pagination, total: 1, totalPages: 1 } })
    render(entry(m1Ready(true, false)))
    expect(screen.getByText(/Tu cuenta no tiene acceso/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Revisar y enviar' })).toBeNull()
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
  })

  it('una asignación para recibir no abre la lista propia sin M1', () => {
    render(entry(m1Ready(false)))
    expect(screen.getByText(/Tu cuenta no tiene acceso/)).toBeTruthy()
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
  })
  it.each([false, true])('M1 conserva su lista y ofrece Recepción solo con capacidad=%s', async receives => {
    render(entry(m1Ready(true), receives))
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: 'Recolecciones' })).toBeTruthy()
    expect(Boolean(screen.queryByRole('button', { name: 'Recepción' }))).toBe(receives)
  })
  it.each(['error', 'sessionExpired'] as const)('un fallo M1 (%s) no monta la lista propia', status => {
    render(entry({ status, data: null, error: 'No se pudo consultar M1', refresh }))
    expect(screen.getByRole('alert').textContent).toBe('No se pudo consultar M1')
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
  })
  it('espera M1 antes de consultar la lista propia', async () => {
    const view = render(entry({ status: 'loading', data: null, error: null, refresh }))
    expect(screen.getByRole('status').textContent).toContain('Consultando tus accesos')
    expect(RecoleccionesService.list).not.toHaveBeenCalled()
    view.rerender(entry(m1Ready(true)))
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
  })
})
