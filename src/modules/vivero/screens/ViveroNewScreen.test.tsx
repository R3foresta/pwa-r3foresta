import { m2Fixture, assigned } from '../../accesos/test-fixtures'
import { OrigenesService } from '../api/origenes.api'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import ViveroNewScreen from './ViveroNewScreen'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', auth_id: 'auth-test', nombre: 'Ana', apellido: 'Quispe' } }),
}))

vi.mock('../../../hooks/useViveros', () => ({
  useViveros: () => ({ viveros: [{ id: 7, nombre: 'Vivero Norte', codigo: 'VN' }], loading: false, error: null }),
}))

vi.mock('../api/origenes.api', () => ({ OrigenesService: { listar: vi.fn() } }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ viveros: [assigned('7')] }).data } }) }))

vi.mock('../../../services/lotes-vivero.service', () => ({
  LotesViveroService: {
    uploadEvidenciasPendientes: vi.fn(),
    createLote: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.setItem('authToken', 'synthetic-session')
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:foto'),
    revokeObjectURL: vi.fn(),
  })
  vi.mocked(OrigenesService.listar).mockResolvedValue({
    data: [{
      recoleccion_id: '3',
      codigo_trazabilidad: 'REC-3',
      nombre_comercial_snapshot: 'Algarrobo',
      tipo_material: 'SEMILLA',
      unidad_canonica: 'G',
      saldo_actual: 5,
      estado_registro: 'VALIDADO',
      estado_operativo: 'ABIERTO',
    }],
  } as never)
  vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mockResolvedValue({ evidencia_ids: [12] } as never)
  vi.mocked(LotesViveroService.createLote).mockResolvedValue({ data: { lote_vivero_id: 99 } } as never)
})

async function prepareForm() {
  const view = render(<MemoryRouter><ViveroNewScreen /></MemoryRouter>)
  const { container } = view
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } })
  await waitFor(() => expect(screen.getByRole('radio')).toBeTruthy())
  fireEvent.click(screen.getByRole('radio'))
  fireEvent.change(container.querySelector('input[inputmode="decimal"]') as HTMLInputElement, {
    target: { value: '2.5' },
  })
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(['foto'], 'inicio.jpg', { type: 'image/jpeg' })] },
  })
  return view
}

describe('INICIO de Vivero', () => {
  it('muestra el origen y efecto; cancelar no sube evidencia ni crea lote', async () => {
    await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('REC-3')).toBeTruthy()
    expect(screen.getByText('2.5 G')).toBeTruthy()
    expect(screen.getByText(/aún no registra plantas vivas/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(LotesViveroService.uploadEvidenciasPendientes).not.toHaveBeenCalled()
    expect(LotesViveroService.createLote).not.toHaveBeenCalled()
  })

  it('una carga tardía tras cambiar de cuenta no crea un lote ni reutiliza sus fotos', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof LotesViveroService.uploadEvidenciasPendientes>>) => void
    vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mockReturnValueOnce(new Promise(done => { resolve = done }))
    const view = await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear lote e iniciar' }))
    await waitFor(() => expect(LotesViveroService.uploadEvidenciasPendientes).toHaveBeenCalledTimes(1))
    view.unmount(); localStorage.setItem('authToken', 'synthetic-another-account')
    await act(async () => resolve({ success: true, data: [], evidencia_ids: [12] }))
    expect(LotesViveroService.createLote).not.toHaveBeenCalled()
  })

  it('doble confirmación crea un solo lote', async () => {
    await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    const confirm = screen.getByRole('button', { name: 'Crear lote e iniciar' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(LotesViveroService.createLote).toHaveBeenCalledTimes(1))
    expect(LotesViveroService.uploadEvidenciasPendientes).toHaveBeenCalledTimes(1)
    expect(vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mock.calls[0][0].vivero_id).toBe('7')
    expect(vi.mocked(LotesViveroService.createLote).mock.calls[0][0]).toMatchObject({ vivero_id: '7', recoleccion_id: '3' })
    expect(OrigenesService.listar).toHaveBeenCalledWith('7', '7', 1, expect.any(AbortSignal))
  })
})
