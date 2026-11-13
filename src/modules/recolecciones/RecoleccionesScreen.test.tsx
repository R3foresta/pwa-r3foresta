import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { OperationalAccessGate } from '../accesos/OperationalAccessGate'
import { OperationalAccessContext, type AccessState } from '../accesos/capabilitiesContext'
import { assigned, m1Fixture, m2Fixture } from '../accesos/test-fixtures'
import type { AccesoM1 } from '../accesos/types'
import RecoleccionesScreen from './RecoleccionesScreen'

const auth = vi.hoisted(() => ({ user: { id: '8', rol: 'VALIDADOR' } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))
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
beforeEach(() => {
  auth.user = { id: '8', rol: 'VALIDADOR' }
  vi.spyOn(RecoleccionesService, 'list').mockResolvedValue({ success: true, data: [], pagination })
})

function collection(id: number, name: string, overrides: Partial<Recoleccion> = {}): Recoleccion {
  return {
    id, codigo_trazabilidad: `REC-${id}`, fecha: '2026-11-12', nombre_comercial: name, tipo_material: 'SEMILLA',
    usuario_id: '8', estado_registro: 'BORRADOR', estado_operativo: 'ABIERTO',
    cantidad_inicial_canonica: 10, saldo_actual: 10, unidad_canonica: 'UNIDAD', ...overrides,
  } as Recoleccion
}

describe('consulta y continuidad de la lista', () => {
  it('muestra carga desde el primer render y solo muestra vacío después de consultar', async () => {
    let finish!: (value: Awaited<ReturnType<typeof RecoleccionesService.list>>) => void
    vi.mocked(RecoleccionesService.list).mockReturnValue(new Promise(resolve => { finish = resolve }))
    render(entry(m1Ready(true)))
    expect(screen.getByRole('status').textContent).toContain('Cargando recolecciones')
    expect(screen.queryByText('0 abiertas')).toBeNull()
    expect(screen.queryByText('Aún no existen registros.')).toBeNull()
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
    await act(async () => finish({ success: true, data: [], pagination }))
    expect(screen.getByText('Aún no existen registros.')).toBeTruthy()
  })

  it('descarta la respuesta de una búsqueda anterior aunque llegue al final', async () => {
    let oldSearch!: (value: Awaited<ReturnType<typeof RecoleccionesService.list>>) => void
    vi.mocked(RecoleccionesService.list)
      .mockImplementationOnce(() => new Promise(resolve => { oldSearch = resolve }))
      .mockResolvedValueOnce({ success: true, data: [collection(2, 'Tara')], pagination })
    render(entry(m1Ready(true)))
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
    const oldSignal = vi.mocked(RecoleccionesService.list).mock.calls[0][1]
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Tara' } })
    expect(screen.getByRole('status')).toBeTruthy()
    await screen.findByText('Tara')
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => oldSearch({ success: true, data: [collection(1, 'Consulta anterior')], pagination }))
    expect(screen.queryByText('Consulta anterior')).toBeNull()
    expect(screen.getByText('Tara')).toBeTruthy()
  })

  it('oculta la consulta anterior al cambiar actor y descarta sus respuestas tardías', async () => {
    let oldAccount!: (value: Awaited<ReturnType<typeof RecoleccionesService.list>>) => void
    vi.mocked(RecoleccionesService.list)
      .mockImplementationOnce(() => new Promise(resolve => { oldAccount = resolve }))
      .mockResolvedValueOnce({ success: true, data: [collection(2, 'Cuenta nueva')], pagination })
    const view = render(entry(m1Ready(true)))
    await waitFor(() => expect(RecoleccionesService.list).toHaveBeenCalledTimes(1))
    auth.user = { id: '9', rol: 'GENERAL' }
    localStorage.setItem('authToken', 'token-nuevo')
    view.rerender(entry(m1Ready(true)))
    await screen.findByText('Cuenta nueva')
    await act(async () => oldAccount({ success: true, data: [collection(1, 'Cuenta anterior')], pagination }))
    expect(screen.queryByText('Cuenta anterior')).toBeNull()
  })

  it('permite reintentar un error sin presentarlo como una lista vacía', async () => {
    vi.mocked(RecoleccionesService.list).mockRejectedValueOnce(new Error('Sin conexión'))
    render(entry(m1Ready(true)))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Sin conexión'))
    expect(screen.queryByText('Aún no existen registros.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByRole('status')).toBeTruthy()
    await screen.findByText('Aún no existen registros.')
  })

  it('consulta las páginas del backend y vuelve a la primera al filtrar', async () => {
    const firstPage = { ...pagination, total: 31, totalPages: 2, hasNextPage: true }
    vi.mocked(RecoleccionesService.list)
      .mockResolvedValueOnce({ success: true, data: [collection(1, 'Primera página')], pagination: firstPage })
      .mockResolvedValueOnce({ success: true, data: [collection(31, 'Segunda página')], pagination: { ...firstPage, page: 2, hasNextPage: false, hasPrevPage: true } })
      .mockResolvedValueOnce({ success: true, data: [], pagination })
    render(entry(m1Ready(true)))
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Segunda página')
    expect(RecoleccionesService.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal))
    expect(screen.queryByText('Primera página')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Esqueje' }))
    await screen.findByText('No hay coincidencias con los filtros.')
    expect(RecoleccionesService.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, tipo_material: 'ESQUEJE' }), expect.any(AbortSignal))
  })

  it('mantiene visible una ficha sin saldo conocido sin clasificarla como cerrada ni editable', async () => {
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [collection(1, 'Estado incompleto', { saldo_actual: null, estado_operativo: null, estado_registro: null })], pagination })
    render(entry(m1Ready(true)))
    await screen.findByText('Estado incompleto')
    expect(screen.queryByText(/Sin saldo en origen/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Revisar y enviar' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver detalle de REC-1' })).toBeTruthy()
  })
})

describe('lista propia de Recolección separada de Recepción', () => {
  it.each([true, false])('la acción de revisar respeta can_edit=%s de la ficha', async canEdit => {
    const item = {
      id: 306, codigo_trazabilidad: 'REC-306', fecha: '2026-11-12', nombre_comercial: 'Tara', tipo_material: 'SEMILLA',
      usuario_id: '8', estado_registro: 'BORRADOR', estado_operativo: 'ABIERTO',
      cantidad_inicial_canonica: 10, saldo_actual: 10, unidad_canonica: 'UNIDAD', can_edit: canEdit,
    } as Recoleccion
    vi.mocked(RecoleccionesService.list).mockResolvedValue({ success: true, data: [item], pagination: { ...pagination, total: 1, totalPages: 1 } })
    render(entry(m1Ready(true)))
    await screen.findByText('Guardada sin enviar')
    const action = screen.queryByRole('link', { name: 'Revisar y enviar' })
    expect(Boolean(action)).toBe(canEdit)
    if (canEdit) expect(action?.getAttribute('href')).toBe('/app/collections/new?editId=306')
    else expect(screen.getByRole('link', { name: 'Ver detalle de REC-306' }).getAttribute('href')).toBe('/app/collections/306')
  })

  it('al perder la capacidad de mantener se conserva el bloqueo de la lista', () => {
    const item = {
      id: 306, codigo_trazabilidad: 'REC-306', fecha: '2026-11-12', nombre_comercial: 'Tara', tipo_material: 'SEMILLA',
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
