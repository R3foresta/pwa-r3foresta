import { m2Fixture, assigned } from '../../accesos/test-fixtures'
import { OrigenesService } from '../api/origenes.api'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import ViveroNewScreen from './ViveroNewScreen'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '7', auth_id: 'auth-test', nombre: 'Ana', apellido: 'Quispe' } }),
}))

vi.mock('../../../hooks/useViveros', () => ({
  useViveros: () => ({ viveros: [{ id: 7, nombre: 'Vivero Norte', codigo: 'VN' }], loading: false, error: null }),
}))

vi.mock('../api/origenes.api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/origenes.api')>(),
  OrigenesService: { listar: vi.fn() },
}))
vi.mock('../../accesos/capabilitiesContext', () => ({ useOperationalAccess: () => ({ m2: { status: 'ready', data: m2Fixture({ viveros: [assigned('7')] }).data } }) }))

vi.mock('../../../services/lotes-vivero.service', () => ({
  LotesViveroService: {
    uploadEvidenciasPendientes: vi.fn(),
    createLote: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.setItem('authToken', 'synthetic-session')
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:foto'),
    revokeObjectURL: vi.fn(),
  })
  vi.mocked(OrigenesService.listar).mockResolvedValue({
    data: [{
      recoleccion_id: '3',
      codigo_trazabilidad: 'REC-3',
      nombre_comercial_snapshot: 'Algarrobo',
      tipo_material: 'SEMILLA',
      unidad_canonica: 'G',
      saldo_actual: 5,
      saldo_actual_exacto: '5',
      motivo_no_inicio: null,
      estado_registro: 'VALIDADO',
      estado_operativo: 'ABIERTO',
      estado_habilitacion: 'RECEPCION_CONFORME'
    }],
  } as never)
  vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mockResolvedValue({ evidencia_ids: [12] } as never)
  vi.mocked(LotesViveroService.createLote).mockResolvedValue({ data: { lote_vivero_id: 99 } } as never)
})

async function prepareForm(cantidad = '2.5') {
  const view = render(<MemoryRouter><ViveroNewScreen /></MemoryRouter>)
  const { container } = view
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } })
  await waitFor(() => expect(screen.getByRole('radio')).toBeTruthy())
  fireEvent.click(screen.getByRole('radio'))
  fireEvent.change(container.querySelector('input[inputmode="decimal"]') as HTMLInputElement, {
    target: { value: cantidad },
  })
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(['foto'], 'inicio.jpg', { type: 'image/jpeg' })] },
  })
  return view
}

describe('INICIO de Vivero', () => {
  it('muestra saldos bloqueados y solo permite seleccionar material habilitado', async () => {
    vi.mocked(OrigenesService.listar).mockResolvedValue({
      data: [
        { recoleccion_id: '9007199254740993', codigo_trazabilidad: 'REC-H', tipo_material: 'SEMILLA',
          saldo_actual: 2.5, unidad_canonica: 'G', estado_habilitacion: 'PENDIENTE_RECEPCION' },
        { recoleccion_id: '4', codigo_trazabilidad: 'REC-T4', tipo_material: 'SEMILLA',
          saldo_actual: 3, unidad_canonica: 'G', estado_habilitacion: 'PENDIENTE_RECEPCION' },
        { recoleccion_id: '5', codigo_trazabilidad: 'REC-ADMIN', tipo_material: 'SEMILLA',
          saldo_actual: 7, unidad_canonica: 'G', estado_habilitacion: 'PENDIENTE_RECEPCION' },
        { recoleccion_id: '6', codigo_trazabilidad: 'REC-C', tipo_material: 'SEMILLA',
          saldo_actual: 5, saldo_actual_exacto: '5', motivo_no_inicio: null, unidad_canonica: 'G', estado_habilitacion: 'RECEPCION_CONFORME' },
        { recoleccion_id: '8', codigo_trazabilidad: '', tipo_material: 'SEMILLA',
          saldo_actual: 10, saldo_actual_exacto: '10', motivo_no_inicio: 'La ficha del origen no tiene código de trazabilidad.',
          unidad_canonica: 'G', estado_habilitacion: 'RECEPCION_CONFORME' },
      ],
      pagination: { page: 1, limit: 20, total: 5 },
    } as never)
    render(<MemoryRouter><ViveroNewScreen /></MemoryRouter>)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } })
    await screen.findByText('Material que aún no puede iniciar un lote')
    expect(screen.getByText('La ficha del origen no tiene código de trazabilidad.')).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Ver recepción de REC-H' }).getAttribute('href')).toBe('/app/collections/validate/9007199254740993')
    expect(screen.getByRole('link', { name: 'Ver recepción de REC-T4' }).getAttribute('href')).toBe('/app/collections/validate/4')
    expect(screen.getByRole('link', { name: 'Ver recepción de REC-ADMIN' }).getAttribute('href')).toBe('/app/collections/validate/5')
    expect(screen.queryByRole('link', { name: /conciliación/ })).toBeNull()
  })

  it('muestra fallo de consulta por separado y sólo indica ausencia tras una lectura válida', async () => {
    vi.mocked(OrigenesService.listar)
      .mockRejectedValueOnce(new Error('No se pudo consultar el material.'))
      .mockResolvedValueOnce({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } })
    render(<MemoryRouter><ViveroNewScreen /></MemoryRouter>)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '7' } })
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo consultar el material.')
    expect(screen.queryByText('No hay recolecciones validadas con saldo en este vivero.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar orígenes' }))
    await screen.findByText('No hay recolecciones validadas con saldo en este vivero.')
  })

  it('muestra el origen y efecto; cancelar no sube evidencia ni crea lote', async () => {
    await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('REC-3')).toBeTruthy()
    expect(screen.getByText('2.5 G')).toBeTruthy()
    expect(screen.getByText(/aún no registra plantas vivas/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(LotesViveroService.uploadEvidenciasPendientes).not.toHaveBeenCalled()
    expect(LotesViveroService.createLote).not.toHaveBeenCalled()
  })

  it('una carga tardía tras cambiar de cuenta no crea un lote ni reutiliza sus fotos', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof LotesViveroService.uploadEvidenciasPendientes>>) => void
    vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mockReturnValueOnce(new Promise(done => { resolve = done }))
    const view = await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear lote e iniciar' }))
    await waitFor(() => expect(LotesViveroService.uploadEvidenciasPendientes).toHaveBeenCalledTimes(1))
    view.unmount(); localStorage.setItem('authToken', 'synthetic-another-account')
    await act(async () => resolve({ success: true, data: [], evidencia_ids: [12] }))
    expect(LotesViveroService.createLote).not.toHaveBeenCalled()
  })

  it.each([
    ['0.0001', '0.0001', 'RECEPCION_CONFORME'],
    ['1.1234567', '1.123456', 'RECEPCION_CONFORME'],
    ['9007199254740993.000001', '9007199254740993.000001', 'RECEPCION_CONFORME'],
  ] as const)('preserva el saldo %s y envía el máximo operativo %s', async (saldo, cantidad, estado) => {
    vi.mocked(OrigenesService.listar).mockResolvedValueOnce({
      success: true,
      data: [{
        recoleccion_id: '3',
        vivero_almacenamiento_id: '7',
        recolector_id: '8',
        planta_id: '9',
        codigo_trazabilidad: 'REC-3',
        fecha: '2026-11-01',
        nombre_comercial_snapshot: 'Algarrobo',
        nombre_cientifico_snapshot: null,
        variedad_snapshot: null,
        tipo_material: 'SEMILLA',
        unidad_canonica: 'G',
        saldo_actual: Number(saldo),
        saldo_actual_exacto: saldo,
        estado_registro: 'VALIDADO',
        estado_operativo: 'ABIERTO',
        estado_habilitacion: estado,
        motivo_no_inicio: null,
      }],
      pagination: { page: 1, limit: 20, total: 1 },
    } as never)
    const { container } = await prepareForm('0,0001')
    const input = container.querySelector('input[inputmode="decimal"]') as HTMLInputElement
    expect(input.value).toBe('0.0001')
    expect(screen.getByRole('button', { name: 'Registrar inicio de lote' })).toBeTruthy()
    expect(screen.getByText(`${saldo} G`)).toBeTruthy()

    fireEvent.change(input, { target: { value: '0.0000001' } })
    expect(input.value).toBe('0.0000001')
    expect(screen.getByText('Ingresa una cantidad en G con hasta 6 decimales.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar inicio de lote' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '100%' }))
    expect(input.value).toBe(cantidad)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear lote e iniciar' }))
    await waitFor(() => expect(LotesViveroService.createLote).toHaveBeenCalledWith(
      expect.objectContaining({ cantidad_inicial_en_proceso: cantidad }),
      'auth-test',
    ))
  })

  it('doble confirmación crea un solo lote', async () => {
    await prepareForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar inicio de lote' }))
    const confirm = screen.getByRole('button', { name: 'Crear lote e iniciar' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(LotesViveroService.createLote).toHaveBeenCalledTimes(1))
    expect(LotesViveroService.uploadEvidenciasPendientes).toHaveBeenCalledTimes(1)
    expect(vi.mocked(LotesViveroService.uploadEvidenciasPendientes).mock.calls[0][0].vivero_id).toBe('7')
    expect(vi.mocked(LotesViveroService.createLote).mock.calls[0][0]).toMatchObject({ vivero_id: '7', recoleccion_id: '3' })
    expect(OrigenesService.listar).toHaveBeenCalledWith('7', '7', 1, expect.any(AbortSignal), true)
  })
})
