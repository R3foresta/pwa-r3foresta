import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LotesViveroService } from '../../../../../services/lotes-vivero.service'
import type { LoteViveroItem } from '../../../types/contracts'
import AdaptabilidadForm from './AdaptabilidadForm'
import DespachoForm from './DespachoForm'

vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { auth_id: 'auth-test', nombre: 'Ana', apellido: 'Quispe' } }),
}))

vi.mock('../../../../../services/lotes-vivero.service', () => ({
  LotesViveroService: {
    uploadEvidenciasEvento: vi.fn(),
    registrarAdaptabilidad: vi.fn(),
    registrarDespacho: vi.fn(),
  },
}))

const lote = {
  id: 42,
  codigo_trazabilidad: 'VIV-42',
  fecha_inicio: '2020-01-01',
  saldo_vivo_actual: 10,
  subetapa_actual: 'SOMBRA',
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
  vi.mocked(LotesViveroService.registrarAdaptabilidad).mockResolvedValue({ data: {} } as never)
  vi.mocked(LotesViveroService.registrarDespacho).mockResolvedValue({ data: {} } as never)
})

describe('confirmación de eventos de vivero', () => {
  it('Adaptabilidad permite cancelar sin mutación ni evidencia, y confirma una sola vez', async () => {
    render(<AdaptabilidadForm lote={lote} fechaEmbolsado="2020-01-02" onCompleted={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Media sombra/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar adaptabilidad' }))
    expect(screen.getByText('No cambia el saldo vivo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(LotesViveroService.registrarAdaptabilidad).not.toHaveBeenCalled()
    expect(LotesViveroService.uploadEvidenciasEvento).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar adaptabilidad' }))
    const confirm = screen.getByRole('button', { name: 'Registrar adaptabilidad' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(LotesViveroService.registrarAdaptabilidad).toHaveBeenCalledTimes(1))
    expect(LotesViveroService.uploadEvidenciasEvento).not.toHaveBeenCalled()
  })

  it('Despacho cancela antes de subir foto y registrar la salida', () => {
    const { container } = render(<DespachoForm lote={lote} onCompleted={vi.fn()} />)
    const amount = container.querySelector('input[inputmode="numeric"]') as HTMLInputElement
    const destination = container.querySelector('textarea') as HTMLTextAreaElement
    const photoInput = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(amount, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /Venta/ }))
    fireEvent.change(destination, { target: { value: 'Comprador local' } })
    fireEvent.change(photoInput, {
      target: { files: [new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar despacho' }))
    expect(screen.getByText('Saldo esperado: 6 UNIDAD')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(LotesViveroService.uploadEvidenciasEvento).not.toHaveBeenCalled()
    expect(LotesViveroService.registrarDespacho).not.toHaveBeenCalled()
  })
})
