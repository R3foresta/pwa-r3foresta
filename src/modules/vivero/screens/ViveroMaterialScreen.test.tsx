import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { assigned, m2Fixture, VIVERO_B } from '../../accesos/test-fixtures'
import { OrigenesService, type OrigenesLectura, type OrigenMaterial } from '../api/origenes.api'
import ViveroMaterialScreen from './ViveroMaterialScreen'

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '7' } }) }))
vi.mock('../../../hooks/useViveros', () => ({ useViveros: () => ({ viveros: [{ id: '9007199254740993', nombre: 'Vivero sintético B', codigo: 'SB' }], loading: false, error: null }) }))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ viveros: [assigned('9007199254740993')] }).data } }) }))
const item: OrigenMaterial = { recoleccion_id: '3', vivero_almacenamiento_id: VIVERO_B, recolector_id: '9', planta_id: '2', codigo_trazabilidad: 'SINT-3', fecha: '2026-11-06', tipo_material: 'SEMILLA', nombre_cientifico_snapshot: 'Especie sintética', nombre_comercial_snapshot: 'Árbol sintético', variedad_snapshot: null, estado_registro: 'VALIDADO', estado_operativo: 'ABIERTO', saldo_actual: 5, unidad_canonica: 'G', estado_habilitacion: 'RECEPCION_CONFORME' }
function reading(saldo: number): OrigenesLectura { return { success: true, data: saldo > 0 ? [{ ...item, saldo_actual: saldo }] : [], pagination: { page: 1, limit: 20, total: saldo > 0 ? 1 : 0 } } }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
beforeEach(() => {
  vi.spyOn(OrigenesService, 'listar').mockResolvedValueOnce(reading(5))
  vi.spyOn(RecoleccionesService, 'registrarDesecho').mockRejectedValue(new Error('Resultado sintético no determinado'))
})
async function discardWithError() {
  const user = userEvent.setup()
  render(<MemoryRouter><ViveroMaterialScreen /></MemoryRouter>)
  await user.selectOptions(screen.getByLabelText('Vivero de almacenamiento'), VIVERO_B)
  await user.click(await screen.findByRole('button', { name: 'Registrar desecho de SINT-3' }))
  await user.type(screen.getByLabelText('Cantidad (G)'), '1')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar desecho' }))
  await screen.findByText(/El resultado no está confirmado/)
  expect((within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar desecho' }) as HTMLButtonElement).disabled).toBe(true)
  expect(OrigenesService.listar).toHaveBeenCalledTimes(1)
  expect(RecoleccionesService.registrarDesecho).toHaveBeenCalledTimes(1)
  return user
}
function expectObservationPending() {
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Registrar desecho de SINT-3' })).toBeNull()
  expect(screen.queryByText('Saldo: 5 G')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Consultar material actual' })).toBeNull()
  expect(RecoleccionesService.registrarDesecho).toHaveBeenCalledTimes(1)
}

describe('recuperación de DESECHO sin reenvío automático', () => {
  it.each([4, 0])('una sola consulta correcta de saldo %s termina el bloqueo por lectura pendiente', async saldo => {
    const next = deferred<OrigenesLectura>()
    vi.mocked(OrigenesService.listar).mockReturnValueOnce(next.promise)
    const user = await discardWithError()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Consultar material actual' }))
    await waitFor(() => expect(OrigenesService.listar).toHaveBeenCalledTimes(2))
    expectObservationPending()
    expect(screen.getByRole('status').textContent).toContain('Consultando material')
    await act(async () => next.resolve(reading(saldo)))
    await screen.findByText(/Material actualizado desde el servidor/)
    expect(screen.queryByRole('button', { name: 'Consultar material actual' })).toBeNull()
    if (saldo > 0) {
      expect(screen.getByText('Saldo: 4 G')).toBeTruthy()
      const prepare = screen.getByRole('button', { name: 'Registrar desecho de SINT-3' }) as HTMLButtonElement
      expect(prepare.disabled).toBe(false)
      await user.click(prepare)
      expect(screen.getByRole('dialog')).toBeTruthy()
    } else expect(screen.getByText('No hay recolecciones validadas con saldo en este vivero.')).toBeTruthy()
    expect(OrigenesService.listar).toHaveBeenCalledTimes(2)
    expect(RecoleccionesService.registrarDesecho).toHaveBeenCalledTimes(1)
  })
  it('si la lectura falla, sigue bloqueado hasta que un reintento de lectura tenga éxito', async () => {
    const retry = deferred<OrigenesLectura>()
    vi.mocked(OrigenesService.listar).mockRejectedValueOnce(new Error('Fallo sintético de lectura')).mockReturnValueOnce(retry.promise)
    const user = await discardWithError()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Consultar material actual' }))
    await screen.findByText('Fallo sintético de lectura')
    expectObservationPending()
    expect(OrigenesService.listar).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: 'Reintentar material' }))
    await waitFor(() => expect(OrigenesService.listar).toHaveBeenCalledTimes(3))
    expectObservationPending()
    await act(async () => retry.resolve(reading(4)))
    const prepare = await screen.findByRole('button', { name: 'Registrar desecho de SINT-3' }) as HTMLButtonElement
    expect(prepare.disabled).toBe(false)
    expect(screen.getByText('Saldo: 4 G')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Consultar material actual' })).toBeNull()
    expect(RecoleccionesService.registrarDesecho).toHaveBeenCalledTimes(1)
  })
})

it('el material pendiente de recepción conserva saldo visible y no ofrece DESECHO', async () => {
  vi.mocked(OrigenesService.listar).mockReset().mockResolvedValue({
    ...reading(5),
    data: [{ ...item, estado_habilitacion: 'PENDIENTE_RECEPCION' }],
  })
  const user = userEvent.setup()
  render(<MemoryRouter><ViveroMaterialScreen /></MemoryRouter>)
  await user.selectOptions(screen.getByLabelText('Vivero de almacenamiento'), VIVERO_B)
  await screen.findByText('Pendiente de recepción física conforme.')
  expect(screen.getByText('Saldo: 5 G')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Ver recepción de SINT-3' }).getAttribute('href')).toBe('/app/collections/validate/3')
  expect(screen.queryByRole('button', { name: 'Registrar desecho de SINT-3' })).toBeNull()
})
