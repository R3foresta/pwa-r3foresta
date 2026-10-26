import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RegistroSelectorScreen from './RegistroSelectorScreen'

vi.mock('../../components/RegistroScopeSelector', () => ({ default: () => <p>Selector de subcampaña</p> }))

describe('inicio de plantación', () => {
  it('separa la selección de subcampaña de la lista de borradores', () => {
    render(<MemoryRouter><RegistroSelectorScreen /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Iniciar plantación' })).toBeTruthy()
    expect(screen.getByText('Selector de subcampaña')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Continuar captura|Comprobar guardado/ })).toBeNull()
  })
})
