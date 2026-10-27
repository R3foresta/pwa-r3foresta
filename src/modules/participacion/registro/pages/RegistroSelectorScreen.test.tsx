import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RegistroSelectorScreen from './RegistroSelectorScreen'

vi.mock('../../components/RegistroScopeSelector', () => ({ default: ({ onRegistrar }: { onRegistrar: (id: string) => void }) => <><p>Selector de subcampaña</p><button type="button" onClick={() => onRegistrar('820')}>Elegir zona</button></> }))

function RegistrationDestination() {
  const location = useLocation()
  return <p>Registro {location.pathname} · {location.state?.registroIntent}</p>
}

describe('inicio de plantación', () => {
  it('separa la selección de subcampaña de la lista de borradores', () => {
    render(<MemoryRouter><RegistroSelectorScreen /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Iniciar plantación' })).toBeTruthy()
    expect(screen.getByText('Selector de subcampaña')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Continuar captura|Comprobar guardado/ })).toBeNull()
  })

  it('abre una intención nueva desde el selector autorizado', async () => {
    render(<MemoryRouter initialEntries={['/app/participacion/registrar']}><Routes>
      <Route path="/app/participacion/registrar" element={<RegistroSelectorScreen />} />
      <Route path="/app/participacion/subcampanias/:subcampaniaId/registrar" element={<RegistrationDestination />} />
    </Routes></MemoryRouter>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Elegir zona' }))
    expect(await screen.findByText('Registro /app/participacion/subcampanias/820/registrar · nuevo')).toBeTruthy()
  })
})
