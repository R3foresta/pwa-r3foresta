import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import GuestRoute from './GuestRoute'
import { canOpenAppPath, isPublicImpactPath } from '../utils/appAccess'

const auth = vi.hoisted(() => ({ user: null as null | { rol: string }, hydrated: false, isAuthenticated: false }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../components/PwaInstallPrompt', () => ({ default: () => null }))
vi.mock('../pwa/pwaStatus', () => ({ getPwaInitializationStatus: () => 'ready', subscribeToPwaInitializationStatus: () => () => undefined }))
vi.mock('../modules/impacto/components/ImpactoEntry', () => ({ default: () => <p>Entrada pública inmediata</p> }))
vi.mock('../modules/impacto/pages/ImpactoConsultaScreen', () => ({ default: () => <p>Consulta pública inmediata</p> }))
vi.mock('../modules/impacto/pages/ImpactoRegistroScreen', () => ({ default: () => <p>Registro público inmediato</p> }))

beforeEach(() => { auth.user = null; auth.hydrated = false; auth.isAuthenticated = false })

describe('Rutas de consulta pública', () => {
  it('ofrece navegación al visitante y perfil con destino privado conservado', async () => {
    render(<MemoryRouter initialEntries={['/impacto']}><App /></MemoryRouter>)
    await screen.findByText('Consulta pública inmediata')
    expect(screen.getByRole('link', { name: 'Participar' }).getAttribute('href')).toBe('/participar')
    expect(screen.getByRole('link', { name: 'Mis registros' }).getAttribute('href')).toBe('/auth/login')
    expect(screen.getByRole('link', { name: 'Crear mi perfil o iniciar sesión' }).getAttribute('href')).toBe('/auth/login')
    expect(screen.queryByRole('button', { name: 'Abrir acciones rápidas' })).toBeNull()
  })

  it('envía la cuenta nueva de voluntariado a Participar cuando no hay destino previo', () => {
    auth.hydrated = true; auth.isAuthenticated = true; auth.user = { rol: 'VOLUNTARIO' }
    render(<MemoryRouter initialEntries={['/auth/register']}><Routes><Route element={<GuestRoute />}><Route path="/auth/register" element={<p>Registro</p>} /></Route><Route path="/participar" element={<p>Participación guiada</p>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Participación guiada')).toBeTruthy()
  })

  it.each(['/', '/impacto', '/impacto/campanias/800', '/impacto/subcampanias/826', '/impacto/registros/826000'])('abre %s sin esperar sesión ni perfil', async path => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    await screen.findByText(path === '/' ? 'Entrada pública inmediata' : path.includes('/registros/') ? 'Registro público inmediato' : 'Consulta pública inmediata')
    expect(screen.queryByText(/Verificando.*sesión/)).toBeNull()
  })
  it('Mis registros requiere sesión y conserva su destino al login', async () => {
    auth.hydrated = true
    render(<MemoryRouter initialEntries={['/app/participacion/mis-registros']}><App /></MemoryRouter>)
    await screen.findByRole('button', { name: 'Entrar con mi llave de acceso' })
    expect(canOpenAppPath('/app/participacion/mis-registros', 'VOLUNTARIO')).toBe(true)
    expect(canOpenAppPath('/app/participacion/mis-registros', 'ADMIN')).toBe(true)
    expect(canOpenAppPath('/app/participacion/borradores', 'VOLUNTARIO')).toBe(true)
    expect(canOpenAppPath('/app/participacion/mis-registros/ajeno', 'VOLUNTARIO')).toBe(false)
  })
  it('un enlace público se conserva después del login', () => {
    auth.hydrated = true; auth.isAuthenticated = true; auth.user = { rol: 'VOLUNTARIO' }
    render(<MemoryRouter initialEntries={[{ pathname: '/auth/login', state: { from: '/impacto/registros/826000?seleccion=826000' } }]}><Routes><Route element={<GuestRoute />}><Route path="/auth/login" element={<p>Ingreso</p>} /></Route><Route path="/impacto/registros/:registroId" element={<p>Destino público conservado</p>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Destino público conservado')).toBeTruthy()
  })
  it.each(['https://otro.test/impacto', '//otro.test/impacto', '/impacto/../app/collections', '/impacto\\registros\\8', '/impacto/registros/0'])('no acepta un retorno ajeno o ambiguo: %s', path => {
    expect(isPublicImpactPath(path)).toBe(false)
  })
})
