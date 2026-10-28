import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapacidadSubcampania } from '../types'
import type { ContextoRegistro } from '../registroTypes'
import { context as fixture } from '../api/registro.test-fixtures'
import { validarContextoRegistro } from '../api/registro.contract'
import publicExamples from '../../impacto/api/impacto.test-fixtures.json'
import type { ImpactoConsulta } from '../../impacto/types'
import type { ImpactoMapProps } from '../../impacto/components/ImpactoMap'
import { safeImpactoReturn } from '../../impacto/utils/consulta'
import ParticipacionSubcampaniaDetail from './ParticipacionSubcampaniaDetail'

const mocks = vi.hoisted(() => ({ context: null as ContextoRegistro | null, publicData: null as ImpactoConsulta | null }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ login: vi.fn() }) }))
vi.mock('../../impacto/hooks/useImpactoConsulta', () => ({ useImpactoConsulta: () => ({ data: mocks.publicData, loading: false, error: null, retry: vi.fn() }) }))
vi.mock('../../impacto/components/ImpactoMapPanel', () => ({ default: ({ puntos, subcampanias, onSelect, recordReturnTo }: ImpactoMapProps) => <div
  data-testid="mapa-compartido" data-poligono={JSON.stringify(subcampanias[0]?.poligono)}
  data-points={puntos.map(point => point.registro_id).join(',')}
  data-return={typeof recordReturnTo === 'function' ? recordReturnTo(puntos[0]?.registro_id ?? '') : recordReturnTo}>
  {puntos.map(point => <button key={point.registro_id} onClick={() => onSelect(`r:${point.registro_id}`)}>Punto {point.registro_id}</button>)}
</div> }))
vi.mock('../registro/hooks/useRegistroContext', () => ({ useRegistroContext: () => ({ context: mocks.context, loading: false, error: null, sessionExpired: false, refresh: vi.fn() }) }))

const scope: CapacidadSubcampania = {
  campania_id: '800', campania_nombre: 'Campaña', subcampania_id: '821', nombre: 'Zona', estado: 'ACTIVA',
  permiso_contextual: 'PLANTADOR', revision_permiso: '2', fuente_autoridad: 'CONTEXTUAL',
  acciones: { preparar_registro: true, registrar_inicial: true, incorporar_plantador: false, retirar_plantador: false, designar_administrador: false, cambiar_administrador: false, retirar_administrador: false, reemplazar_administrador: false },
}

beforeEach(() => {
  mocks.publicData = null
  mocks.context = validarContextoRegistro({ ...fixture, data: { ...fixture.data, especies: [
    { ...fixture.data.especies[0], nombre: 'Lechuga de agua', imagen_url: 'https://example.com/plantas/lechuga.jpg' },
  ] } }, '801', '821').data
})

function open(permission: CapacidadSubcampania['permiso_contextual'] = 'PLANTADOR') {
  return render(<MemoryRouter><ParticipacionSubcampaniaDetail actorId="801" scope={{ ...scope, permiso_contextual: permission }} onBack={vi.fn()} /></MemoryRouter>)
}

function RegistrationDestination() {
  const location = useLocation()
  return <p>Intención de registro: {location.state?.registroIntent}</p>
}

function RecordDestination() {
  const location = useLocation()
  return <p data-testid="retorno-plantacion">{safeImpactoReturn(location.state?.impactoReturnTo)}</p>
}

describe('especies compartidas en el detalle participante', () => {
  it.each(['PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'] as const)('ofrece puntos y ficha pública a %s conservando el polígono autorizado y el retorno al mapa', permission => {
    const recordId = '9007199254740993'
    mocks.publicData = structuredClone(publicExamples.subcampania.data) as ImpactoConsulta
    const record = { ...mocks.publicData.registros[0], id: recordId, subcampania_id: scope.subcampania_id }
    mocks.publicData.registros = [record]
    mocks.publicData.mapa = [
      { ...mocks.publicData.mapa[0], registro_id: recordId, subcampania_id: scope.subcampania_id },
      { ...mocks.publicData.mapa[0], registro_id: '9007199254740997', subcampania_id: '999' },
    ]
    mocks.publicData.subcampanias = [{ ...mocks.publicData.subcampanias[0], id: scope.subcampania_id,
      poligono: { type: 'Polygon', coordinates: [[[-65, -17], [-64, -17], [-64, -16], [-65, -17]]] } }]
    render(<MemoryRouter initialEntries={[`/app/planting/subcampanias/${scope.subcampania_id}`]}><Routes>
      <Route path="/app/planting/subcampanias/:subcampaniaId" element={<ParticipacionSubcampaniaDetail actorId="801" scope={{ ...scope, permiso_contextual: permission }} onBack={vi.fn()} />} />
      <Route path="/impacto/registros/:registroId" element={<RecordDestination />} />
    </Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mapa' }))
    const map = screen.getByTestId('mapa-compartido')
    expect(map.getAttribute('data-points')).toBe(recordId)
    expect(JSON.parse(map.getAttribute('data-poligono')!)).toEqual(mocks.context!.subcampania.poligono)
    expect(safeImpactoReturn(map.getAttribute('data-return'))).toBe(`/app/planting/subcampanias/${scope.subcampania_id}?pestana=mapa&registro=${recordId}`)
    fireEvent.click(screen.getByRole('button', { name: `Punto ${recordId}` }))
    fireEvent.click(screen.getByRole('link', { name: 'Abrir ficha pública' }))
    expect(screen.getByTestId('retorno-plantacion').textContent).toBe(`/app/planting/subcampanias/${scope.subcampania_id}?pestana=mapa&registro=${recordId}`)
    expect(screen.queryByRole('button', { name: 'Editar meta y especies' })).toBeNull()
  })

  it.each(['PLANTADOR', 'ADMINISTRADOR_SUBCAMPANIA'] as const)('abre una captura nueva desde el detalle para %s', permission => {
    render(<MemoryRouter initialEntries={['/app/planting/subcampanias/821']}><Routes>
      <Route path="/app/planting/subcampanias/:subcampaniaId" element={<ParticipacionSubcampaniaDetail actorId="801" scope={{ ...scope, permiso_contextual: permission }} onBack={vi.fn()} />} />
      <Route path="/app/participacion/subcampanias/:subcampaniaId/registrar" element={<RegistrationDestination />} />
    </Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('link', { name: 'Registrar plantación' }))
    expect(screen.getByText('Intención de registro: nuevo')).toBeTruthy()
  })
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
