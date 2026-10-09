import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { todayLocalISO } from '../../utils/validations/date'
import { initialFormData, type RecoleccionFormData } from './recoleccionFormTypes'
import { useRecoleccionForm } from './useRecoleccionForm'
import RecoleccionFormResumenScreen from './RecoleccionFormResumenScreen'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', rol: 'GENERAL', nombre: 'Ana' } }),
}))
vi.mock('./useRecoleccionForm', () => ({ useRecoleccionForm: vi.fn() }))
vi.mock('../../services/recolecciones.service', () => ({
  RecoleccionesService: { getById: vi.fn(), updateDraft: vi.fn(), submit: vi.fn() },
}))

const editable = {
  id: 12,
  usuario_id: 7,
  estado_registro: 'RECHAZADO',
  can_edit: true,
  can_submit_for_validation: false,
} as Recoleccion

function validForm(quantity = '0.0001'): RecoleccionFormData {
  return {
    ...initialFormData,
    editId: 12,
    date: todayLocalISO(),
    quantity,
    unit: 'kg',
    metodo_id: 1,
    planta_id: 2,
    vivero_id: 3,
    latitud: '-16.5',
    longitud: '-68.1',
    paisId: '1',
    divisionId: '2',
    placePhotos: [{ previewUrl: 'blob:lugar' }],
    totalPhotos: [{ previewUrl: 'blob:total' }],
  }
}

beforeEach(() => {
  vi.mocked(useRecoleccionForm).mockReturnValue({
    formData: validForm(),
    updateForm: vi.fn(),
    resetForm: vi.fn(),
  })
  vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: editable })
  vi.mocked(RecoleccionesService.updateDraft).mockResolvedValue({
    success: true,
    data: { ...editable, estado_registro: 'BORRADOR', can_submit_for_validation: true },
  })
  vi.mocked(RecoleccionesService.submit).mockResolvedValue({
    success: true,
    data: { ...editable, estado_registro: 'PENDIENTE_VALIDACION' },
  })
})

describe('resumen de corrección de Recolección', () => {
  it('muestra 0.1 G y guarda RECHAZADO antes de reenviar', async () => {
    render(<MemoryRouter><RecoleccionFormResumenScreen /></MemoryRouter>)
    expect(screen.getByText('0.1 G')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a Validación' }))
    await waitFor(() => expect(RecoleccionesService.submit).toHaveBeenCalledWith(12))
    expect(RecoleccionesService.updateDraft).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ cantidad_inicial_canonica: 0.1, unidad_canonica: 'G' }),
    )
    expect(vi.mocked(RecoleccionesService.updateDraft).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(RecoleccionesService.submit).mock.invocationCallOrder[0])
  })

  it('no envía cuando la conversión produciría más de un decimal en G', async () => {
    vi.mocked(useRecoleccionForm).mockReturnValue({
      formData: validForm('0.00015'),
      updateForm: vi.fn(),
      resetForm: vi.fn(),
    })
    render(<MemoryRouter><RecoleccionFormResumenScreen /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a Validación' }))
    await waitFor(() => expect(screen.getByText(/máximo un decimal/)).toBeTruthy())
    expect(RecoleccionesService.updateDraft).not.toHaveBeenCalled()
    expect(RecoleccionesService.submit).not.toHaveBeenCalled()
  })
})
