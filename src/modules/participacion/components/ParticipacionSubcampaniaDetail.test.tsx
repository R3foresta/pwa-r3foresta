import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapacidadSubcampania } from '../types'
import type { ContextoRegistro } from '../registroTypes'
import { context as fixture } from '../api/registro.test-fixtures'
import { validarContextoRegistro } from '../api/registro.contract'
import ParticipacionSubcampaniaDetail from './ParticipacionSubcampaniaDetail'

const mocks = vi.hoisted(() => ({ context: null as ContextoRegistro | null }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }))
vi.mock('../../impacto/hooks/useImpactoConsulta', () => ({ useImpactoConsulta: () => ({ data: null, loading: false, error: null }) }))
vi.mock('../../impacto/components/ImpactoMapPanel', () => ({ default: () => null }))
vi.mock('../registro/hooks/useRegistroContext', () => ({ useRegistroContext: () => ({ context: mocks.context, loading: false, error: null, sessionExpired: false, refresh: vi.fn() }) }))

const scope: CapacidadSubcampania = {
  campania_id: '800', campania_nombre: 'Campaña', subcampania_id: '821', nombre: 'Zona', estado: 'ACTIVA',
  permiso_contextual: 'PLANTADOR', revision_permiso: '2', fuente_autoridad: 'CONTEXTUAL',
  acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false },
}

beforeEach(() => {
  mocks.context = validarContextoRegistro({ ...fixture, data: { ...fixture.data, especies: [
    { ...fixture.data.especies[0], nombre: 'Lechuga de agua', imagen_url: 'https://example.com/plantas/lechuga.jpg' },
  ] } }, '801', '821').data
})

function open(permission: CapacidadSubcampania['permiso_contextual'] = 'PLANTADOR') {
  return render(<MemoryRouter><ParticipacionSubcampaniaDetail actorId="801" scope={{ ...scope, permiso_contextual: permission }} onBack={vi.fn()} /></MemoryRouter>)
}

describe('especies compartidas en el detalle participante', () => {
  it.each(['PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'] as const)('muestra nombre/foto/metas para %s sin ofrecer edición interna', permission => {
    open(permission)
    const card = screen.getByRole('region', { name: 'Especies de plantas' })
    expect(within(card).getByText('Lechuga de agua')).toBeTruthy()
    expect(card.querySelector('img')?.getAttribute('src')).toBe('https://example.com/plantas/lechuga.jpg')
    expect(within(card).getByText('2')).toBeTruthy()
    expect(within(card).getByText('100%')).toBeTruthy()
    expect(within(card).queryByRole('button', { name: 'Editar meta y especies' })).toBeNull()
    fireEvent.error(card.querySelector('img')!)
    expect(card.querySelector('img')).toBeNull()
    expect(within(card).getByText('Lechuga de agua')).toBeTruthy()
  })
  it.each([null, undefined])('conserva el plan cuando no hay foto (%s)', imagen_url => {
    mocks.context!.especies[0].imagen_url = imagen_url
    open()
    const card = screen.getByRole('region', { name: 'Especies de plantas' })
    expect(card.querySelector('img')).toBeNull()
    expect(within(card).getByText('Lechuga de agua')).toBeTruthy()
  })
  it('no reconstruye nombres o fotos desde otra consulta si el contexto no está disponible', () => {
    mocks.context = null
    open()
    expect(screen.getByText('Las metas por especie no están disponibles en esta consulta.')).toBeTruthy()
    expect(screen.queryByText('Lechuga de agua')).toBeNull()
  })
})
