import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImpactoEntry from './ImpactoEntry'

const auth = vi.hoisted(() => ({ user: null as { rol: string } | null, hydrated: false, isAuthenticated: false }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../pages/ImpactoConsultaScreen', () => ({ default: ({ defaultEntry }: { defaultEntry: boolean }) => <p>Impacto público {defaultEntry ? 'con entrada preferida' : 'directo'}</p> }))
function tree() { return <MemoryRouter><Routes><Route path="/" element={<ImpactoEntry />} /><Route path="/app/home" element={<p>Inicio interno</p>} /></Routes></MemoryRouter> }
beforeEach(() => { auth.user = null; auth.hydrated = false; auth.isAuthenticated = false })
describe('entrada principal de Impacto', () => {
  it('consulta público inmediatamente aunque no termine verificación de sesión', () => {
    render(tree())
    expect(screen.getByText('Impacto público con entrada preferida')).toBeTruthy()
  })
  it('conserva la entrada interna de las cuentas verificadas', async () => {
    auth.user = { rol: 'GENERAL' }
    auth.isAuthenticated = true
    auth.hydrated = true
    render(tree())
    expect(await screen.findByText('Inicio interno')).toBeTruthy()
    expect(screen.queryByText(/Impacto público/)).toBeNull()
  })
  it('un voluntario verificado conserva la consulta pública con preferencia contextual', () => {
    auth.user = { rol: 'VOLUNTARIO' }
    auth.isAuthenticated = true
    auth.hydrated = true
    render(tree())
    expect(screen.getByText('Impacto público con entrada preferida')).toBeTruthy()
  })
})
