import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RegistrarPlantacionScreen from './RegistrarPlantacionScreen'

function Destination() {
  const { state } = useLocation()
  return <p>Comando v1 de {useParams().subcampaniaId} · {state?.registroIntent}</p>
}
describe('Entrada interna del registro inicial', () => {
  it('conserva el ámbito BIGINT exacto y abre el mismo formulario participante', async () => {
    render(<MemoryRouter initialEntries={['/app/planting/subcampanias/9007199254740993/plantaciones/new']}><Routes>
      <Route path="/app/planting/subcampanias/:subcampaniaId/plantaciones/new" element={<RegistrarPlantacionScreen />} />
      <Route path="/app/participacion/subcampanias/:subcampaniaId/registrar" element={<Destination />} />
    </Routes></MemoryRouter>)
    expect(await screen.findByText('Comando v1 de 9007199254740993 · nuevo')).toBeTruthy()
  })
  it('manda un ámbito inválido al selector sin llamar al contrato retirado', async () => {
    render(<MemoryRouter initialEntries={['/old/abc']}><Routes>
      <Route path="/old/:subcampaniaId" element={<RegistrarPlantacionScreen />} />
      <Route path="/app/participacion/registrar" element={<p>Elegir subcampaña</p>} />
    </Routes></MemoryRouter>)
    expect(await screen.findByText('Elegir subcampaña')).toBeTruthy()
  })
})
