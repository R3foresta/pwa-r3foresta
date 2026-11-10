import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { assigned, m2Fixture } from '../../accesos/test-fixtures'
import { ConciliacionService, validarFichaConciliacion } from './conciliacion.api'
import ConciliacionScreen from './ConciliacionScreen'

const ID = '9007199254740993'
const VIVERO = '9007199254740994'
const MARCA = 'a'.repeat(64)
const fixture = {
  recoleccion_id: ID, vivero_id: VIVERO, codigo_trazabilidad: 'HIST-SINT-3', fecha_recoleccion: '2026-04-01',
  revision_captura: '9007199254740995', revision: '2', en_padron: true, estado: 'INCIDENCIA',
  cantidad_inicial: '12.5', saldo_actual: '7.5', unidad_canonica: 'G', saldo_calculado: '7.5',
  marca_movimientos: MARCA, trazabilidad_conforme: true, inconsistencias: [], ultimo_movimiento_en: '2026-04-07', puede_conciliar: true,
  movimientos: [{ id: '9007199254740996', tipo: 'CONSUMO_A_VIVERO', delta: '-5.0', unidad: 'G', lote_id: '4', evento_id: '5', fecha: '2026-04-07' }],
  lotes: [{ id: '4', vivero_id: VIVERO, codigo_trazabilidad: 'VIV-SINT-4', cantidad_inicial: '5.0', unidad: 'G', evento_inicio_ids: ['5'] }],
  asignaciones: [{ id: '6', lote_id: '4', subcampania_id: '7' }],
  historial: [{
    id: '8', accion: 'CONCILIAR', estado: 'INCIDENCIA', actor_id: '11', revision: '2', motivo: null,
    saldo_esperado: '7.5', cantidad_observada: '7.0', unidad_observada: 'G', fecha_comprobacion: '2026-11-09',
    marca_movimientos: MARCA, inconsistencias: [], registrado_en: '2026-11-09T09:00:00Z',
  }],
  evidencias: [{ id: '9', observacion_id: '8', titulo: 'Pesaje sintético', mime_type: 'image/jpeg' }],
}

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '11' } }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({
  useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ viveros: [assigned(VIVERO)] }).data } }),
}))

function renderFicha() {
  render(<MemoryRouter initialEntries={[`/app/vivero/conciliaciones/${ID}`]}>
    <Routes><Route path="/app/vivero/conciliaciones/:id" element={<ConciliacionScreen />} /></Routes>
  </MemoryRouter>)
}

describe('ficha M2 de conciliación histórica', () => {
  it('valida proyección y preserva IDs BIGINT, revisiones y cantidades decimales', () => {
    expect(validarFichaConciliacion(fixture, ID)).toEqual(fixture)
    expect(validarFichaConciliacion({ ...fixture, codigo_trazabilidad: null }, ID).codigo_trazabilidad).toBeNull()
    expect(() => validarFichaConciliacion(fixture, '9007199254740992')).toThrow()
    expect(() => validarFichaConciliacion({ ...fixture, recoleccion_id: Number(ID) }, ID)).toThrow()
    expect(() => validarFichaConciliacion({ ...fixture, saldo_actual: 7.5 }, ID)).toThrow()
    expect(() => validarFichaConciliacion({ ...fixture, evidencias: [{ ...fixture.evidencias[0], ruta_archivo: 'privado' }] }, ID)).toThrow()
  })

  it('muestra cotejo, referencias e incidencia para la custodia autorizada', async () => {
    const detalle = vi.spyOn(ConciliacionService, 'detalle').mockResolvedValueOnce(validarFichaConciliacion(fixture, ID))
    renderFicha()
    expect(await screen.findByRole('heading', { name: 'HIST-SINT-3' })).toBeTruthy()
    expect(screen.getByText('12.5 G')).toBeTruthy()
    expect(screen.getByText(/#9007199254740996 · CONSUMO_A_VIVERO · -5.0 G/)).toBeTruthy()
    expect(screen.getByText(/#6 · Lote 4 · Subcampaña 7/)).toBeTruthy()
    expect(screen.getByText(/Observado 7.0 G · Esperado 7.5 G/)).toBeTruthy()
    expect(screen.getByText(/Pesaje sintético/)).toBeTruthy()
    expect(detalle).toHaveBeenCalledWith('11', ID, expect.any(AbortSignal))
  })

  it('oculta la ficha de otro vivero aunque llegue en una respuesta', async () => {
    vi.spyOn(ConciliacionService, 'detalle').mockResolvedValueOnce(validarFichaConciliacion({ ...fixture, vivero_id: '1' }, ID))
    renderFicha()
    expect((await screen.findByRole('alert')).textContent).toContain('Ficha de conciliación no disponible')
    expect(screen.queryByText('HIST-SINT-3')).toBeNull()
  })
})
