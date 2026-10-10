import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import { PlantasService } from '../../../services/plantas.service'
import type { GetPlanData } from '../types/contracts'
import { loadPlanEditorDraft, savePlanEditorDraft } from '../utils/planEditorDraft'
import { createPlanFormFromPlan } from '../utils/planMetaEspeciesForm'
import EditarPlanSubcampaniaModal from './EditarPlanSubcampaniaModal'

vi.mock('../../../services/plantas.service', () => ({ PlantasService: { listPlantas: vi.fn() } }))
vi.mock('../../../services/lotes-vivero.service', () => ({ LotesViveroService: { listStockEspecies: vi.fn() } }))

const plan: GetPlanData = {
  subcampania_id: 54,
  estado: 'ACTIVA',
  meta_total_arboles: 40,
  metas: [{ planta_id: 1, cantidad_objetivo: 40, porcentaje_objetivo: 100,
    planta: { id: 1, especie: 'Molle', nombre_cientifico: 'Schinus molle' } }],
}

function props(overrides: Partial<Parameters<typeof EditarPlanSubcampaniaModal>[0]> = {}) {
  return { plan, authId: 'auth-1', subcampaniaNombre: 'Subcampaña Palca', isAdmin: true, submitting: false,
    error: null, onClose: vi.fn(), onConfirm: vi.fn(), ...overrides }
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } })
}

beforeEach(() => {
  vi.mocked(PlantasService.listPlantas).mockResolvedValue({
    success: true,
    data: [
      { id: 1, especie: 'Molle', nombre_cientifico: 'Schinus molle', variedad: '', nombre_comun_principal: 'Molle', tipo_planta_id: 1, activo: true },
      { id: 2, especie: 'Tara', nombre_cientifico: 'Caesalpinia spinosa', variedad: '', nombre_comun_principal: 'Tara', tipo_planta_id: 1, activo: true },
    ],
    pagination: { page: 1, limit: 200, total: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  })
  vi.mocked(LotesViveroService.listStockEspecies).mockResolvedValue([])
})

describe('Editor de revisión de metas y especies', () => {
  it('precarga exactamente las cantidades y porcentajes decimales persistidos', async () => {
    const user = userEvent.setup()
    const initial = props({ plan: { ...plan, metas: [
      { ...plan.metas[0], cantidad_objetivo: 10, porcentaje_objetivo: 33.33 },
      { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 66.67, planta: { id: 2, especie: 'Tara' } },
    ] } })
    render(<EditarPlanSubcampaniaModal {...initial} />)
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('10')
    expect((screen.getByLabelText(/Porcentaje propuesto de Molle/) as HTMLInputElement).value).toBe('33.33')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(initial.onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(initial.onConfirm).toHaveBeenCalledWith({ meta_total_arboles: 40, metas: [
      { planta_id: 1, cantidad_objetivo: 10, porcentaje_objetivo: 33.33 },
      { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 66.67 },
    ] })
  })

  it('muestra meta actual y propuesta antes de confirmar y bloquea envíos duplicados', async () => {
    const user = userEvent.setup()
    const initial = props()
    const { rerender } = render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', '60')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('60')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Meta actual')).toBeTruthy()
    expect(screen.getByText('Meta propuesta')).toBeTruthy()
    expect(screen.getByText('40 árboles')).toBeTruthy()
    expect(screen.getByText('60 árboles')).toBeTruthy()
    expect(screen.getByRole('table').textContent).toContain('40 árboles')
    expect(screen.getByRole('table').textContent).toContain('60 árboles')
    expect(initial.onConfirm).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Confirmar y guardar plan' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(initial.onConfirm).toHaveBeenCalledExactlyOnceWith({ meta_total_arboles: 60,
      metas: [{ planta_id: 1, cantidad_objetivo: 60, porcentaje_objetivo: 100 }] })
    rerender(<EditarPlanSubcampaniaModal {...initial} submitting />)
    expect(screen.getByRole('button', { name: 'Procesando…' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Volver a editar' }).hasAttribute('disabled')).toBe(true)
  })

  it.each(['0', '1.5', '9007199254740992'])('rechaza la meta inválida %s sin perder lo escrito', async (value) => {
    const user = userEvent.setup()
    const initial = props()
    render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', value)
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('La meta debe ser un número entero positivo de hasta 2147483647.')).toBeTruthy()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe(value)
    expect(initial.onConfirm).not.toHaveBeenCalled()
  })

  it('valida cantidades enteras y las sumas de cantidades y porcentajes', async () => {
    const user = userEvent.setup()
    const initial = props()
    render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Cantidad propuesta de Molle', '39.5')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Indica una cantidad entera positiva de hasta 2147483647.')).toBeTruthy()
    change('Cantidad propuesta de Molle', '39')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Las cantidades por especie deben sumar la meta total.')).toBeTruthy()
    change('Cantidad propuesta de Molle', '40')
    change('Porcentaje propuesto de Molle', '99')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Los porcentajes de las especies deben sumar 100%.')).toBeTruthy()
    change('Porcentaje propuesto de Molle', '99.999')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText(/con máximo 2 decimales/)).toBeTruthy()
    expect(initial.onConfirm).not.toHaveBeenCalled()
  })

  it('impide guardar un plan con especies duplicadas', async () => {
    const user = userEvent.setup()
    const initial = props({ plan: { ...plan, metas: [
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
    ] } })
    render(<EditarPlanSubcampaniaModal {...initial} />)
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('El plan no puede contener especies duplicadas.')).toBeTruthy()
    expect(initial.onConfirm).not.toHaveBeenCalled()
  })

  it('conserva los valores tras un fallo y permite corregirlos y reintentar', async () => {
    const user = userEvent.setup()
    const initial = props()
    const { rerender } = render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', '60')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('60')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    rerender(<EditarPlanSubcampaniaModal {...initial} error="No se pudo guardar la revisión." />)
    expect(screen.getByText('No se pudo guardar la revisión.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a editar' }))
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('60')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(initial.onConfirm).toHaveBeenCalledTimes(2)
  })

  it('bloquea la edición y confirmación si cambia el permiso o el estado', async () => {
    const user = userEvent.setup()
    const initial = props()
    const { rerender } = render(<EditarPlanSubcampaniaModal {...initial} />)
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    rerender(<EditarPlanSubcampaniaModal {...initial} isAdmin={false} />)
    expect(screen.getByText('Solo ADMIN global puede editar el plan.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(initial.onConfirm).not.toHaveBeenCalled()
    rerender(<EditarPlanSubcampaniaModal {...initial} plan={{ ...plan, estado: 'COMPLETADA' }} />)
    expect(screen.getByText('El plan solo puede editarse en BORRADOR o ACTIVA.')).toBeTruthy()
    expect(screen.getByLabelText(/Meta total propuesta/).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Revisar cambios' }).hasAttribute('disabled')).toBe(true)
  })

  it('preserva la propuesta en conflicto y exige revisarla contra el plan recién consultado', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    const initial = props()
    const { rerender } = render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', '60')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('60')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    rerender(<EditarPlanSubcampaniaModal {...initial} blockedReason="El plan cambió. Consulta su revisión vigente." onReloadPlan={reload} />)
    expect(screen.getByRole('button', { name: 'Confirmar y guardar plan' }).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Actualizar plan para continuar' }))
    expect(reload).toHaveBeenCalledOnce()
    const refreshed: GetPlanData = { ...plan, meta_total_arboles: 50, metas: [{ ...plan.metas[0], cantidad_objetivo: 50 }] }
    rerender(<EditarPlanSubcampaniaModal {...initial} plan={refreshed} />)
    expect(screen.getByText('Meta actual: 50 árboles')).toBeTruthy()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60')
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar plan' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(initial.onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('50 árboles')).toBeTruthy()
    expect(screen.getByRole('table').textContent).toContain('50 árboles')
  })

  it('incorpora una especie sin stock y calcula automáticamente al cambiar meta o porcentajes', async () => {
    const user = userEvent.setup()
    const initial = props()
    render(<EditarPlanSubcampaniaModal {...initial} />)
    await user.click(screen.getByRole('button', { name: 'Agregar especie del catálogo' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(await screen.findByRole('button', { name: /Tara.*0 disponibles/ }))
    expect(screen.queryByRole('button', { name: /Molle.*disponibles/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Aceptar (1)' }))
    expect((screen.getByLabelText(/Cantidad propuesta de Tara/) as HTMLInputElement).value).toBe('0')
    change('Meta total propuesta', '60')
    change('Porcentaje propuesto de Molle', '50')
    change('Porcentaje propuesto de Tara', '50')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('30')
    expect((screen.getByLabelText(/Cantidad propuesta de Tara/) as HTMLInputElement).value).toBe('30')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Agregada')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(initial.onConfirm).toHaveBeenCalledWith({ meta_total_arboles: 60, metas: [
      { planta_id: 1, cantidad_objetivo: 30, porcentaje_objetivo: 50 },
      { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 50 },
    ] })
    await waitFor(() => expect(LotesViveroService.listStockEspecies).toHaveBeenCalledOnce())
  })

  it('reutiliza incrementos rápidos y ajustes de porcentaje conservando cantidades manuales válidas', async () => {
    const user = userEvent.setup()
    const initial = props({ plan: { ...plan, metas: [
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
      { planta_id: 2, cantidad_objetivo: 20, porcentaje_objetivo: 50, planta: { id: 2, especie: 'Tara' } },
    ] } })
    render(<EditarPlanSubcampaniaModal {...initial} />)
    await user.click(screen.getByRole('button', { name: '+500' }))
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('540')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('270')
    await user.click(screen.getByRole('button', { name: 'Restar 5% a Molle' }))
    await user.click(screen.getByRole('button', { name: 'Sumar 5% a Tara' }))
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('243')
    expect((screen.getByLabelText(/Cantidad propuesta de Tara/) as HTMLInputElement).value).toBe('297')
    change('Cantidad propuesta de Molle', '240')
    change('Cantidad propuesta de Tara', '300')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(initial.onConfirm).toHaveBeenCalledWith({ meta_total_arboles: 540, metas: [
      { planta_id: 1, cantidad_objetivo: 240, porcentaje_objetivo: 45 },
      { planta_id: 2, cantidad_objetivo: 300, porcentaje_objetivo: 55 },
    ] })
  })

  it('explica por qué no puede recalcular una entrada inválida sin perderla', async () => {
    const user = userEvent.setup()
    render(<EditarPlanSubcampaniaModal {...props()} />)
    change('Porcentaje propuesto de Molle', '100.001')
    await user.click(screen.getByRole('button', { name: 'Calcular cantidades desde porcentajes' }))
    expect(screen.getByText(/con máximo 2 decimales/)).toBeTruthy()
    expect((screen.getByLabelText(/Porcentaje propuesto de Molle/) as HTMLInputElement).value).toBe('100.001')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('40')
  })

  it('incluye en el resumen las especies que se propone retirar', async () => {
    const user = userEvent.setup()
    const initial = props({ plan: { ...plan, metas: [
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
      { planta_id: 2, cantidad_objetivo: 20, porcentaje_objetivo: 50, planta: { id: 2, especie: 'Tara' } },
    ] } })
    render(<EditarPlanSubcampaniaModal {...initial} />)
    await user.click(screen.getByRole('button', { name: 'Quitar Tara del plan' }))
    change('Cantidad propuesta de Molle', '40')
    change('Porcentaje propuesto de Molle', '100')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Se retira del plan')).toBeTruthy()
    expect(screen.getByText('Tara')).toBeTruthy()
    expect(initial.onConfirm).not.toHaveBeenCalled()
  })

  it('conserva cantidades manuales al recuperar sesión y remontar tras una lectura nueva, sin guardar automáticamente', async () => {
    const user = userEvent.setup()
    const twoSpecies: GetPlanData = { ...plan, plan_revision: 3, metas: [
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
      { planta_id: 2, cantidad_objetivo: 20, porcentaje_objetivo: 50, planta: { id: 2, especie: 'Tara' } },
    ] }
    const recover = vi.fn().mockRejectedValueOnce(new Error('No se pudo verificar el perfil.'))
    const initial = props({ plan: twoSpecies, onRecoverSession: recover })
    const { rerender, unmount } = render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', '60')
    change('Cantidad propuesta de Molle', '23')
    change('Cantidad propuesta de Tara', '37')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    rerender(<EditarPlanSubcampaniaModal {...initial} blockedReason="Tu sesión no es válida. Inicia sesión nuevamente." />)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByText('No se pudo verificar el perfil.')).toBeTruthy()
    expect(recover).toHaveBeenCalledOnce()
    expect(loadPlanEditorDraft(54, 'auth-1')).toMatchObject({ meta: '60', especies: [
      { planta_id: 1, cantidad: '23', porcentaje: '50' },
      { planta_id: 2, cantidad: '37', porcentaje: '50' },
    ] })
    unmount()

    const refreshed = props({ plan: { ...twoSpecies, meta_total_arboles: 90, plan_revision: 4 } })
    render(<EditarPlanSubcampaniaModal {...refreshed} />)
    expect(screen.getByText('Meta actual: 90 árboles')).toBeTruthy()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('23')
    expect((screen.getByLabelText(/Cantidad propuesta de Tara/) as HTMLInputElement).value).toBe('37')
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar plan' })).toBeNull()
    expect(refreshed.onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(refreshed.onConfirm).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(refreshed.onConfirm).toHaveBeenCalledExactlyOnceWith({ meta_total_arboles: 60, metas: [
      { planta_id: 1, cantidad_objetivo: 23, porcentaje_objetivo: 50 },
      { planta_id: 2, cantidad_objetivo: 37, porcentaje_objetivo: 50 },
    ] })
  })

  it('recupera el texto inválido exacto sin recalcular ni declararlo un plan válido', async () => {
    const user = userEvent.setup()
    const initial = props({ onRecoverSession: vi.fn() })
    const { rerender, unmount } = render(<EditarPlanSubcampaniaModal {...initial} />)
    change('Meta total propuesta', '60.5')
    change('Porcentaje propuesto de Molle', '33.333')
    change('Cantidad propuesta de Molle', '23.5')
    rerender(<EditarPlanSubcampaniaModal {...initial} blockedReason="Tu sesión no es válida." />)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    unmount()

    const restored = props()
    render(<EditarPlanSubcampaniaModal {...restored} />)
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60.5')
    expect((screen.getByLabelText(/Porcentaje propuesto de Molle/) as HTMLInputElement).value).toBe('33.333')
    expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('23.5')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(restored.onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar plan' })).toBeNull()
  })

  it('no restaura una propuesta de otro auth_id', () => {
    savePlanEditorDraft(54, 'auth-1', { ...createPlanFormFromPlan(plan), meta: '60' })
    render(<EditarPlanSubcampaniaModal {...props({ authId: 'auth-2' })} />)
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('40')
    expect(loadPlanEditorDraft(54, 'auth-1')?.meta).toBe('60')
  })

  it.each(['{invalid-json', JSON.stringify({ v: 1, authId: 'auth-1', subcampaniaId: 54, value: { meta: 60, especies: [] } })])(
    'ignora un borrador corrupto y usa el plan persistido', (raw) => {
      savePlanEditorDraft(54, 'auth-1', createPlanFormFromPlan(plan))
      sessionStorage.setItem(sessionStorage.key(0)!, raw)
      render(<EditarPlanSubcampaniaModal {...props()} />)
      expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('40')
      expect((screen.getByLabelText(/Cantidad propuesta de Molle/) as HTMLInputElement).value).toBe('40')
      expect(sessionStorage.length).toBe(0)
    },
  )
})
