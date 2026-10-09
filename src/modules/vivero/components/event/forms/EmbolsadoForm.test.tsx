import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import type { LoteViveroItem } from '../../../types/contracts'
import ViveroEmbolsadoScreen from '../../../screens/ViveroEmbolsadoScreen'
import EmbolsadoForm from './EmbolsadoForm'

vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { auth_id: 'auth-test', nombre: 'Ana', apellido: 'Quispe' } }),
}))

vi.mock('../../../../../services/lotes-vivero.service', () => ({
  LotesViveroService: {
    uploadEvidenciasEvento: vi.fn(),
    registrarEmbolsado: vi.fn(),
  },
}))

const lote = {
  id: 42,
  codigo_trazabilidad: 'VIV-42',
  tipo_material_snapshot: 'SEMILLA',
  cantidad_inicial_en_proceso: 1,
  unidad_medida_inicial: 'G',
  fecha_inicio: '2020-01-01',
} as LoteViveroItem

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:foto'),
    revokeObjectURL: vi.fn(),
  })
  vi.mocked(LotesViveroService.uploadEvidenciasEvento).mockResolvedValue({
    data: { evidencia_ids: [11] },
  } as never)
  vi.mocked(LotesViveroService.registrarEmbolsado).mockResolvedValue({ data: {} } as never)
})

function prepareForm() {
  const { container } = render(<EmbolsadoForm lote={lote} onCompleted={vi.fn()} />)
  const amount = container.querySelector('input[inputmode="numeric"]') as HTMLInputElement
  const photoInput = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(amount, { target: { value: '2000' } })
  fireEvent.change(photoInput, {
    target: { files: [new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })] },
  })
  return container
}

describe('Embolsado', () => {
  it('redirige la ruta antigua al formulario vigente', () => {
    render(
      <MemoryRouter initialEntries={['/app/vivero/42/event/new']}>
        <Routes>
          <Route path="/app/vivero/:id/event/new" element={<ViveroEmbolsadoScreen />} />
          <Route path="/app/vivero/:id/event/embolsado" element={<p>Formulario vigente</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Formulario vigente')).toBeTruthy()
  })

  it('acepta el conteo observado aunque exceda cualquier proporción con gramos; cancelar no escribe', () => {
    prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar embolsado' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('2000 UNIDAD')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(LotesViveroService.uploadEvidenciasEvento).not.toHaveBeenCalled()
    expect(LotesViveroService.registrarEmbolsado).not.toHaveBeenCalled()
  })

  it('Escape cierra la revisión sin escribir', () => {
    prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar embolsado' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(LotesViveroService.uploadEvidenciasEvento).not.toHaveBeenCalled()
  })

  it('un doble clic en confirmar registra una sola vez', async () => {
    prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar embolsado' }))
    const confirm = screen.getByRole('button', { name: 'Registrar embolsado' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(LotesViveroService.registrarEmbolsado).toHaveBeenCalledTimes(1))
    expect(LotesViveroService.uploadEvidenciasEvento).toHaveBeenCalledTimes(1)
  })
})
