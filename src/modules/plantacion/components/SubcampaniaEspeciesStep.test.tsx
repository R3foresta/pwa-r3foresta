import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, GetPlanData, Subcampania } from '../types/contracts'
import { loadSubcampaniaBaseDraft, saveSubcampaniaBaseDraft, type SubcampaniaBaseDraft } from '../utils/subcampaniaDraft'
import SubcampaniaEspeciesStep from './SubcampaniaEspeciesStep'

vi.mock('../../../services/plantacion.service', () => ({ PlantacionService: {
  getSubcampaniaPlan: vi.fn(), updateSubcampania: vi.fn(), createSubcampania: vi.fn(),
  getSubcampaniaEquipo: vi.fn(), removeSubcampaniaEquipoMember: vi.fn(), setSubcampaniaEquipo: vi.fn(),
  putSubcampaniaPlan: vi.fn(), revisarSubcampaniaPlan: vi.fn(),
} }))
vi.mock('./CatalogoEspeciesPicker', () => ({ default: ({ open, onConfirm }: {
  open: boolean; onConfirm: (items: Array<{ planta_id: number; especie: string; nombre_cientifico: string; saldo_disponible: number }>) => void
}) => open ? <button onClick={() => onConfirm([{ planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0 }])}>Elegir Tara del catálogo</button> : null }))

const campania: Campania = { id: 20, nombre: 'Campaña Palca', tipo: 'REFORESTACION',
  codigo_trazabilidad: 'C20', created_at: '2026-10-01', updated_at: '2026-10-01' }
const plan: GetPlanData = { subcampania_id: 54, estado: 'BORRADOR', meta_total_arboles: 40, plan_revision: 3,
  metas: [{ planta_id: 1, cantidad_objetivo: 40, porcentaje_objetivo: 100, planta: { id: 1, especie: 'Molle' } }] }
const draft: SubcampaniaBaseDraft = {
  draft_id: 'draft-54', subcampania_id: 54, campania_id: 20, tipo: 'REFORESTACION', nombre: 'Subcampaña Palca',
  comunidad: { id: 1, nombre: 'Palca', pais: { id: 1, nombre: 'Bolivia', codigo_iso2: 'BO' }, activo: true, nivel_actual: 1 },
  coordinador: { id: 8, nombre: 'Coordinador', rol: 'GENERAL' }, fecha_estimada_inicio: '', fecha_estimada_fin: '',
  meta_total_arboles: 40, especies: [{ planta_id: 1, especie: 'Molle', nombre_cientifico: 'Schinus molle', saldo_disponible: 80, pct: 100 }],
  created_at: '2026-10-01', updated_at: '2026-10-01',
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(PlantacionService.getSubcampaniaPlan).mockReset().mockResolvedValue(plan)
  vi.mocked(PlantacionService.updateSubcampania).mockReset().mockResolvedValue({ id: 54, estado: 'BORRADOR' } as Subcampania)
  vi.mocked(PlantacionService.createSubcampania).mockReset().mockResolvedValue({ id: 55, estado: 'BORRADOR' } as Subcampania)
  vi.mocked(PlantacionService.getSubcampaniaEquipo).mockReset().mockResolvedValue([
    { id: 11, usuario_id: 8, rol: 'COORDINADOR', nombre_usuario: 'Coordinador' },
  ])
  vi.mocked(PlantacionService.setSubcampaniaEquipo).mockReset().mockResolvedValue([])
  vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockReset().mockResolvedValue({ ...plan, plan_revision: 4 })
  vi.mocked(PlantacionService.putSubcampaniaPlan).mockReset().mockResolvedValue({ subcampania_id: 54, metas: plan.metas })
  saveSubcampaniaBaseDraft(draft)
})

function renderStep() {
  const onNext = vi.fn()
  const onDraftSaved = vi.fn()
  const result = render(<SubcampaniaEspeciesStep campania={campania} draftId="draft-54" authId="auth-1"
    onNext={onNext} onDraftSaved={onDraftSaved} onBackToBase={vi.fn()} />)
  return { ...result, onNext, onDraftSaved }
}

describe('Plan coherente del asistente de subcampaña', () => {
  it('guarda repetidamente meta y especies en una revisión sin PATCH de meta', async () => {
    const user = userEvent.setup()
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.updateSubcampania).toHaveBeenCalledWith(54, expect.not.objectContaining({ meta_total_arboles: expect.anything() }), 'auth-1')
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledWith(54, {
      meta_total_arboles: 60, revision_esperada: 3,
      metas: [{ planta_id: 1, cantidad_objetivo: 60, porcentaje_objetivo: 100 }],
    }, 'auth-1')
    expect(PlantacionService.putSubcampaniaPlan).not.toHaveBeenCalled()
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, meta_total_arboles: 60, plan_revision: 4 })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(2))
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenLastCalledWith(54,
      expect.objectContaining({ revision_esperada: 4 }), 'auth-1')
  })

  it('guarda el plan incompleto solo localmente y lo conserva al volver al paso', async () => {
    const user = userEvent.setup()
    const { onDraftSaved, unmount } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    await user.click(screen.getByRole('button', { name: 'Restar 5% a Molle' }))
    expect(screen.getByText(/El plan incompleto se guarda solo en este dispositivo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(onDraftSaved).toHaveBeenCalledOnce())
    expect(PlantacionService.updateSubcampania).not.toHaveBeenCalled()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    expect(PlantacionService.putSubcampaniaPlan).not.toHaveBeenCalled()
    expect(loadSubcampaniaBaseDraft(20, 'draft-54')).toMatchObject({ meta_total_arboles: 60, especies: [{ planta_id: 1, pct: 95 }] })
    unmount()
    renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(3))
    expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('60')
    expect(screen.getByText('95% asignado · falta 5%')).toBeTruthy()
  })

  it('conserva la propuesta local si el backend rechaza la revisión en conflicto', async () => {
    const user = userEvent.setup()
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockRejectedValueOnce(new Error('El plan cambió. Revisión en conflicto.'))
    const { onNext, unmount } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('El plan cambió. Revisión en conflicto.')).toBeTruthy()
    expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('60')
    expect(loadSubcampaniaBaseDraft(20, 'draft-54')).toMatchObject({ meta_total_arboles: 60 })
    expect(onNext).not.toHaveBeenCalled()
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: 4 })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText(/El plan cambió desde que abriste el asistente/)).toBeTruthy()
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledOnce()
    unmount()
    const reopened = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(4))
    expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('60')
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: 5 })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(reopened.onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenLastCalledWith(54,
      expect.objectContaining({ meta_total_arboles: 60, revision_esperada: 4 }), 'auth-1')
  })

  it('rechaza una propuesta obsoleta antes de escribir si la revisión cambió desde la carga', async () => {
    const user = userEvent.setup()
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: 4, meta_total_arboles: 50 })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText(/El plan cambió desde que abriste el asistente/)).toBeTruthy()
    expect(PlantacionService.updateSubcampania).not.toHaveBeenCalled()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('60')
    expect(loadSubcampaniaBaseDraft(20, 'draft-54')).toMatchObject({ meta_total_arboles: 60 })
  })

  it('consulta la revisión de una subcampaña nueva antes de guardar su plan', async () => {
    const user = userEvent.setup()
    saveSubcampaniaBaseDraft({ ...draft, subcampania_id: null })
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, subcampania_id: 55, plan_revision: 0 })
    const { onNext } = renderStep()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.createSubcampania).toHaveBeenCalledOnce()
    expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledWith(55, 'auth-1')
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledWith(55, {
      meta_total_arboles: 40, revision_esperada: 0, metas: plan.metas.map(({ planta_id, cantidad_objetivo, porcentaje_objetivo }) => ({ planta_id, cantidad_objetivo, porcentaje_objetivo })),
    }, 'auth-1')
    expect(PlantacionService.updateSubcampania).not.toHaveBeenCalled()
    expect(PlantacionService.putSubcampaniaPlan).not.toHaveBeenCalled()
  })

  it('bloquea todos los cambios remotos si el estado cambia a ACTIVA antes de guardar', async () => {
    const user = userEvent.setup()
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, estado: 'ACTIVA' })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.')).toBeTruthy()
    expect(PlantacionService.updateSubcampania).not.toHaveBeenCalled()
    expect(PlantacionService.setSubcampaniaEquipo).not.toHaveBeenCalled()
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('no avanza cuando la meta es menor que el número de especies positivas', async () => {
    saveSubcampaniaBaseDraft({ ...draft, meta_total_arboles: 1, especies: [
      { ...draft.especies![0], pct: 50 }, { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0, pct: 50 },
    ] })
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('bloquea doble envío mientras guarda la revisión', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof PlantacionService.revisarSubcampaniaPlan>>) => void
    vi.mocked(PlantacionService.revisarSubcampaniaPlan).mockImplementation(() => new Promise((done) => { resolve = done }))
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    const next = screen.getByRole('button', { name: 'Siguiente' })
    fireEvent.click(next)
    fireEvent.click(next)
    await waitFor(() => expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Guardando…' }).hasAttribute('disabled')).toBe(true)
    resolve({ ...plan, plan_revision: 4 })
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
  })

  it('muestra el mismo redondeo por especie que envía al guardar', async () => {
    const user = userEvent.setup()
    saveSubcampaniaBaseDraft({ ...draft, meta_total_arboles: 10, especies: [
      { ...draft.especies![0], pct: 33 },
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0, pct: 33 },
      { planta_id: 3, especie: 'Queñua', nombre_cientifico: '', saldo_disponible: 0, pct: 34 },
    ] })
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    expect(screen.getAllByText(/Equivale a/).map(item => item.textContent)).toEqual([
      'Equivale a 3 árboles', 'Equivale a 3 árboles', 'Equivale a 4 árboles',
    ])
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledWith(54, {
      meta_total_arboles: 10, revision_esperada: 3, metas: [
        { planta_id: 1, cantidad_objetivo: 3, porcentaje_objetivo: 33 },
        { planta_id: 2, cantidad_objetivo: 3, porcentaje_objetivo: 33 },
        { planta_id: 3, cantidad_objetivo: 4, porcentaje_objetivo: 34 },
      ],
    }, 'auth-1')
  })

  it('reutiliza el reparto del catálogo y permite planificar una especie sin stock', async () => {
    const user = userEvent.setup()
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Porcentaje propuesto de Molle'), { target: { value: '50' } })
    await user.click(screen.getByRole('button', { name: 'Agregar especie del catálogo' }))
    await user.click(screen.getByRole('button', { name: 'Elegir Tara del catálogo' }))
    expect((screen.getByLabelText('Porcentaje propuesto de Tara') as HTMLInputElement).value).toBe('50')
    expect(screen.getAllByText(/Equivale a/).map(item => item.textContent)).toEqual(['Equivale a 30 árboles', 'Equivale a 30 árboles'])
    expect(screen.getByText('No hay stock en vivero todavía. Puedes definir la planificación.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.revisarSubcampaniaPlan).toHaveBeenCalledWith(54, {
      meta_total_arboles: 60, revision_esperada: 3, metas: [
        { planta_id: 1, cantidad_objetivo: 30, porcentaje_objetivo: 50 },
        { planta_id: 2, cantidad_objetivo: 30, porcentaje_objetivo: 50 },
      ],
    }, 'auth-1')
  })

  it('conserva porcentajes decimales al guardar y reabrir el borrador', async () => {
    const user = userEvent.setup()
    saveSubcampaniaBaseDraft({ ...draft, meta_total_arboles: 60, especies: [
      { ...draft.especies![0], pct: 50 },
      { planta_id: 2, especie: 'Tara', nombre_cientifico: '', saldo_disponible: 0, pct: 50 },
    ] })
    const { onDraftSaved, unmount } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Porcentaje propuesto de Molle'), { target: { value: '33.33' } })
    fireEvent.change(screen.getByLabelText('Porcentaje propuesto de Tara'), { target: { value: '66.67' } })
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    await waitFor(() => expect(onDraftSaved).toHaveBeenCalledOnce())
    expect(loadSubcampaniaBaseDraft(20, 'draft-54')?.especies?.map(item => item.pct)).toEqual([33.33, 66.67])
    unmount()
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: 4 })
    renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledTimes(3))
    expect((screen.getByLabelText('Porcentaje propuesto de Molle') as HTMLInputElement).value).toBe('33.33')
    expect((screen.getByLabelText('Porcentaje propuesto de Tara') as HTMLInputElement).value).toBe('66.67')
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(false)
  })

  it('explica los formatos inválidos y conserva el texto sin guardar ni transformarlo', async () => {
    renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '1.5' } })
    expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('1.5')
    expect(screen.getByText('La meta debe ser un número entero positivo.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Porcentaje propuesto de Molle'), { target: { value: '33.333' } })
    expect((screen.getByLabelText('Porcentaje propuesto de Molle') as HTMLInputElement).value).toBe('33.333')
    expect(screen.getByText(/con máximo 2 decimales/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar borrador' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true)
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
    expect(loadSubcampaniaBaseDraft(20, 'draft-54')?.especies?.[0].pct).toBe(100)
  })

  it('precarga un plan remoto sin inventar una referencia de stock de vivero', async () => {
    saveSubcampaniaBaseDraft({ ...draft, meta_total_arboles: undefined, especies: undefined })
    renderStep()
    await waitFor(() => expect((screen.getByLabelText('Meta total de árboles') as HTMLInputElement).value).toBe('40'))
    expect(screen.getByText('Molle')).toBeTruthy()
    expect(screen.queryByText(/Vivero:/)).toBeNull()
    expect(screen.queryByText(/No hay stock en vivero/)).toBeNull()
  })

  it('conserva la compatibilidad con planes BORRADOR de un backend sin revisión', async () => {
    const user = userEvent.setup()
    vi.mocked(PlantacionService.getSubcampaniaPlan).mockResolvedValue({ ...plan, plan_revision: undefined })
    const { onNext } = renderStep()
    await waitFor(() => expect(PlantacionService.getSubcampaniaPlan).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Meta total de árboles'), { target: { value: '60' } })
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce())
    expect(PlantacionService.updateSubcampania).toHaveBeenCalledWith(54, expect.objectContaining({ meta_total_arboles: 60 }), 'auth-1')
    expect(PlantacionService.putSubcampaniaPlan).toHaveBeenCalledWith(54,
      [{ planta_id: 1, cantidad_objetivo: 60, porcentaje_objetivo: 100 }], 'auth-1')
    expect(PlantacionService.revisarSubcampaniaPlan).not.toHaveBeenCalled()
  })
})
