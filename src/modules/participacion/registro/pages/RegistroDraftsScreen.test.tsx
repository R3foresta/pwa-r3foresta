import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegistroDraftsScreen from './RegistroDraftsScreen'
import { discardRegistrationDraft } from '../../commands/discardRegistrationDraft'

const mocks = vi.hoisted(() => ({ drafts: [
  { subcampania_id: '100', comando_id: null, actualizado_en: 1, revision_local: 1, estado: 'BORRADOR' },
  { subcampania_id: '51', comando_id: '00000000-0000-4000-8000-000000000001', actualizado_en: 2, revision_local: 2, estado: 'DESCARTE_PENDIENTE' },
  { subcampania_id: '54', comando_id: '00000000-0000-4000-8000-000000000002', actualizado_en: 3, revision_local: 3, estado: 'RESULTADO_NO_CONFIRMADO' },
  { subcampania_id: '55', comando_id: '00000000-0000-4000-8000-000000000003', actualizado_en: 4, revision_local: 4, estado: 'CONFIRMADO' },
  { subcampania_id: '56', comando_id: '00000000-0000-4000-8000-000000000004', actualizado_en: 5, revision_local: 5, estado: 'DESCARTADO' },
] }))
const initialDrafts = [...mocks.drafts]
vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '801', rol: 'VOLUNTARIO' } }) }))
vi.mock('../../commands/registrationDraftStore', () => ({ listRegistrationDrafts: vi.fn(async () => mocks.drafts), REGISTRATION_CHANGED: 'r3foresta:registration-draft-changed' }))
vi.mock('../../commands/discardRegistrationDraft', async importOriginal => ({ ...await importOriginal<typeof import('../../commands/discardRegistrationDraft')>(), discardRegistrationDraft: vi.fn() }))

beforeEach(() => { mocks.drafts = [...initialDrafts]; vi.mocked(discardRegistrationDraft).mockReset() })

describe('plantaciones en borrador', () => {
  it('muestra capturas recuperables de la cuenta y excluye terminales cerrados', async () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/app/participacion/borradores', state: { participacionReturnTo: '/app/planting/subcampanias/51' } }]}><RegistroDraftsScreen /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Plantaciones en Borrador' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: 'Subcampaña 100 · Continuar captura' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Subcampaña 51 · Comprobar descarte' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Subcampaña 54 · Comprobar guardado' })).toBeTruthy()
    expect(screen.queryByText(/Subcampaña 55|Subcampaña 56/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Volver a la subcampaña' }).getAttribute('href')).toBe('/app/planting/subcampanias/51')
    expect(screen.getByRole('link', { name: 'Subcampaña 51 · Comprobar descarte' }).getAttribute('href')).toBe('/app/participacion/subcampanias/51/registrar')
    expect(screen.queryByRole('button', { name: 'Eliminar borrador de la subcampaña 54' })).toBeNull()
  })

  it('pide confirmación antes de eliminar y retira la fila sólo tras la respuesta confirmada', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RegistroDraftsScreen /></MemoryRouter>)
    await screen.findByRole('link', { name: 'Subcampaña 100 · Continuar captura' })
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador de la subcampaña 100' }))
    expect(screen.getByRole('dialog', { name: 'Eliminar borrador de la subcampaña 100' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(discardRegistrationDraft).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador de la subcampaña 100' }))
    vi.mocked(discardRegistrationDraft).mockImplementationOnce(async () => {
      mocks.drafts = mocks.drafts.filter(draft => draft.subcampania_id !== '100')
      fireEvent(window, new Event('r3foresta:registration-draft-changed'))
      return 'LOCAL'
    })
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Subcampaña 100 · Continuar captura' })).toBeNull())
    expect(screen.getByRole('status').textContent).toContain('archivos locales se eliminaron')
    expect(discardRegistrationDraft).toHaveBeenCalledTimes(1)
  })

  it('conserva la captura y exige nueva revisión si el descarte no fue confirmado', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RegistroDraftsScreen /></MemoryRouter>)
    await screen.findByRole('link', { name: 'Subcampaña 51 · Comprobar descarte' })
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador de la subcampaña 51' }))
    vi.mocked(discardRegistrationDraft).mockRejectedValueOnce(new Error('Aún no se confirmó el descarte. Conservamos la captura.'))
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Aún no se confirmó el descarte. Conservamos la captura.'))
    expect(screen.getByRole('link', { name: 'Subcampaña 51 · Comprobar descarte' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Eliminar borrador de la subcampaña 51' })).toBeTruthy()
  })

  it('usa la revisión vista al abrir el diálogo aunque otra pestaña actualice la lista', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RegistroDraftsScreen /></MemoryRouter>)
    await screen.findByRole('link', { name: 'Subcampaña 100 · Continuar captura' })
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador de la subcampaña 100' }))
    mocks.drafts = mocks.drafts.map(draft => draft.subcampania_id === '100' ? { ...draft, revision_local: draft.revision_local + 1 } : draft)
    fireEvent(window, new Event('r3foresta:registration-draft-changed'))
    await user.click(screen.getByRole('button', { name: 'Eliminar borrador' }))
    expect(discardRegistrationDraft).toHaveBeenCalledWith('801', '100', expect.objectContaining({ revision_local: 1 }), expect.any(Object))
  })
})
