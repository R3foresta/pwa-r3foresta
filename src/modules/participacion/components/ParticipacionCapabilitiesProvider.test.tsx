import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipacionCapabilitiesProvider } from './ParticipacionCapabilitiesProvider'
import GestionAccesosEntry from './GestionAccesosEntry'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import { ParticipacionApiError, ParticipacionService } from '../api/participacion.api'
import type { CapacidadesLectura, CapacidadSubcampania } from '../types'
import { accessCommandStorageKey } from '../commands/accessCommandStore'

const auth = vi.hoisted(() => ({ user: { id: '42', auth_id: 'ana' }, login: vi.fn() }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../api/participacion.api', async importOriginal => {
  const module = await importOriginal<typeof import('../api/participacion.api')>()
  return { ...module, ParticipacionService: { capacidades: vi.fn() } }
})
const request = vi.mocked(ParticipacionService.capacidades)
function scope(id = '11'): CapacidadSubcampania {
  return { campania_id: '7', campania_nombre: 'Palca', subcampania_id: id, nombre: 'Norte', estado: 'ACTIVA', permiso_contextual: 'ADMINISTRADOR_SUBCAMPANIA', revision_permiso: '1', fuente_autoridad: 'CONTEXTUAL', acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: true, retirar_plantador: true, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false } }
}
function page(scopes: CapacidadSubcampania[] = [], cursor: string | null = null, actor = '42'): CapacidadesLectura {
  return { data: { actor: { usuario_id: actor, rol_global: 'VOLUNTARIO' }, capacidades_globales: { asignar_roles: false, designar_administradores: false, leer_plan: true }, subcampanias: scopes }, observado_en: '2026-10-15T12:00:00Z', siguiente_cursor: cursor }
}
function Probe() {
  const { data, status, refresh } = useParticipacionCapabilities()
  return <><p>{status}:{data?.data.actor.usuario_id}:{data?.data.subcampanias.length}</p><button onClick={() => void refresh()}>Actualizar</button></>
}
const tree = () => <MemoryRouter><ParticipacionCapabilitiesProvider><Probe /><GestionAccesosEntry /></ParticipacionCapabilitiesProvider></MemoryRouter>
beforeEach(() => {
  localStorage.clear()
  auth.user = { id: '42', auth_id: 'ana' }
  localStorage.setItem('authToken', 'token-ana')
  request.mockReset()
})

describe('capacidades compartidas por cuenta', () => {
  it('ofrece recuperar el envío propio sin permisos actuales y lo oculta para otra cuenta', async () => {
    localStorage.setItem(accessCommandStorageKey('42'), '{pendiente}')
    request.mockResolvedValueOnce(page())
    const view = render(tree())
    expect(await screen.findByText('ready:42:0')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Recuperar envío pendiente de esta cuenta' })).toBeTruthy()
    auth.user = { id: '43', auth_id: 'beatriz' }
    localStorage.setItem('authToken', 'token-beatriz')
    request.mockResolvedValueOnce(page([], null, '43'))
    view.rerender(tree())
    expect(await screen.findByText('ready:43:0')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Recuperar envío pendiente de esta cuenta' })).toBeNull()
  })
  it('completa las páginas antes de ofrecer una selección y habilita una gestora VOLUNTARIO', async () => {
    request.mockResolvedValueOnce(page([scope()], 'siguiente')).mockResolvedValueOnce(page([scope('12')]))
    render(tree())
    expect(await screen.findByText('ready:42:2')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Gestionar accesos' })).toBeTruthy()
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][0]).toEqual({ limite: 100, cursor: 'siguiente' })
  })

  it('distingue respuesta vacía de un error y conserva el último dato sin ofrecer acciones con error', async () => {
    request.mockResolvedValueOnce(page([scope()]))
    render(tree())
    await screen.findByRole('link', { name: 'Gestionar accesos' })
    request.mockRejectedValueOnce(new Error('Sin conexión'))
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(await screen.findByText('error:42:1')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Gestionar accesos' })).toBeNull()
    expect(screen.queryByText(/Tu cuenta no tiene subcampañas/)).toBeNull()
    request.mockResolvedValueOnce(page())
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar capacidades' }))
    expect(await screen.findByText(/Tu cuenta no tiene subcampañas/)).toBeTruthy()
  })

  it('descarta inmediatamente los datos y respuestas pendientes al cambiar cuenta', async () => {
    let resolveOld!: (value: CapacidadesLectura) => void
    request.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const view = render(tree())
    auth.user = { id: '43', auth_id: 'beatriz' }
    localStorage.setItem('authToken', 'token-beatriz')
    request.mockResolvedValueOnce(page([], null, '43'))
    view.rerender(tree())
    expect(await screen.findByText('ready:43:0')).toBeTruthy()
    await act(async () => { resolveOld(page([scope()])); await Promise.resolve() })
    expect(screen.getByText('ready:43:0')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Gestionar accesos' })).toBeNull()
  })

  it('no publica una lista parcial si el servidor repite el cursor', async () => {
    request.mockResolvedValueOnce(page([scope()], 'bucle')).mockResolvedValueOnce(page([scope('12')], 'bucle'))
    render(tree())
    expect(await screen.findByText('error::')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Gestionar accesos' })).toBeNull()
  })

  it('ofrece recuperar sesión sin convertir 401 en lista vacía', async () => {
    request.mockRejectedValueOnce(new ParticipacionApiError(401, { codigo: 'SESION_INVALIDA', mensaje: 'Sesión vencida', campos: [], ambitos: [], reintento: 'RECUPERAR_SESION' }))
    render(tree())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Recuperar sesión' })).toBeTruthy())
    expect(screen.queryByText(/Tu cuenta no tiene subcampañas/)).toBeNull()
  })
})
