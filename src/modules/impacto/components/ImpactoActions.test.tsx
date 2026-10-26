import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapacidadesLectura, CapacidadSubcampania } from '../../participacion/types'
import { ParticipacionService } from '../../participacion/api/participacion.api'
import { ImpactoService } from '../api/impacto.api'
import { readLastCampaign, saveLastCampaign } from '../utils/lastCampaign'
import type { ImpactoConsulta } from '../types'
import ImpactoActions from './ImpactoActions'

const auth = vi.hoisted(() => ({ user: { id: '42', auth_id: 'ana', rol: 'VOLUNTARIO' } as { id: string; auth_id: string; rol: string } | null, hydrated: true, isAuthenticated: true, login: vi.fn() }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../../participacion/api/participacion.api', async importOriginal => {
  const original = await importOriginal<typeof import('../../participacion/api/participacion.api')>()
  return { ...original, ParticipacionService: { capacidades: vi.fn() } }
})
vi.mock('../api/impacto.api', () => ({ ImpactoService: { consultar: vi.fn() } }))
const caps = vi.mocked(ParticipacionService.capacidades)
const consult = vi.mocked(ImpactoService.consultar)
const empty: ImpactoConsulta = { indicadores: { plantacion_inicial: 0, bajas_reportadas: 0, reposiciones: 0, registros: 0 }, campanias: [], subcampanias: [], registros: [], mapa: [], siguiente_cursor: null }
function scope(campaign = '7', id = '11', permission: CapacidadSubcampania['permiso_contextual'] = 'PLANTADOR'): CapacidadSubcampania {
  return { campania_id: campaign, campania_nombre: `Campaña ${campaign}`, subcampania_id: id, nombre: `Zona ${id}`, estado: 'ACTIVA', permiso_contextual: permission, revision_permiso: '1', fuente_autoridad: 'CONTEXTUAL', acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false } }
}
function page(scopes: CapacidadSubcampania[] = [], cursor: string | null = null, actor = '42'): CapacidadesLectura {
  return { data: { actor: { usuario_id: actor, rol_global: 'VOLUNTARIO' }, capacidades_globales: { asignar_roles: false, designar_administradores: false, leer_plan: true }, subcampanias: scopes }, observado_en: '2026-10-17T12:00:00Z', siguiente_cursor: cursor }
}
function Location() { return <p data-testid="location">{useLocation().pathname}</p> }
function tree(props: { defaultEntry?: boolean; campaniaId?: string; subcampaniaId?: string } = {}) {
  return <MemoryRouter><p>Impacto público disponible</p><ImpactoActions {...props} /><Location /></MemoryRouter>
}
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('authToken', 'ana-token')
  auth.user = { id: '42', auth_id: 'ana', rol: 'VOLUNTARIO' }
  auth.hydrated = true
  auth.isAuthenticated = true
  caps.mockReset()
  consult.mockReset().mockResolvedValue({ data: empty })
})
describe('acciones separadas de la consulta pública', () => {
  it('espera la verificación de sesión sin invitar a crear otra cuenta', () => {
    auth.hydrated = false
    render(tree())
    expect(screen.getByRole('status').textContent).toBe('Comprobando tu sesión…')
    expect(screen.queryByRole('link', { name: 'Crear mi perfil' })).toBeNull()
    expect(caps).not.toHaveBeenCalled()
  })

  it('no consulta capacidades ni espera perfil para visitantes', () => {
    auth.user = null
    auth.isAuthenticated = false
    auth.hydrated = true
    render(tree({ defaultEntry: true }))
    expect(screen.getByText('Impacto público disponible')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Crear mi perfil' })).toBeTruthy()
    expect(caps).not.toHaveBeenCalled()
    expect(consult).not.toHaveBeenCalled()
  })
  it('espera todas las capacidades y comprueba elegibilidad pública antes de usar la preferencia', async () => {
    saveLastCampaign('42', '7')
    let finish!: (value: CapacidadesLectura) => void
    caps.mockResolvedValueOnce(page([scope()], 'segunda')).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    render(tree({ defaultEntry: true }))
    await waitFor(() => expect(caps).toHaveBeenCalledTimes(2))
    expect(consult).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).toBeNull()
    await act(async () => finish(page([scope('8', '12')])))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/impacto/campanias/7'))
    expect(consult).toHaveBeenCalledWith({ tipo: 'campania', id: '7' }, undefined, expect.any(AbortSignal))
  })
  it('distingue error de capacidades de una revocación y conserva la preferencia', async () => {
    saveLastCampaign('42', '7')
    caps.mockRejectedValueOnce(new Error('Sin conexión'))
    render(tree({ defaultEntry: true }))
    expect(await screen.findByRole('button', { name: 'Reintentar consulta' })).toBeTruthy()
    expect(screen.queryByText(/Aún no tienes subcampañas/)).toBeNull()
    expect(readLastCampaign('42')).toBe('7')
    expect(consult).not.toHaveBeenCalled()
    expect(screen.getByText('Impacto público disponible')).toBeTruthy()
  })
  it('sin habilitación confirmada queda en global y no elige otra campaña', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope('8')]))
    render(tree({ defaultEntry: true }))
    await screen.findByRole('link', { name: /Registrar plantación en/ })
    expect(consult).not.toHaveBeenCalled()
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
  it('mantiene global si la campaña preferida ya no es pública', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope()]))
    consult.mockRejectedValueOnce(Object.assign(new Error('No visible'), { status: 404 }))
    render(tree({ defaultEntry: true }))
    await waitFor(() => expect(consult).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('location').textContent).toBe('/')
    expect(screen.queryByRole('button', { name: 'Reintentar última campaña' })).toBeNull()
  })
  it('un error público transitorio permite reintento y no borra la preferencia', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope()]))
    consult.mockRejectedValueOnce(Object.assign(new Error('Temporal'), { status: 503 }))
    render(tree({ defaultEntry: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar última campaña' }))
    expect(readLastCampaign('42')).toBe('7')
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/impacto/campanias/7'))
  })
  it('un enlace explícito conserva destino y limita acciones al contexto sin ocultar otros ámbitos', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope()]))
    render(tree({ campaniaId: '8' }))
    expect(await screen.findByText(/No tienes habilitación vigente para registrar en este ámbito/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Registrar en otras subcampañas' })).toBeTruthy()
    expect(consult).not.toHaveBeenCalled()
    expect(readLastCampaign('42')).toBe('7')
  })
  it('oculta acciones de la cuenta anterior y no usa su preferencia al cambiar actor', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope()]))
    const view = render(tree())
    await screen.findByRole('link', { name: /Registrar plantación en/ })
    auth.user = { id: '43', auth_id: 'bea', rol: 'VOLUNTARIO' }
    localStorage.setItem('authToken', 'bea-token')
    caps.mockResolvedValueOnce(page([], null, '43'))
    view.rerender(tree({ defaultEntry: true }))
    expect(screen.queryByRole('link', { name: /Registrar plantación en/ })).toBeNull()
    await screen.findByText(/Aún no tienes subcampañas habilitadas/)
    expect(consult).not.toHaveBeenCalled()
    expect(readLastCampaign('43')).toBeNull()
  })
  it('cancela la comprobación preferida al cambiar cuenta y descarta el resultado tardío', async () => {
    saveLastCampaign('42', '7')
    caps.mockResolvedValueOnce(page([scope()]))
    let finish!: (value: { data: ImpactoConsulta }) => void
    consult.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const view = render(tree({ defaultEntry: true }))
    await waitFor(() => expect(consult).toHaveBeenCalledTimes(1))
    const oldSignal = consult.mock.calls[0][2]!
    auth.user = { id: '43', auth_id: 'bea', rol: 'VOLUNTARIO' }
    localStorage.setItem('authToken', 'bea-token')
    caps.mockResolvedValueOnce(page([], null, '43'))
    view.rerender(tree({ defaultEntry: true }))
    expect(oldSignal.aborted).toBe(true)
    await screen.findByText(/Aún no tienes subcampañas habilitadas/)
    await act(async () => { finish({ data: empty }); await Promise.resolve() })
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
  it('mantiene el selector para nuevos registros sin exponer la lista de borradores', async () => {
    caps.mockResolvedValueOnce(page())
    render(tree())
    await screen.findByText(/Aún no tienes subcampañas habilitadas/)
    expect(screen.getByRole('link', { name: 'Elegir subcampaña' }).getAttribute('href')).toBe('/app/participacion/registrar')
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Registrar plantación en/ })).toBeNull()
  })
  it('ofrece varias subcampañas del contexto y mantiene otra campaña en la navegación separada', async () => {
    caps.mockResolvedValueOnce(page([scope('7', '11'), scope('7', '12'), scope('8', '13')]))
    render(tree({ campaniaId: '7' }))
    fireEvent.click(await screen.findByText('Registrar plantación · elegir subcampaña'))
    expect(screen.getByRole('link', { name: 'Campaña 7 · Zona 11' }).getAttribute('href')).toBe('/app/participacion/subcampanias/11/registrar')
    expect(screen.getByRole('link', { name: 'Campaña 7 · Zona 12' }).getAttribute('href')).toBe('/app/participacion/subcampanias/12/registrar')
    expect(screen.queryByRole('link', { name: 'Campaña 8 · Zona 13' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Registrar en otras subcampañas' })).toBeTruthy()
  })
})
