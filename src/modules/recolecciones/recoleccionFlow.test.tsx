import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RecoleccionesService, type Recoleccion } from '../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay, mapToCantidadYUnidadCanonica } from '../../utils/recoleccionUnidad'
import { initialFormData } from './recoleccionFormTypes'
import RecoleccionFormLayout from './RecoleccionFormLayout'
import { getRecoleccionFormActions } from './recoleccionStatus'
import { validateRecoleccionForm } from './validators/recoleccionForm'
import CantidadInput from './components/CantidadInput'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', rol: 'GENERAL' } }),
}))
vi.mock('../../services/recolecciones.service', () => ({
  RecoleccionesService: { getById: vi.fn() },
}))

const baseRecoleccion = {
  id: 12,
  usuario_id: 7,
  estado_registro: 'BORRADOR',
  can_edit: true,
  can_submit_for_validation: true,
} as Recoleccion

function renderEditRoute() {
  return render(
    <MemoryRouter initialEntries={['/app/collections/new?editId=12']}>
      <Routes>
        <Route path="/app/collections/new" element={<RecoleccionFormLayout />}>
          <Route index element={<p>Formulario editable</p>} />
        </Route>
        <Route path="/app/collections/:id" element={<p>Detalle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(RecoleccionesService.getById).mockResolvedValue({ success: true, data: baseRecoleccion })
})

describe('AUD-008: cantidad canónica de Recolección', () => {
  it('convierte 0.0001 kg en 0.1 G sin redondear y conserva G como etiqueta', () => {
    expect(mapToCantidadYUnidadCanonica('0.0001', 'kg')).toEqual({ cantidad_inicial_canonica: 0.1, unidad_canonica: 'G' })
    expect(formatUnidadCanonicaDisplay('G')).toBe('G')
  })

  it('rechaza fracciones de G y UNIDAD que la persistencia no admite', () => {
    expect(() => mapToCantidadYUnidadCanonica('1.25', 'g')).toThrow(/máximo un decimal/)
    expect(() => mapToCantidadYUnidadCanonica('0.00001', 'kg')).toThrow(/máximo un decimal/)
    expect(() => mapToCantidadYUnidadCanonica('2.5', 'units')).toThrow(/entera/)
  })

  it('el validador rechaza la precisión después de convertir y acepta el límite', () => {
    const form = {
      ...initialFormData,
      date: '2026-09-20',
      quantity: '1.25',
      unit: 'g' as const,
      metodo_id: 1,
      planta_id: 2,
      placePhotos: [{ previewUrl: 'blob:lugar' }],
      totalPhotos: [{ previewUrl: 'blob:total' }],
    }
    const options = { dateRange: { min: '2026-09-01', max: '2026-09-27' }, stage: 'datos' as const }
    expect(validateRecoleccionForm(form, options).errors.quantity).toMatch(/máximo un decimal/)
    expect(validateRecoleccionForm({ ...form, quantity: '0.0001', unit: 'kg' }, options).isValid).toBe(true)
  })

  it('mantiene visible la fracción inválida para corregirla', () => {
    const onChange = vi.fn()
    render(<CantidadInput value="2" tipoMaterial="seed" unidad="units" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2.5' } })
    expect(onChange).toHaveBeenCalledWith('2.5')
  })
})

describe('AUD-009: corrección por estado y permiso', () => {
  it('permite corregir RECHAZADO, pero solo enviar después de volver a BORRADOR', () => {
    const user = { id: '7', rol: 'GENERAL' }
    expect(getRecoleccionFormActions({ ...baseRecoleccion, estado_registro: 'RECHAZADO', can_submit_for_validation: false }, user))
      .toEqual({ canEdit: true, canSubmit: false })
    expect(getRecoleccionFormActions(baseRecoleccion, user))
      .toEqual({ canEdit: true, canSubmit: true })
  })

  it.each(['PENDIENTE_VALIDACION', 'VALIDADO'])('bloquea edición de %s por URL directa', async (estado) => {
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...baseRecoleccion, estado_registro: estado },
    })
    renderEditRoute()
    await waitFor(() => expect(screen.getByText(/no permite edición/)).toBeTruthy())
    expect(screen.queryByText('Formulario editable')).toBeNull()
  })

  it('bloquea edición de un registro ajeno aunque la bandera de estado sea true', async () => {
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...baseRecoleccion, usuario_id: 99 },
    })
    renderEditRoute()
    await waitFor(() => expect(screen.getByText(/no permite edición/)).toBeTruthy())
  })

  it('permite abrir RECHAZADO por URL directa para corregirlo', async () => {
    vi.mocked(RecoleccionesService.getById).mockResolvedValue({
      success: true,
      data: { ...baseRecoleccion, estado_registro: 'RECHAZADO', can_submit_for_validation: false },
    })
    renderEditRoute()
    await waitFor(() => expect(screen.getByText('Formulario editable')).toBeTruthy())
  })
})
