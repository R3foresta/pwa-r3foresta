import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import RecoleccionStockHistorialScreen from './RecoleccionStockHistorialScreen'
import RecoleccionDetailScreen from './RecoleccionDetailScreen'
import RecoleccionStockCard from './components/RecoleccionStockCard'

const auth = vi.hoisted(() => ({ logout: vi.fn(), user: { id: '1', rol: 'ADMIN' } as { id: string; rol: string } | null }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: auth.logout }) }))

const planta = { planta_id: 2, especie: 'Jacarandá', nombre_cientifico: 'Jacaranda mimosifolia', variedad: null, nombre_comun_principal: 'Jacarandá', imagen_url: 'https://example.com/arbol.jpg' }
const registro = { id: 292, planta_id: 2, fecha: '2026-11-03', codigo_trazabilidad: 'REC-292', nombre_recolector_snapshot: 'Ana Pérez', unidad_canonica: 'G', cantidad_inicial_canonica: '100.5', saldo_actual: 0, estado_operativo: 'CERRADO', estado_registro: 'VALIDADO', tipo_material: 'SEMILLA' }
const pagina = (page: number, data: unknown[] = [registro]) => ({ success: true, planta, data, pagination: { page, limit: 10, total: 11, totalPages: 2, hasNextPage: page === 1, hasPrevPage: page === 2 } })
const stock = { success: true, data: [{ ...planta, gramos_disponibles: 23.5, unidades_disponibles: 12, pendientes_validacion: 0 }] }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function Jump() {
  const navigate = useNavigate()
  return <><button onClick={() => navigate('/app/collections/stock/3')}>Cambiar especie</button><button onClick={() => navigate('/app/collections/stock/2?page=2')}>Ir a página dos</button></>
}
function AppRoutes({ initial = '/app/collections/stock/2' }: { initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}><Jump /><Routes>
    <Route path="/app/home" element={<p>Inicio</p>} />
    <Route path="/app/collections/stock" element={<p>Stock general</p>} />
    <Route path="/app/collections/stock/:plantaId" element={<RecoleccionStockHistorialScreen />} />
    <Route path="/app/collections/:id" element={<RecoleccionDetailScreen />} />
  </Routes></MemoryRouter>
}

beforeEach(() => {
  auth.user = { id: '1', rol: 'ADMIN' }
  localStorage.setItem('authToken', 'token-a')
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    return Promise.resolve(json(url.includes('/historial') ? pagina(url.includes('page=2') ? 2 : 1) : stock))
  }))
})

describe('historial administrativo de semillas', () => {
  it.each(['GENERAL', 'VALIDADOR', 'VOLUNTARIO'])('impide montar y consultar con rol %s incluso por URL directa', async rol => {
    auth.user = { id: '1', rol }
    render(<AppRoutes />)
    expect(await screen.findByText('Inicio')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('navega desde la tarjeta y muestra el snapshot, saldo cerrado y unidades separadas', async () => {
    render(<MemoryRouter><RecoleccionStockCard item={stock.data[0]} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Ver historial de Jacarandá' }).getAttribute('href')).toBe('/app/collections/stock/2')
    fireEvent.error(screen.getByRole('presentation'))
    expect(screen.queryByRole('presentation')).not.toBeTruthy()
  })

  it('consulta la especie y página del servidor, muestra a otros recolectores y vuelve desde el detalle a la página', async () => {
    const user = userEvent.setup()
    vi.spyOn(RecoleccionesService, 'getById').mockResolvedValue({ success: true, data: { ...registro, planta_id: 2, usuario_id: 8, observaciones: null, evidencias: [], created_at: '2026-11-03', unidad_canonica: 'G' } as unknown as Recoleccion })
    vi.mocked(fetch).mockImplementation(input => {
      const url = String(input)
      const data = url.includes('page=2') ? [{ ...registro, id: 293, codigo_trazabilidad: 'REC-293', nombre_recolector_snapshot: 'Otro recolector', unidad_canonica: 'UNIDAD', cantidad_inicial_canonica: 8, saldo_actual: 3, estado_operativo: 'ABIERTO' }] : [registro]
      return Promise.resolve(json(url.includes('/historial') ? pagina(url.includes('page=2') ? 2 : 1, data) : stock))
    })
    render(<AppRoutes />)
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText('Sin saldo en origen')).toBeTruthy()
    expect(screen.getByText('100,5 G')).toBeTruthy()
    expect(screen.getByText('0 G')).toBeTruthy()
    expect(screen.getByText('Total: 11')).toBeTruthy()
    expect(screen.getByText('3/11/2026')).toBeTruthy()
    expect(screen.getByText('23,5 G')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Otro recolector')).toBeTruthy()
    expect(screen.getByText('8 Unidades')).toBeTruthy()
    expect(screen.getByText('3 Unidades')).toBeTruthy()
    expect(screen.queryByText('Ana Pérez')).not.toBeTruthy()
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/stock-summary/2/historial?page=2&limit=10'), expect.objectContaining({ headers: { Authorization: 'Bearer token-a' } }))
    await user.click(screen.getByRole('link', { name: /REC-293/ }))
    await screen.findByRole('heading', { name: 'Detalle de Recolección' })
    expect(screen.getByText('03 de noviembre de 2026')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('Otro recolector')).toBeTruthy()
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
  })

  it('mantiene el historial visible si falla la disponibilidad y permite reintentar', async () => {
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(String(input).includes('/historial') ? json(pagina(1)) : json({}, 500)))
    render(<AppRoutes />)
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    expect(await screen.findByText(/Disponibilidad no disponible/)).toBeTruthy()
    expect(screen.queryByText('23,5 G')).not.toBeTruthy()
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(json(String(input).includes('/historial') ? pagina(1) : stock)))
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }))
    expect(await screen.findByText('23,5 G')).toBeTruthy()
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/historial'))).toHaveLength(1)
  })

  it('distingue vacío válido, error recuperable, 401 y 403', async () => {
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(json(String(input).includes('/historial') ? pagina(1, []) : { success: true, data: [] })))
    const view = render(<AppRoutes />)
    expect(await screen.findByText(/No hay recolecciones validadas/)).toBeTruthy()
    expect(screen.getByText('Disponibilidad no disponible para esta especie.')).toBeTruthy()
    view.unmount()
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(String(input).includes('/historial') ? json({}, 500) : json(stock)))
    const retryView = render(<AppRoutes />)
    expect(await screen.findByText(/No se pudo cargar la información/)).toBeTruthy()
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(json(String(input).includes('/historial') ? pagina(1) : stock)))
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Ana Pérez')).toBeTruthy()
    retryView.unmount()
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(String(input).includes('/historial') ? json({}, 401) : json(stock)))
    const expired = render(<AppRoutes />)
    expect(await screen.findByText(/Tu sesión expiró/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/auth/login')
    await userEvent.click(screen.getByRole('link', { name: 'Iniciar sesión' }))
    expect(auth.logout).toHaveBeenCalledOnce()
    expired.unmount()
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(String(input).includes('/historial') ? json({}, 403) : json(stock)))
    render(<AppRoutes />)
    expect(await screen.findByText(/No tienes acceso/)).toBeTruthy()
  })


  it.each([
    ['otra especie', { planta_id: 3 }],
    ['otro material', { tipo_material: 'ESQUEJE' }],
    ['otro estado', { estado_registro: 'BORRADOR' }],
    ['saldo inválido', { saldo_actual: -1 }],
    ['precisión inválida', { cantidad_inicial_canonica: 2.34 }],
  ])('rechaza una fila con %s en vez de mostrarla o convertirla en vacío', async (_label, change) => {
    vi.mocked(fetch).mockImplementation(input => Promise.resolve(json(String(input).includes('/historial') ? pagina(1, [{ ...registro, ...change }]) : stock)))
    render(<AppRoutes />)
    expect(await screen.findByText(/No se pudo cargar la información/)).toBeTruthy()
    expect(screen.queryByText('REC-292')).toBeNull()
    expect(screen.queryByText(/No hay recolecciones validadas/)).toBeNull()
  })


  it('conserva la especie y página al volver desde un detalle que falla', async () => {
    vi.spyOn(RecoleccionesService, 'getById').mockRejectedValue(new Error('No disponible'))
    render(<AppRoutes initial="/app/collections/stock/2?page=2" />)
    await userEvent.click(await screen.findByRole('link', { name: /REC-292/ }))
    expect(await screen.findByText('No se pudo cargar la recolección')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al listado' }))
    expect(await screen.findByText('Página 2 de 2')).toBeTruthy()
  })

  it('descarta la respuesta de una especie anterior', async () => {
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(input => {
      const url = String(input)
      if (url.includes('/2/historial')) return new Promise(resolve => { resolveOld = resolve })
      if (url.includes('/3/historial')) return Promise.resolve(json({ ...pagina(1, []), planta: { ...planta, planta_id: 3, especie: 'Tilo', nombre_comun_principal: 'Tilo' } }))
      return Promise.resolve(json(stock))
    })
    render(<AppRoutes />)
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar especie' }))
    expect(await screen.findByRole('heading', { name: 'Tilo' })).toBeTruthy()
    await act(async () => resolveOld(json(pagina(1))))
    expect(screen.queryByText('REC-292')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Tilo' })).toBeTruthy()
  })

  it('descarta la respuesta tardía de una página anterior', async () => {
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(input => {
      const url = String(input)
      if (url.includes('/historial') && !url.includes('page=2')) return new Promise(resolve => { resolveOld = resolve })
      return Promise.resolve(json(url.includes('/historial') ? pagina(2, [{ ...registro, codigo_trazabilidad: 'REC-NUEVO' }]) : stock))
    })
    const view = render(<AppRoutes />)
    await userEvent.click(screen.getByRole('button', { name: 'Ir a página dos' }))
    expect(await screen.findByText('REC-NUEVO')).toBeTruthy()
    await act(async () => resolveOld(json(pagina(1))))
    expect(screen.queryByText('REC-292')).not.toBeTruthy()
    view.unmount()


  })
  it.each(['actor', 'token'])('descarta la respuesta anterior al cambiar %s', async changed => {
    const pending: Array<(response: Response) => void> = []
    vi.mocked(fetch).mockImplementation(input => String(input).includes('/historial')
      ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(json(stock)))
    const current = render(<AppRoutes />)
    expect(pending).toHaveLength(1)
    if (changed === 'token') localStorage.setItem('authToken', 'token-b')
    else auth.user = { id: '2', rol: 'ADMIN' }
    current.rerender(<AppRoutes />)
    expect(pending).toHaveLength(2)
    await act(async () => pending[0](json(pagina(1, [{ ...registro, codigo_trazabilidad: 'REC-ANTIGUO' }]))))
    expect(screen.queryByText('REC-ANTIGUO')).toBeNull()
    await act(async () => pending[1](json(pagina(1, [{ ...registro, codigo_trazabilidad: 'REC-NUEVO' }]))))
    expect(await screen.findByText('REC-NUEVO')).toBeTruthy()
  })

})
