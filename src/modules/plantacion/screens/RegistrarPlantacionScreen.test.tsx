import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import type { PlantacionContext } from '../types/contracts'
import RegistrarPlantacionScreen from './RegistrarPlantacionScreen'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { auth_id: 'auth-1', nombre: 'Ana', rol: 'ADMIN' } }),
}))

vi.mock('../../../services/plantacion.service', () => ({
  PlantacionService: {
    getPlantacionContext: vi.fn(),
    uploadEvidenciasPendientesPlantacion: vi.fn(),
    registrarPlantacion: vi.fn(),
    descartarEvidenciasPendientesPlantacion: vi.fn(),
  },
}))

function makeContext(): PlantacionContext {
  return {
    subcampania: {
      id: 54,
      nombre: 'Subcampaña Palca',
      estado: 'ACTIVA',
      campania_id: 20,
      meta_total_arboles: 40,
      total_plantado_inicial: 50,
      poligono: {
        type: 'Polygon',
        coordinates: [[[-69, -17], [-67, -17], [-67, -15], [-69, -15], [-69, -17]]],
      },
    },
    usuario: { id: 1, puede_registrar: true },
    equipo: [],
    plan_por_especie: [{
      planta_id: 10,
      nombre_comun_principal: 'Queñua',
      cantidad_objetivo: 40,
      plantado_inicial: 50,
      pendiente_meta: 0,
    }],
    stock_por_especie: [{
      planta_id: 10,
      stock_asignado_disponible: 7,
      asignaciones: [{
        asignacion_id: 101,
        lote_vivero_id: 99,
        fecha_asignacion: '2026-10-01',
        saldo_asignado_disponible: 7,
      }],
    }],
    reglas: { min_fotos: 1, permite_exceder_meta_especie: true },
  }
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:foto'),
    revokeObjectURL: vi.fn(),
  })
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: vi.fn((success: PositionCallback) => success({
        coords: { latitude: -16.5, longitude: -68.15, accuracy: 5 },
      } as GeolocationPosition)),
    },
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(PlantacionService.getPlantacionContext).mockReset()
  vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(makeContext())
  vi.mocked(PlantacionService.uploadEvidenciasPendientesPlantacion).mockResolvedValue({ evidencia_ids: [12] })
  vi.mocked(PlantacionService.registrarPlantacion).mockResolvedValue({
    registro_plantacion_id: 201,
    codigo_trazabilidad: 'PLT-201',
    cantidad_total_plantada: 7,
    evidencia_ids_vinculadas: [12],
  })
  vi.mocked(PlantacionService.descartarEvidenciasPendientesPlantacion).mockResolvedValue({
    evidencia_ids_descartadas: [12],
    evidencia_ids_ignoradas: [],
  })
})

function renderRegistro() {
  return render(<MemoryRouter initialEntries={['/subcampanias/54/registrar']}>
    <Routes><Route path="/subcampanias/:subcampaniaId/registrar" element={<RegistrarPlantacionScreen />} /></Routes>
  </MemoryRouter>)
}

async function goToCantidades(container: HTMLElement) {
  await screen.findByRole('heading', { name: 'Evidencia y ubicación' })
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(['foto'], 'plantacion.jpg', { type: 'image/jpeg' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByRole('heading', { name: '¿Cuánto plantaste?' })).toBeTruthy()
}

describe('Plantación inicial con el plan vigente', () => {
  it('vuelve a cargar al entrar y muestra 50/60 después de revisar una meta de 40, con el mismo stock', async () => {
    const first = renderRegistro()
    await goToCantidades(first.container)
    expect(screen.getByText('/ 40').parentElement?.textContent).toBe('50 / 40')
    first.unmount()

    const revised = makeContext()
    revised.subcampania.meta_total_arboles = 60
    revised.plan_por_especie[0] = {
      ...revised.plan_por_especie[0],
      cantidad_objetivo: 60,
      pendiente_meta: 10,
    }
    vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(revised)
    const second = renderRegistro()
    await goToCantidades(second.container)

    expect(PlantacionService.getPlantacionContext).toHaveBeenCalledTimes(2)
    expect(PlantacionService.getPlantacionContext).toHaveBeenLastCalledWith(54, 'auth-1')
    expect(screen.getByText('/ 60').parentElement?.textContent).toBe('50 / 60')
    expect(screen.getByText('Stock 7')).toBeTruthy()
    expect(screen.getByLabelText('Cantidad de Queñua').getAttribute('max')).toBe('7')
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it('permite superar la meta cubierta y consume únicamente stock asignado después de confirmar', async () => {
    const { container } = renderRegistro()
    await goToCantidades(container)
    const input = screen.getByLabelText('Cantidad de Queñua')
    expect(input.hasAttribute('disabled')).toBe(false)
    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
    expect(screen.getByRole('heading', { name: 'Confirma y registra' })).toBeTruthy()
    expect(PlantacionService.uploadEvidenciasPendientesPlantacion).not.toHaveBeenCalled()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y guardar' }))
    await screen.findByText('Plantación registrada')
    expect(PlantacionService.registrarPlantacion).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      subcampania_id: 54,
      es_reposicion: false,
      latitud: -16.5,
      longitud: -68.15,
      detalles: [{ asignacion_id: 101, lote_vivero_id: 99, planta_id: 10, cantidad: 7 }],
      evidencia_ids: [12],
    }), 'auth-1')
    expect(PlantacionService.uploadEvidenciasPendientesPlantacion).toHaveBeenCalledTimes(1)
  })

  it('bloquea cantidades superiores al stock y conserva el valor para corregirlo', async () => {
    const { container } = renderRegistro()
    await goToCantidades(container)
    const input = screen.getByLabelText('Cantidad de Queñua') as HTMLInputElement
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
    expect(screen.getByText('Supera el stock asignado disponible (7).')).toBeTruthy()
    expect(input.value).toBe('8')
    expect(screen.getByRole('heading', { name: '¿Cuánto plantaste?' })).toBeTruthy()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it('incorporar una especie al plan no le concede stock para registrar', async () => {
    const revised = makeContext()
    revised.subcampania.meta_total_arboles = 60
    revised.plan_por_especie[0] = { ...revised.plan_por_especie[0], cantidad_objetivo: 50 }
    revised.plan_por_especie.push({
      planta_id: 20,
      nombre_comun_principal: 'Molle',
      cantidad_objetivo: 10,
      plantado_inicial: 0,
      pendiente_meta: 10,
    })
    vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(revised)
    const { container } = renderRegistro()
    await goToCantidades(container)
    expect(screen.getByLabelText('Cantidad de Molle').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('Cantidad de Molle').getAttribute('max')).toBe('0')
    expect(screen.getByText('Sin stock asignado disponible para esta especie.')).toBeTruthy()
    expect(screen.getByText('Stock 0')).toBeTruthy()
    expect(screen.getByText('Stock 7')).toBeTruthy()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it('conserva el límite de meta cuando el contexto no autoriza excederlo', async () => {
    const restricted = makeContext()
    restricted.reglas.permite_exceder_meta_especie = false
    vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(restricted)
    const { container } = renderRegistro()
    await goToCantidades(container)
    expect(screen.getByLabelText('Cantidad de Queñua').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('La meta de esta especie ya está cubierta.')).toBeTruthy()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it.each(['COMPLETADA', 'FINALIZADA_PARCIAL'] as const)('respeta el cierre %s al volver a entrar', async (estado) => {
    const closed = makeContext()
    closed.subcampania.estado = estado
    vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(closed)
    renderRegistro()
    expect(await screen.findByText('La subcampaña no está activa.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it('respeta los permisos actuales devueltos por el contexto', async () => {
    const denied = makeContext()
    denied.usuario = { id: 1, puede_registrar: false, motivo_bloqueo: 'Tu participación terminó.' }
    vi.mocked(PlantacionService.getPlantacionContext).mockResolvedValue(denied)
    renderRegistro()
    expect(await screen.findByText('Tu participación terminó.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull()
    expect(PlantacionService.registrarPlantacion).not.toHaveBeenCalled()
  })

  it('mantiene cantidades y evidencia cuando el backend rechaza el registro', async () => {
    vi.mocked(PlantacionService.registrarPlantacion).mockRejectedValueOnce(new Error('El stock cambió.'))
    const { container } = renderRegistro()
    await goToCantidades(container)
    fireEvent.change(screen.getByLabelText('Cantidad de Queñua'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar resumen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y guardar' }))
    expect(await screen.findByText('El stock cambió.')).toBeTruthy()
    await waitFor(() => expect(PlantacionService.descartarEvidenciasPendientesPlantacion).toHaveBeenCalledWith([12], 'auth-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect((screen.getByLabelText('Cantidad de Queñua') as HTMLInputElement).value).toBe('7')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByAltText('plantacion.jpg')).toBeTruthy()
  })
})
