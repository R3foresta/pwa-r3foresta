import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import DetalleSubcampanaScreen from '../screens/DetalleSubcampanaScreen'
import type { Subcampania } from '../types/contracts'
import CerrarSubcampaniaModal from './CerrarSubcampaniaModal'

const authState = vi.hoisted(() => ({ user: { auth_id: 'auth-1', rol: 'ADMIN' } }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => authState }))
vi.mock('../../../services/plantacion.service', () => ({
  PlantacionService: {
    getSubcampania: vi.fn(),
    getSubcampaniaEquipo: vi.fn(),
    getSubcampaniaPlan: vi.fn(),
    cerrarSubcampania: vi.fn(),
  },
}))
vi.mock('react-leaflet', () => ({
  MapContainer: () => null,
  Polygon: () => null,
  TileLayer: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}))

const subcampania: Subcampania = {
  id: 54,
  campania_id: 20,
  nombre: 'Subcampaña Palca',
  zona_id: 1,
  meta_total_arboles: 200,
  total_plantado_inicial: 215,
  estado: 'ACTIVA',
  created_at: '2026-10-01',
}

beforeEach(() => {
  authState.user.rol = 'ADMIN'
  vi.mocked(PlantacionService.cerrarSubcampania).mockReset()
  vi.mocked(PlantacionService.getSubcampania).mockResolvedValue(subcampania)
  vi.mocked(PlantacionService.getSubcampaniaEquipo).mockResolvedValue([])
  vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({
    subcampania_id: 54,
    estado: 'ACTIVA',
    meta_total_arboles: 200,
    metas: [],
  })
})

describe('Cierre manual de subcampaña', () => {
  it('permite completar por encima de la meta únicamente después de confirmar', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn()
    const cancel = vi.fn()
    render(<CerrarSubcampaniaModal subcampania={subcampania} submitting={false} error={null}
      onClose={cancel} onConfirm={confirm} />)
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('215 plantados / meta 200')).toBeTruthy()
    expect(screen.queryByLabelText(/Motivo del cierre parcial/)).toBeNull()
    fireEvent.change(screen.getByLabelText(/Fecha de cierre/), { target: { value: '2026-10-08' } })
    expect((screen.getByLabelText(/Fin de mantenimiento/) as HTMLInputElement).value).toBe('2029-10-08')
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre completo' }))
    expect(confirm).toHaveBeenCalledExactlyOnceWith({
      estado_final: 'COMPLETADA',
      fecha_cierre_operativo: '2026-10-08',
      fecha_fin_mantenimiento: '2029-10-08',
    })
    expect(cancel).not.toHaveBeenCalled()
  })

  it('requiere un motivo de catálogo al cerrar por debajo de la meta', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn()
    render(<CerrarSubcampaniaModal subcampania={{ ...subcampania, total_plantado_inicial: 160 }}
      submitting={false} error={null} onClose={vi.fn()} onConfirm={confirm} />)
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre parcial' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('Selecciona un motivo para el cierre parcial.')).toBeTruthy()
    await user.selectOptions(screen.getByLabelText(/Motivo del cierre parcial/), 'FALTA_STOCK')
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre parcial' }))
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      estado_final: 'FINALIZADA_PARCIAL',
      motivo_cierre_parcial: 'FALTA_STOCK',
    }))
  })

  it('conserva el formulario y evita enviar con fechas incoherentes', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn()
    render(<CerrarSubcampaniaModal subcampania={subcampania} submitting={false} error={null}
      onClose={vi.fn()} onConfirm={confirm} />)
    fireEvent.change(screen.getByLabelText(/Fecha de cierre/), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText(/Fin de mantenimiento/), { target: { value: '2026-10-07' } })
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre completo' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('El fin de mantenimiento no puede ser anterior al cierre.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Seguir plantando' }))
    expect(confirm).not.toHaveBeenCalled()
  })

  function renderDetail() {
    return render(<MemoryRouter initialEntries={['/subcampanias/54']}>
      <Routes><Route path="/subcampanias/:subcampaniaId" element={<DetalleSubcampanaScreen />} /></Routes>
    </MemoryRouter>)
  }

  it('oculta el cierre a usuarios que no son ADMIN', async () => {
    const user = userEvent.setup()
    authState.user.rol = 'GENERAL'
    renderDetail()
    await user.click(await screen.findByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('button', { name: /Cerrar subcampaña/ })).toBeNull()
    expect(PlantacionService.cerrarSubcampania).not.toHaveBeenCalled()
  })

  it('oculta el cierre cuando la subcampaña ya está completada', async () => {
    const user = userEvent.setup()
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, estado: 'COMPLETADA' })
    renderDetail()
    await user.click(await screen.findByRole('button', { name: 'Más opciones' }))
    expect(screen.queryByRole('button', { name: /Cerrar subcampaña/ })).toBeNull()
    expect(PlantacionService.cerrarSubcampania).not.toHaveBeenCalled()
  })

  it('mantiene los datos editables y permite reintentar si falla el cierre', async () => {
    const user = userEvent.setup()
    const closed = {
      id: 54,
      estado: 'COMPLETADA' as const,
      fase_mantenimiento: 'MANTENIMIENTO_ACTIVO' as const,
      fecha_cierre_operativo: '2026-10-08',
      fecha_fin_mantenimiento: '2030-10-08',
    }
    vi.mocked(PlantacionService.cerrarSubcampania)
      .mockRejectedValueOnce(new Error('No se pudo guardar el cierre.'))
      .mockResolvedValueOnce(closed)
    renderDetail()
    await user.click(await screen.findByRole('button', { name: 'Más opciones' }))
    await user.click(screen.getByRole('button', { name: /Cerrar subcampaña/ }))
    fireEvent.change(screen.getByLabelText(/Fecha de cierre/), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText(/Fin de mantenimiento/), { target: { value: '2030-10-08' } })
    await user.type(screen.getByLabelText('Observaciones'), 'Cierre revisado en campo.')
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre completo' }))
    expect(await screen.findByText('No se pudo guardar el cierre.')).toBeTruthy()
    expect((screen.getByLabelText('Observaciones') as HTMLTextAreaElement).value).toBe('Cierre revisado en campo.')
    expect((screen.getByLabelText(/Fin de mantenimiento/) as HTMLInputElement).value).toBe('2030-10-08')
    expect(screen.getByLabelText('Observaciones').hasAttribute('disabled')).toBe(false)
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, ...closed })
    await user.click(screen.getByRole('button', { name: 'Confirmar cierre completo' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(PlantacionService.cerrarSubcampania).toHaveBeenCalledTimes(2)
    expect(PlantacionService.cerrarSubcampania).toHaveBeenLastCalledWith(54, {
      estado_final: 'COMPLETADA',
      fecha_cierre_operativo: '2026-10-08',
      fecha_fin_mantenimiento: '2030-10-08',
      observaciones_cierre: 'Cierre revisado en campo.',
    }, 'auth-1')
  })

  it('cierra desde el detalle, bloquea doble envío y actualiza el estado confirmado', async () => {
    const user = userEvent.setup()
    let resolveClose!: (value: Awaited<ReturnType<typeof PlantacionService.cerrarSubcampania>>) => void
    vi.mocked(PlantacionService.cerrarSubcampania).mockImplementation(() => new Promise((resolve) => {
      resolveClose = resolve
    }))
    renderDetail()
    await user.click(await screen.findByRole('button', { name: 'Más opciones' }))
    await user.click(screen.getByRole('button', { name: /Cerrar subcampaña/ }))
    expect(PlantacionService.cerrarSubcampania).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Confirmar cierre completo' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(PlantacionService.cerrarSubcampania).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Procesando…' }).hasAttribute('disabled')).toBe(true)
    vi.mocked(PlantacionService.getSubcampania).mockResolvedValue({ ...subcampania, estado: 'COMPLETADA' })
    resolveClose({
      id: 54,
      estado: 'COMPLETADA',
      fase_mantenimiento: 'MANTENIMIENTO_ACTIVO',
      fecha_cierre_operativo: '2026-10-08',
      fecha_fin_mantenimiento: '2029-10-08',
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByRole('button', { name: 'Registrar plantación' })).toBeNull()
    expect(screen.getByText('Subcampaña completada. La plantación inicial terminó y el mantenimiento está activo.')).toBeTruthy()
  })
})
