import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EquipoMember, Subcampania } from '../types/contracts'
import { SubcampaniaEquipoManager } from './SubcampaniaEquipoManager'

const subcampania: Subcampania = {
  id: 51,
  campania_id: 7,
  nombre: 'Laguna de Cotacota',
  zona_id: 3,
  meta_total_arboles: 200,
  estado: 'ACTIVA',
  created_at: '2026-07-02T12:00:00Z',
}

const equipo: EquipoMember[] = [
  { id: 1, usuario_id: 10, nombre_usuario: 'Pablo Andres', rol: 'COORDINADOR', agregado_at: '2026-07-02T12:00:00Z' },
  { id: 2, usuario_id: 11, nombre_usuario: 'Jhami', rol: 'OPERARIO', agregado_at: '2026-07-02T12:00:00Z' },
]

describe('Equipo logístico de subcampaña', () => {
  it('mantiene al coordinador visible al contraer Operarios', async () => {
    render(<SubcampaniaEquipoManager subcampania={subcampania} equipo={equipo} canManage={false} onEquipoChange={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: /Operarios.*1 asignado/i })
    expect(screen.getByText('Pablo Andres')).toBeTruthy()
    const coordinatorCard = screen.getByText('Pablo Andres').closest('section') as HTMLElement
    expect(coordinatorCard.querySelector('span.ring-warning-100')?.textContent).toBe('Coordinador')
    expect(screen.getByText('Jhami')).toBeTruthy()
    await userEvent.setup().click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Pablo Andres')).toBeTruthy()
    expect(screen.getByText('Coordinador')).toBeTruthy()
    expect(screen.queryByText('Jhami')).toBeNull()
    await userEvent.setup().click(toggle)
    expect(screen.getByText('Jhami')).toBeTruthy()
  })
})
