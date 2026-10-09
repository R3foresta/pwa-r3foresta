import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import type { GetPlanData, RevisarPlanData, Subcampania } from '../types/contracts'
import EditarPlanSubcampania from './EditarPlanSubcampania'

vi.mock('../../../services/plantacion.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/plantacion.service')>()
  return { ...actual, PlantacionService: {
    ...actual.PlantacionService,
    getSubcampaniaPlan: vi.fn(),
    revisarSubcampaniaPlan: vi.fn(),
  } }
})

const subcampania: Subcampania = {
  id: 54, campania_id: 20, nombre: 'Subcampaña Palca', zona_id: 1,
  meta_total_arboles: 40, total_plantado_inicial: 50, estado: 'ACTIVA', created_at: '2026-10-09',
}
const plan: GetPlanData = {
  subcampania_id: 54, estado: 'ACTIVA', meta_total_arboles: 40, plan_revision: 2,
  metas: [{ planta_id: 5, cantidad_objetivo: 40, porcentaje_objetivo: 100,
    planta: { id: 5, especie: 'Aliso', nombre_cientifico: 'Alnus acuminata' } }],
}

function apiError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status })
}

function renderEditor(overrides: Partial<ComponentProps<typeof EditarPlanSubcampania>> = {}) {
  const props = { subcampania, authId: 'auth-1', isAdmin: true, onClose: vi.fn(), onSaved: vi.fn().mockResolvedValue(undefined), ...overrides }
  return { ...render(<EditarPlanSubcampania {...props} />), props }
}

async function propose(goal = '60') {
  const user = userEvent.setup()
  await screen.findByLabelText(/Meta total propuesta/)
  fireEvent.change(screen.getByLabelText(/Meta total propuesta/), { target: { value: goal } })
  fireEvent.change(screen.getByLabelText(/Cantidad propuesta de Aliso/), { target: { value: goal } })
  await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
  return user
}

beforeEach(() => {
  vi.mocked(PlantacionService.getSubcampaniaPlan).mockReset().mockResolvedValue(plan)
  vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockReset()
})

describe('editor conectado del plan de subcampaña', () => {
  it('espera la lectura persistida y usa su meta antes de permitir cambios', async () => {
    let resolve!: (value: GetPlanData) => void
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockImplementation(() => new Promise((done) => { resolve = done }))
    renderEditor({ subcampania: { ...subcampania, meta_total_arboles: 99 } })
    expect(screen.getByText('Cargando plan persistido…')).toBeTruthy()
    expect(screen.queryByLabelText(/Meta total propuesta/)).toBeNull()
    expect((screen.getByRole('button', { name: 'Cargando plan…' }) as HTMLButtonElement).disabled).toBe(true)
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledExactlyOnceWith(54, 'auth-1')
    await act(async () => resolve(plan))
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('40')
    expect((screen.getByLabelText(/Cantidad propuesta de Aliso/) as HTMLInputElement).value).toBe('40')
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('permite reintentar una carga fallida sin enviar un plan vacío', async () => {
    const user = userEvent.setup()
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockRejectedValueOnce(new Error('Sin conexión para leer el plan.'))
    renderEditor()
    expect(await screen.findByText('Sin conexión para leer el plan.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reintentar carga' }))
    await screen.findByLabelText(/Meta total propuesta/)
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(2)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('bloquea el guardado cuando el backend aún no entrega plan_revision', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: undefined })
    renderEditor()
    expect(await screen.findByText('El servidor todavía no ofrece la revisión atómica del plan.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).disabled).toBe(true)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('conserva la propuesta tras un fallo y exige confirmar la meta anterior y nueva', async () => {
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockRejectedValueOnce(new Error('No se pudo guardar la revisión.'))
    const { props } = renderEditor()
    const user = await propose()
    expect(screen.getByText('Meta actual')).toBeTruthy()
    expect(screen.getByText('Meta propuesta')).toBeTruthy()
    expect(screen.getAllByText('40 árboles').length).toBeGreaterThan(0)
    expect(screen.getAllByText('60 árboles').length).toBeGreaterThan(0)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('No se pudo guardar la revisión.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a editar' }))
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60')
    expect((screen.getByLabelText(/Cantidad propuesta de Aliso/) as HTMLInputElement).value).toBe('60')
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledExactlyOnceWith(54, {
      meta_total_arboles: 60, revision_esperada: 2,
      metas: [{ planta_id: 5, cantidad_objetivo: 60, porcentaje_objetivo: 100 }],
    }, 'auth-1')
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('bloquea envíos simultáneos y espera la confirmación antes de refrescar', async () => {
    let resolve!: (value: RevisarPlanData) => void
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockImplementation(() => new Promise((done) => { resolve = done }))
    const { props } = renderEditor()
    await propose()
    const confirm = screen.getByRole('button', { name: 'Confirmar y guardar plan' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Procesando…' }) as HTMLButtonElement).disabled).toBe(true)
    expect(props.onSaved).not.toHaveBeenCalled()
    const saved: RevisarPlanData = { ...plan, plan_revision: 3, meta_total_arboles: 60,
      metas: [{ ...plan.metas[0], cantidad_objetivo: 60 }] }
    await act(async () => resolve(saved))
    expect(props.onSaved).toHaveBeenCalledExactlyOnceWith(saved)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('mantiene la propuesta ante 409 y exige consultar el plan vigente y revisar otra vez', async () => {
    const currentPlan = { ...plan, meta_total_arboles: 60, plan_revision: 3,
      metas: [{ ...plan.metas[0], cantidad_objetivo: 60 }] }
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValueOnce(plan).mockResolvedValue(currentPlan)
    vi.mocked(PlantacionService.revisarSubcampaniaPlan)
      .mockRejectedValueOnce(apiError('Otra persona revisó el plan.', 409))
      .mockResolvedValueOnce({ ...currentPlan, meta_total_arboles: 70, plan_revision: 4 })
    renderEditor()
    const user = await propose('70')
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText(/El plan cambió\. Consulta el plan vigente/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Consultar plan vigente' }))
    await screen.findByText('Meta actual: 60 árboles')
    expect(screen.queryByRole('button', { name: 'Confirmar y guardar plan' })).toBeNull()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('70')
    expect((screen.getByLabelText(/Cantidad propuesta de Aliso/) as HTMLInputElement).value).toBe('70')
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    await waitFor(() => expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(2))
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenLastCalledWith(54, {
      meta_total_arboles: 70, revision_esperada: 3,
      metas: [{ planta_id: 5, cantidad_objetivo: 70, porcentaje_objetivo: 100 }],
    }, 'auth-1')
  })

  it('conserva una propuesta de retiro si el backend protege la especie con 422', async () => {
    const twoSpecies: GetPlanData = { ...plan, metas: [
      { ...plan.metas[0], cantidad_objetivo: 20, porcentaje_objetivo: 50 },
      { planta_id: 8, cantidad_objetivo: 20, porcentaje_objetivo: 50,
        planta: { id: 8, especie: 'Nogal', nombre_cientifico: 'Juglans regia' } },
    ] }
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue(twoSpecies)
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockRejectedValue(apiError('Nogal tiene stock inicial disponible y no se puede retirar.', 422))
    const { props } = renderEditor()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Quitar Nogal del plan' }))
    fireEvent.change(screen.getByLabelText(/Meta total propuesta/), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/Porcentaje propuesto de Aliso/), { target: { value: '100' } })
    await user.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(screen.getByText('Se retira del plan')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('Nogal tiene stock inicial disponible y no se puede retirar.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a editar' }))
    expect(screen.queryByLabelText(/Cantidad propuesta de Nogal/)).toBeNull()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('20')
    expect((screen.getByLabelText(/Porcentaje propuesto de Aliso/) as HTMLInputElement).value).toBe('100')
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(2)
    expect(props.onSaved).not.toHaveBeenCalled()
  })

  it('bloquea la propuesta si el rechazo 422 revela que la subcampaña se cerró', async () => {
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValueOnce(plan)
      .mockResolvedValue({ ...plan, estado: 'COMPLETADA' })
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockRejectedValue(apiError('La subcampaña ya se cerró.', 422))
    renderEditor()
    const user = await propose()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('El plan solo puede editarse en BORRADOR o ACTIVA.')).toBeTruthy()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('60')
    expect((screen.getByRole('button', { name: 'Revisar cambios' }) as HTMLButtonElement).disabled).toBe(true)
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
  })

  it('deshabilita la revisión cuando se pierde el rol global ADMIN', async () => {
    const { rerender, props } = renderEditor()
    await propose()
    rerender(<EditarPlanSubcampania {...props} isAdmin={false} />)
    expect(screen.getByText('Solo ADMIN global puede editar el plan.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it.each([401, 403])('conserva los valores y bloquea reintentos ante rechazo de autorización %s', async (status) => {
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockRejectedValue(apiError('La sesión no permite revisar el plan.', status))
    renderEditor()
    const user = await propose()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    expect(await screen.findByText('El servidor rechazó el permiso de edición. Vuelve a verificar tu sesión.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Volver a editar' }))
    const goal = screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement
    expect(goal.value).toBe('60')
    expect(goal.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Revisar cambios' }))
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledTimes(1)
  })

  it.each(['auth', 'id'] as const)('ignora una consulta vigente retrasada después de cambiar %s', async (changedKey) => {
    let resolveReload!: (value: GetPlanData) => void
    const nextId = changedKey === 'id' ? 55 : 54
    const nextPlan: GetPlanData = { ...plan, subcampania_id: nextId, meta_total_arboles: 90, plan_revision: 8,
      metas: [{ ...plan.metas[0], cantidad_objetivo: 90 }] }
    vi.mocked(PlantacionService.getSubcampaniaPlan)
      .mockResolvedValueOnce(plan)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveReload = resolve }))
      .mockResolvedValueOnce(nextPlan)
    const { rerender, props } = renderEditor()
    const user = userEvent.setup()
    await screen.findByLabelText(/Meta total propuesta/)
    await user.click(screen.getByRole('button', { name: 'Consultar plan vigente' }))
    rerender(<EditarPlanSubcampania {...props} authId={changedKey === 'auth' ? 'auth-2' : 'auth-1'}
      subcampania={{ ...subcampania, id: nextId }} />)
    await screen.findByText('Meta actual: 90 árboles')
    await act(async () => resolveReload({ ...plan, meta_total_arboles: 30 }))
    expect(screen.getByText('Meta actual: 90 árboles')).toBeTruthy()
    expect((screen.getByLabelText(/Meta total propuesta/) as HTMLInputElement).value).toBe('90')
    expect(screen.queryByText('Meta actual: 30 árboles')).toBeNull()
    expect((screen.getByRole('button', { name: 'Revisar cambios' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('ignora una respuesta de guardado retrasada después de desmontar el editor', async () => {
    let resolve!: (value: RevisarPlanData) => void
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockImplementation(() => new Promise((done) => { resolve = done }))
    const { unmount, props } = renderEditor()
    const user = await propose()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    unmount()
    await act(async () => resolve({ ...plan, plan_revision: 3, meta_total_arboles: 60 }))
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('ignora un guardado anterior cuando cambia la sesión y ya se cargó un plan nuevo', async () => {
    let resolve!: (value: RevisarPlanData) => void
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockImplementation(() => new Promise((done) => { resolve = done }))
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValueOnce(plan)
      .mockResolvedValue({ ...plan, plan_revision: 8, meta_total_arboles: 90,
        metas: [{ ...plan.metas[0], cantidad_objetivo: 90 }] })
    const { rerender, props } = renderEditor()
    const user = await propose()
    await user.click(screen.getByRole('button', { name: 'Confirmar y guardar plan' }))
    rerender(<EditarPlanSubcampania {...props} authId="auth-2" />)
    await screen.findByText('Meta actual: 90 árboles')
    await act(async () => resolve({ ...plan, plan_revision: 3, meta_total_arboles: 60 }))
    expect(props.onSaved).not.toHaveBeenCalled()
    expect(props.onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Meta actual: 90 árboles')).toBeTruthy()
  })
})
