import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import RegistroSelectorScreen from './RegistroSelectorScreen'

const mocks = vi.hoisted(() => ({ drafts: [
  { subcampania_id: '100', comando_id: null, actualizado_en: 1, estado: 'BORRADOR' },
  { subcampania_id: '51', comando_id: '00000000-0000-4000-8000-000000000001', actualizado_en: 2, estado: 'DESCARTE_PENDIENTE' },
  { subcampania_id: '54', comando_id: '00000000-0000-4000-8000-000000000002', actualizado_en: 3, estado: 'RESULTADO_NO_CONFIRMADO' },
] }))
vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '801' } }) }))
vi.mock('../../commands/registrationDraftStore', () => ({ listRegistrationDrafts: vi.fn(async () => mocks.drafts), REGISTRATION_CHANGED: 'r3foresta:registration-draft-changed' }))
vi.mock('../../components/RegistroScopeSelector', () => ({ default: () => null }))

describe('selector de capturas privadas', () => {
  it('distingue captura editable, envío incierto y descarte pendiente', async () => {
    render(<MemoryRouter><RegistroSelectorScreen /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: 'Subcampaña 100 · Continuar captura' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Subcampaña 51 · Comprobar descarte' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Subcampaña 54 · Comprobar guardado' })).toBeTruthy()
    expect(screen.getByText(/Confirmar una plantación o reintentar un envío pendiente puede registrarla/)).toBeTruthy()
  })
})
