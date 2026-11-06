import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UsuariosEntry from './UsuariosEntry'
import { roleCommandStorageKey } from '../commands/roleCommandStore'

const mocks = vi.hoisted(() => ({
  actor: '42', status: 'ready', role: 'ADMIN', canAssign: true,
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '42' } }) }))
vi.mock('../../participacion/hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => ({
  status: mocks.status,
  data: { data: { actor: { usuario_id: mocks.actor, rol_global: mocks.role }, capacidades_globales: { asignar_roles: mocks.canAssign } } },
}) }))
const open = () => render(<MemoryRouter><UsuariosEntry /></MemoryRouter>)
beforeEach(() => {
  localStorage.clear()
  mocks.actor = '42'; mocks.status = 'ready'; mocks.role = 'ADMIN'; mocks.canAssign = true
})
describe('Entrada de administración de usuarios', () => {
  it('ofrece gestión con ADMIN vigente de la misma cuenta', () => {
    open()
    expect(screen.getByRole('link', { name: 'Administrar usuarios' }).getAttribute('href')).toBe('/app/usuarios')
  })
  it.each(['GENERAL', 'VALIDADOR', 'VOLUNTARIO'])('no ofrece gestión a %s', role => {
    mocks.role = role; open()
    expect(screen.queryByRole('link')).toBeNull()
  })
  it('no utiliza capacidades anteriores o de otra cuenta', () => {
    mocks.status = 'loading'
    const view = open()
    expect(screen.queryByRole('link')).toBeNull()
    mocks.status = 'ready'; mocks.actor = '43'
    view.rerender(<MemoryRouter><UsuariosEntry /></MemoryRouter>)
    expect(screen.queryByRole('link')).toBeNull()
  })
  it('mantiene recuperación propia después de perder ADMIN, sin mostrar la ajena', () => {
    mocks.role = 'VOLUNTARIO'; mocks.canAssign = false
    localStorage.setItem(roleCommandStorageKey('43'), '{}')
    const view = open()
    expect(screen.queryByRole('link')).toBeNull()
    localStorage.setItem(roleCommandStorageKey('42'), '{}')
    view.rerender(<MemoryRouter><UsuariosEntry /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Recuperar permisos' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Administrar usuarios' })).toBeNull()
  })
})
