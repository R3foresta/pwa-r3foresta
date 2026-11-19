import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarVivero } from '../../reportes/reporte-vivero.api'
import type { ReporteVivero } from '../../reportes/reporte-vivero.contract'
import DisponibilidadPlanSubcampania from './DisponibilidadPlanSubcampania'

vi.mock('../../reportes/reporte-vivero.api', () => ({ consultarVivero: vi.fn() }))

const molle = { planta_id: '9007199254740993', nombre: 'Molle', cantidad: 50 }
const tara = { planta_id: '9007199254740995', nombre: 'Tara', cantidad: 12 }
const central = { id: '31', nombre: 'Vivero Central' }
const norte = { id: '32', nombre: 'Vivero Norte' }
const reporte: ReporteVivero = {
  observado_en: '2026-11-18T17:30:00Z',
  filtros: { planta_id: null, vivero_id: null },
  totales: { plantas: 68, especies: 2, viveros: 2 },
  filas: [
    { planta_id: molle.planta_id, especie: 'Molle', vivero_id: central.id, vivero: central.nombre, plantas: 35 },
    { planta_id: molle.planta_id, especie: 'Molle', vivero_id: norte.id, vivero: norte.nombre, plantas: 25 },
    { planta_id: tara.planta_id, especie: 'Tara', vivero_id: norte.id, vivero: norte.nombre, plantas: 8 },
  ],
  por_vivero: [
    { vivero_id: central.id, vivero: central.nombre, plantas: 35 },
    { vivero_id: norte.id, vivero: norte.nombre, plantas: 33 },
  ],
  opciones: { especies: [{ id: molle.planta_id, nombre: 'Molle' }, { id: tara.planta_id, nombre: 'Tara' }], viveros: [central, norte] },
}

const consultar = vi.mocked(consultarVivero)
const leerEspecie = (nombre: string) => within(screen.getByRole('heading', { name: nombre }).closest('li') as HTMLLIElement)

beforeEach(() => {
  consultar.mockReset().mockResolvedValue(reporte)
})

describe('Disponibilidad de plantas del plan de subcampaña', () => {
  it('espera un plan válido y una comprobación explícita, y compara por especie y vivero con un solo corte', async () => {
    const { rerender } = render(<DisponibilidadPlanSubcampania token="admin" necesidades={[]} />)
    const comprobar = screen.getByRole<HTMLButtonElement>('button', { name: 'Comprobar disponibilidad' })
    expect(comprobar.disabled).toBe(true)
    expect(consultar).not.toHaveBeenCalled()

    rerender(<DisponibilidadPlanSubcampania token="admin" necesidades={[molle, tara]} />)
    expect(comprobar.disabled).toBe(false)
    expect(consultar).not.toHaveBeenCalled()
    fireEvent.click(comprobar)
    await screen.findByRole('list', { name: 'Disponibilidad por especie' })
    expect(consultar).toHaveBeenCalledExactlyOnceWith(reporte.filtros, 'admin', expect.any(AbortSignal))
    expect(screen.getByText(/2026.*1:30/).getAttribute('datetime')).toBe(reporte.observado_en)
    expect(screen.getByText(/Saldo al .*Bolivia/)).toBeTruthy()
    expect(leerEspecie('Molle').getByText('Suficiente')).toBeTruthy()
    expect(leerEspecie('Molle').getByText('35 plantas')).toBeTruthy()
    expect(leerEspecie('Molle').getByText('25 plantas')).toBeTruthy()
    expect(leerEspecie('Tara').getByText('Faltan 4')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Vivero para la comparación'), { target: { value: central.id } })
    expect(leerEspecie('Molle').getByText('Faltan 15')).toBeTruthy()
    expect(leerEspecie('Molle').queryByText('25 plantas')).toBeNull()
    expect(leerEspecie('Tara').getByText('Faltan 12')).toBeTruthy()

    rerender(<DisponibilidadPlanSubcampania token="admin" necesidades={[]} />)
    expect(screen.queryByRole('list', { name: 'Disponibilidad por especie' })).toBeNull()
    rerender(<DisponibilidadPlanSubcampania token="admin" necesidades={[{ ...molle, cantidad: 30 }]} />)
    expect(leerEspecie('Molle').getByText('Suficiente')).toBeTruthy()
    expect(consultar).toHaveBeenCalledOnce()
  })

  it('oculta un corte anterior al fallar la actualización y conserva el vivero elegido tras reintentar', async () => {
    consultar
      .mockResolvedValueOnce(reporte)
      .mockRejectedValueOnce(new Error('La consulta no respondió.'))
      .mockResolvedValueOnce({
        ...reporte,
        observado_en: '2026-11-18T18:00:00Z',
        totales: { plantas: 25, especies: 1, viveros: 1 },
        filas: [reporte.filas[1]],
        por_vivero: [{ vivero_id: norte.id, vivero: norte.nombre, plantas: 25 }],
        opciones: { ...reporte.opciones, viveros: [norte] },
      })
    render(<DisponibilidadPlanSubcampania token="admin" necesidades={[{ ...molle, cantidad: 20 }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar disponibilidad' }))
    const selector = await screen.findByLabelText<HTMLSelectElement>('Vivero para la comparación')
    fireEvent.change(selector, { target: { value: central.id } })
    expect(leerEspecie('Molle').getByText('Suficiente')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar saldo' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Disponibilidad sin confirmar')
    expect(screen.queryByRole('list', { name: 'Disponibilidad por especie' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }))
    expect((await screen.findByLabelText<HTMLSelectElement>('Vivero para la comparación')).value).toBe(central.id)
    expect(leerEspecie('Molle').getByText('Faltan 20')).toBeTruthy()
    expect(consultar).toHaveBeenCalledTimes(3)
  })

  it('cancela una comprobación al salir del paso', () => {
    consultar.mockReturnValueOnce(new Promise(() => {}))
    const { unmount } = render(<DisponibilidadPlanSubcampania token="admin" necesidades={[molle]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar disponibilidad' }))
    const signal = consultar.mock.calls[0][2]
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
