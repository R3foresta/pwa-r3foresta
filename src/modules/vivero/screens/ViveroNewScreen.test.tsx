import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import ViveroNewScreen from './ViveroNewScreen'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { auth_id: 'auth-test', nombre: 'Ana', apellido: 'Quispe' } }),
}))

vi.mock('../../../hooks/useViveros', () => ({
  useViveros: () => ({ viveros: [{ id: 7, nombre: 'Vivero Norte', codigo: 'VN' }], loading: false, error: null }),
}))

vi.mock('../../../services/recolecciones.service', () => ({
  RecoleccionesService: { list: vi.fn() },
}))

vi.mock('../../../services/lotes-vivero.service', () => ({
  LotesViveroService: {
    uploadEvidenciasPendientes: vi.fn(),
    createLote: vi.fn(),
  },
}))

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:foto'),
    revokeObjectURL: vi.fn(),
  })
  vi.mocked(RecoleccionesService.list).mockResolvedValue({
    data: [{
      id: 3,
      codigo_trazabilidad: 'REC-3',
      nombre_comercial: 'Algarrobo',
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
  const { container } = render(<MemoryRouter><ViveroNewScreen /></MemoryRouter>)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } })
  await waitFor(() => expect(screen.getByRole('radio')).toBeTruthy())
  fireEvent.click(screen.getByRole('radio'))
  fireEvent.change(container.querySelector('input[inputmode="decimal"]') as HTMLInputElement, {
    target: { value: '2.5' },
  })
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(['foto'], 'inicio.jpg', { type: 'image/jpeg' })] },
  })
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

  it('doble confirmación crea un solo lote', async () => {
    await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    const confirm = screen.getByRole('button', { name: 'Crear lote e iniciar' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(LotesViveroService.createLote).toHaveBeenCalledTimes(1))
    expect(LotesViveroService.uploadEvidenciasPendientes).toHaveBeenCalledTimes(1)
  })
})
