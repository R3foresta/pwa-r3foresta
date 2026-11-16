import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProcedenciaRegistro from './ProcedenciaRegistro'
import { validarProcedencia } from './procedencia.contract'

const auth = vi.hoisted(() => ({ rol: 'ADMIN' }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '42', rol: auth.rol } }) }))
vi.mock('../../participacion/api/participacion.api', () => ({ verificarActorParticipacion: async () => 'test-token' }))
const id = '9007199254740993'
const row = {
  detalle_id: '20', asignacion_id: '9007199254740994', lote_vivero_id: '9007199254740995',
  codigo_lote: 'Lote A', planta_id: '7', cantidad: 1, nombre_comercial_snapshot: 'Molle',
  nombre_cientifico_snapshot: null, variedad_snapshot: null,
  origen: { tipo: 'INCORPORACION', recoleccion_id: null, modalidad: 'RECEPCION', procedencia: 'DONACION' },
}
const mixed = { data: {
  registro_plantacion_id: id, cantidad_total_plantada: 3, criterio_atribucion: 'CONSUMOS_PERSISTIDOS',
  consumos: [row, { ...row, detalle_id: '21', lote_vivero_id: '9007199254740996', codigo_lote: 'Lote B', cantidad: 2,
    origen: { tipo: 'RECOLECCION', recoleccion_id: '18', modalidad: null, procedencia: null } }],
}, observado_en: '2026-11-16T12:00:00Z' }

beforeEach(() => { auth.rol = 'ADMIN'; localStorage.setItem('authToken', 'test-token') })
describe('Procedencia privada por consumo', () => {
  it.each(['propia', 'administrativa'] as const)('consulta %s por ID exacto, reintenta y conserva lotes de la misma especie', async audiencia => {
    if (audiencia === 'propia') auth.rol = 'GENERAL'
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify(mixed)))
    vi.stubGlobal('fetch', fetcher)
    render(<MemoryRouter><ProcedenciaRegistro registroId={id} audiencia={audiencia} /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar procedencia' }))
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Recepción · Donación')).toBeTruthy()
    expect(within(items[1]).getByText('Recolección 18')).toBeTruthy()
    expect(screen.getByText('3 plantas registradas')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    for (const [url, options] of fetcher.mock.calls) {
      expect(url).toMatch(new RegExp('/plantaciones/' + id + '/procedencia-' + audiencia + '$'))
      expect(options).toMatchObject({ cache: 'no-store', headers: { Authorization: 'Bearer test-token' } })
    }
  })
  it('omite la lectura administrativa para otra función global', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    auth.rol = 'VALIDADOR'
    render(<ProcedenciaRegistro registroId={id} audiencia="administrativa" />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('rechaza atribuir los consumos al registro vecino o un total inconsistente', () => {
    expect(() => validarProcedencia(mixed, '9007199254740994')).toThrow()
    expect(() => validarProcedencia({ ...mixed, data: { ...mixed.data, cantidad_total_plantada: 4 } }, id)).toThrow()
  })
})
