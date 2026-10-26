import { Suspense } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '../../../routes/ProtectedRoute'
import { canOpenAppPath } from '../../../utils/appAccess'
import type { CapacidadSubcampania } from '../../participacion/types'
import SubcampaniaDetailRoute from './SubcampaniaDetailRoute'

const mocks = vi.hoisted(() => ({
  user: { id: '42', rol: 'VOLUNTARIO' },
  status: 'ready', scopes: [] as CapacidadSubcampania[],
  internal: vi.fn(), participant: vi.fn(),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, hydrated: true, isAuthenticated: true, login: vi.fn() }) }))
vi.mock('../../participacion/hooks/useParticipacionCapabilities', () => ({ useParticipacionCapabilities: () => ({ status: mocks.status, data: { data: { actor: { usuario_id: '42', rol_global: mocks.user.rol }, subcampanias: mocks.scopes }, siguiente_cursor: null }, error: 'Sin conexión', refresh: vi.fn() }) }))
vi.mock('./DetalleSubcampanaScreen', () => ({ default: () => { mocks.internal(); return <p>Detalle interno</p> } }))
vi.mock('../../participacion/components/ParticipacionSubcampaniaDetail', () => ({ default: ({ scope }: { scope: CapacidadSubcampania }) => { mocks.participant(scope); return <p>Detalle participante: {scope.subcampania_id}</p> } }))

function open(id = '51') {
  return render(<MemoryRouter initialEntries={[`/app/planting/subcampanias/${id}`]}><Suspense fallback={<p>Cargando</p>}><Routes><Route element={<ProtectedRoute />}><Route path="/app/planting/subcampanias/:subcampaniaId" element={<SubcampaniaDetailRoute />} /></Route></Routes></Suspense></MemoryRouter>)
}

beforeEach(() => { mocks.user.rol = 'VOLUNTARIO'; mocks.status = 'ready'; mocks.scopes = []; mocks.internal.mockClear(); mocks.participant.mockClear() })

describe('detalle único de subcampaña por audiencia', () => {
  it.each(['PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'] as const)('habilita la misma URL para %s sin montar lecturas internas', async permission => {
    const area: CapacidadSubcampania = { campania_id: '32', campania_nombre: 'Campaña 32', subcampania_id: '9007199254740993', nombre: 'Zona', estado: 'ACTIVA', permiso_contextual: permission, fuente_autoridad: 'CONTEXTUAL', revision_permiso: '1', acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: permission === 'ADMINISTRADOR_SUBCAMPANIA', retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false } }
    mocks.scopes = [area]
    open(area.subcampania_id)
    expect(await screen.findByText(`Detalle participante: ${area.subcampania_id}`)).toBeTruthy()
    expect(mocks.participant).toHaveBeenCalledWith(area)
    expect(mocks.internal).not.toHaveBeenCalled()
  })

  it.each(['ADMIN', 'GENERAL', 'VALIDADOR'])('conserva el detalle interno para %s', async role => {
    mocks.user.rol = role
    open('99')
    expect(await screen.findByText('Detalle interno')).toBeTruthy()
    expect(mocks.participant).not.toHaveBeenCalled()
  })

  it.each(['loading', 'error', 'sessionExpired', 'ready'])('no monta ningún detalle sin acceso confirmado (%s)', status => {
    mocks.status = status
    open()
    expect(mocks.internal).not.toHaveBeenCalled()
    expect(mocks.participant).not.toHaveBeenCalled()
    if (status === 'ready') expect(screen.getByText(/no está disponible para esta cuenta/)).toBeTruthy()
    if (status === 'error') expect(screen.getByText(/No pudimos consultar el acceso/)).toBeTruthy()
  })

  it('la excepción sólo habilita consultar el detalle, sin abrir otras herramientas internas', () => {
    expect(canOpenAppPath('/app/planting/subcampanias/51', 'VOLUNTARIO')).toBe(true)
    for (const path of ['/app/planting', '/app/planting/campanias/32', '/app/planting/campanias/new', '/app/planting/subcampanias/new', '/app/planting/subcampanias/51/plantaciones/new', '/app/planting/subcampanias/51/edit', '/app/vivero', '/app/collections']) {
      expect(canOpenAppPath(path, 'VOLUNTARIO')).toBe(false)
    }
  })
})
