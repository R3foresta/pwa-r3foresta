import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegistroScopeSelector from './RegistroScopeSelector'
import type { CapacidadSubcampania } from '../types'

const state = vi.hoisted(() => ({ actorId: '801', status: 'ready', refresh: vi.fn(), error: null as string | null, scopes: [] as CapacidadSubcampania[] }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.actorId }, login: vi.fn() }) }))
vi.mock('../hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => ({ data: { data: { subcampanias: state.scopes } }, status: state.status, error: state.error, refresh: state.refresh }) }))
const scope = (id: string, estado: CapacidadSubcampania['estado'] = 'ACTIVA', allowed = true): CapacidadSubcampania => ({ campania_id: '800', campania_nombre: 'Campaña de prueba', subcampania_id: id, nombre: `Subcampaña ${id}`, estado, permiso_contextual: 'PLANTADOR', revision_permiso: '1', fuente_autoridad: 'CONTEXTUAL', acciones: { preparar_registro: allowed, registrar_inicial: allowed, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false } })
beforeEach(() => { localStorage.clear(); state.actorId = '801'; state.status = 'ready'; state.error = null; state.scopes = [scope('820'), scope('9007199254740993'), scope('822', 'PAUSADA'), scope('823', 'ACTIVA', false)] })
describe('Selector de registro autorizado por capacidades', () => {
  it('muestra solo ámbitos activos habilitados y conserva IDs exactos al navegar', () => {
    const onRegistrar = vi.fn()
    render(<RegistroScopeSelector onRegistrar={onRegistrar} />)
    expect(screen.queryByRole('option', { name: 'Subcampaña 822' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Subcampaña 823' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Subcampaña activa' }), { target: { value: '9007199254740993' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar en esta subcampaña' }))
    expect(onRegistrar).toHaveBeenCalledWith('9007199254740993')
    expect(localStorage.getItem('r3foresta:registro-scope:v1:801')).toContain('9007199254740993')
  })
  it('separa preferencia por actor y no usa una selección de la cuenta anterior', () => {
    localStorage.setItem('r3foresta:registro-scope:v1:801', JSON.stringify({ campania_id: '800', subcampania_id: '9007199254740993' }))
    const { rerender } = render(<RegistroScopeSelector onRegistrar={vi.fn()} />)
    expect((screen.getByRole('combobox', { name: 'Subcampaña activa' }) as HTMLSelectElement).value).toBe('9007199254740993')
    state.actorId = '802'; rerender(<RegistroScopeSelector onRegistrar={vi.fn()} />)
    expect((screen.getByRole('combobox', { name: 'Subcampaña activa' }) as HTMLSelectElement).value).toBe('820')
  })
  it('distingue error de lectura de falta de permiso y retira selección obsoleta', () => {
    state.status = 'error'; state.error = 'Sin conexión'
    render(<RegistroScopeSelector onRegistrar={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('Sin conexión')
    expect(screen.queryByText(/No tienes subcampañas/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar en esta subcampaña' })).toBeNull()
  })
})
