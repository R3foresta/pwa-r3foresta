import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, GetPlanData, PlanEspecieMeta } from '../types/contracts'
import {
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
  type SubcampaniaBaseDraft,
  type SubcampaniaEspecieDraft,
} from '../utils/subcampaniaDraft'
import { usePlanMetaEspeciesForm } from '../hooks/usePlanMetaEspeciesForm'
import { createPlanFormFromDraft, getPlanPercentageTotal, planFormToDraft, planPercentage, positivePlanInteger, validatePlanForm } from '../utils/planMetaEspeciesForm'
import PlanMetaEspeciesForm from './PlanMetaEspeciesForm'
import CatalogoEspeciesPicker, {
  type EspecieCatalogoItem,
} from './CatalogoEspeciesPicker'

type Props = {
  campania: Campania
  draftId: string
  authId?: string
  onDraftSaved: () => void
  onBackToBase: () => void
  onNext: () => void
}

const META_MAX = 1_000_000

function mergeDraftEspeciesWithPlan(
  baseEspecies: SubcampaniaEspecieDraft[],
  metas: PlanEspecieMeta[] | undefined,
): SubcampaniaEspecieDraft[] {
  if (!metas || metas.length === 0) return baseEspecies

  const byId = new Map(baseEspecies.map((especie) => [especie.planta_id, especie]))
  return metas.map((meta) => {
    const local = byId.get(meta.planta_id)
    return {
      planta_id: meta.planta_id,
      especie: local?.especie ?? meta.planta?.especie ?? '',
      nombre_cientifico: local?.nombre_cientifico ?? meta.planta?.nombre_cientifico ?? '',
      nombre_comun_principal: local?.nombre_comun_principal ?? null,
      saldo_disponible: local?.saldo_disponible,
      pct: Math.max(0, Math.min(100, Math.round(meta.porcentaje_objetivo * 100) / 100)),
    }
  })
}

function SubcampaniaEspeciesStep({
  campania,
  draftId,
  authId,
  onDraftSaved,
  onBackToBase,
  onNext,
}: Props) {
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadSubcampaniaBaseDraft(campania.id, draftId),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stateError, setStateError] = useState<string | null>(null)
  const planLoadRef = useRef(0)
  const submittingRef = useRef(false)
  const formEditedRef = useRef(false)
  const baselineRevisionRef = useRef<number | null>(null)

  const form = usePlanMetaEspeciesForm(() => createPlanFormFromDraft(initialDraft?.meta_total_arboles ?? 0, initialDraft?.especies ?? []), {
    disabled: submitting || Boolean(stateError),
    maxMeta: META_MAX,
    onChange: () => { formEditedRef.current = true; setSubmitError(null) },
  })
  const { value, setValue } = form
  const meta = positivePlanInteger(value.meta) ?? 0
  const especies = planFormToDraft(value)
  const balanced = getPlanPercentageTotal(value.especies) === 100
  const validation = validatePlanForm(value, { omitZeroPercent: true })
  const planPayload = validation.proposal?.metas ?? []
  const validPercentageInputs = value.especies.every(item => planPercentage(item.porcentaje) !== null)
  const canSaveDraft = meta > 0 && validPercentageInputs && !stateError
  const canSave = planPayload.length > 0 && !stateError

  // Si ya existe la subcampaña en backend, precargar el plan de metas por especie.
  // El GET /plan trae planta_id/especie/nombre_cientifico; se mergean con el draft
  // local por planta_id para preservar saldo_disponible y nombre_comun_principal.
  useEffect(() => {
    const subcampaniaId = initialDraft?.subcampania_id
    if (!subcampaniaId) return

    const requestId = ++planLoadRef.current

    PlantacionService.getSubcampaniaPlan(subcampaniaId, authId)
      .then((plan) => {
        if (requestId !== planLoadRef.current) return

        if (plan.estado !== 'BORRADOR') {
          setStateError('Este asistente solo permite editar BORRADOR. Usa el editor del detalle para revisar un plan ACTIVO.')
          return
        }
        const revision = plan.plan_revision
        if (typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 && baselineRevisionRef.current === null) {
          baselineRevisionRef.current = revision
        }
        // Un borrador puede contener una propuesta local todavía incompleta o
        // rechazada por el backend. La carga no debe reemplazar esos valores.
        if (formEditedRef.current) return
        setValue(current => createPlanFormFromDraft(
          initialDraft.meta_total_arboles == null && Number.isSafeInteger(plan.meta_total_arboles) && plan.meta_total_arboles > 0
            ? plan.meta_total_arboles : positivePlanInteger(current.meta) ?? 0,
          initialDraft.especies === undefined
            ? mergeDraftEspeciesWithPlan(planFormToDraft(current), plan.metas) : planFormToDraft(current),
        ))
      })
      .catch(() => {
        // Silencioso: si el GET falla se sigue con el draft local; el usuario reintenta al guardar.
      })

    return () => { planLoadRef.current += 1 }
  }, [authId, campania.id, draftId, initialDraft?.especies, initialDraft?.meta_total_arboles, initialDraft?.subcampania_id, setValue])

  const handleAddEspecies = (items: EspecieCatalogoItem[]) => {
    if (submittingRef.current || stateError) return
    form.addSpecies(items)
    setPickerOpen(false)
  }

  const persistDraftLocally = (
    base: SubcampaniaBaseDraft,
    overrides: Partial<SubcampaniaBaseDraft>,
  ): SubcampaniaBaseDraft => {
    const nextDraft: SubcampaniaBaseDraft = {
      ...base,
      ...overrides,
      meta_total_arboles: meta,
      especies,
      updated_at: new Date().toISOString(),
    }
    saveSubcampaniaBaseDraft(nextDraft)
    return nextDraft
  }

  const syncCoordinador = async (
    subcampaniaId: number,
    coordinadorActual: { id: number } | null,
    coordinadorNuevo: { id: number },
  ) => {
    if (coordinadorActual && coordinadorActual.id === coordinadorNuevo.id) return

    if (coordinadorActual) {
      await PlantacionService.removeSubcampaniaEquipoMember(
        subcampaniaId,
        coordinadorActual.id,
        authId,
      )
    }

    await PlantacionService.setSubcampaniaEquipo(
      subcampaniaId,
      [{ usuario_id: coordinadorNuevo.id, rol: 'COORDINADOR' }],
      authId,
    )
  }

  const handleSaveStep = async (action: 'draft' | 'next') => {
    if (submittingRef.current || stateError) return
    setSubmitError(null)

    if (!initialDraft) {
      setSubmitError('No se encontró el borrador. Vuelve al paso anterior.')
      return
    }
    if (!initialDraft.comunidad?.id) {
      setSubmitError('Falta la comunidad/zona del paso 1.')
      return
    }
    if (!initialDraft.coordinador?.id) {
      setSubmitError('Falta el coordinador del paso 1.')
      return
    }
    if (!initialDraft.nombre || initialDraft.nombre.trim().length < 3) {
      setSubmitError('Falta el nombre de la subcampaña del paso 1.')
      return
    }
    if (!Number.isSafeInteger(meta) || meta <= 0) {
      setSubmitError('Define una meta de árboles entera y mayor a 0.')
      return
    }
    if (!validPercentageInputs) {
      setSubmitError('Indica porcentajes entre 0 y 100, con máximo 2 decimales.')
      return
    }
    if (action === 'next') {
      if (especies.length === 0) {
        setSubmitError('Agrega al menos una especie al mix.')
        return
      }
      if (!balanced) {
        setSubmitError('La suma de porcentajes debe ser 100%.')
        return
      }
      if (!canSave) {
        setSubmitError('La meta debe permitir al menos un árbol por especie y un plan coherente sin duplicados.')
        return
      }
    }

    try {
      submittingRef.current = true
      setSubmitting(true)

      const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId) ?? initialDraft

      let workingDraft = persistDraftLocally(currentDraft, {})

      const coordinadorNuevo = initialDraft.coordinador
      let subcampaniaId = workingDraft.subcampania_id ?? null
      let persistedPlan: GetPlanData | null = null

      if (subcampaniaId) {
        persistedPlan = await PlantacionService.getSubcampaniaPlan(subcampaniaId, authId)
        if (persistedPlan.estado !== 'BORRADOR') {
          const message = 'La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.'
          setStateError(message)
          throw new Error(message)
        }
        if (planPayload.length === 0 && action === 'draft') {
          onDraftSaved()
          return
        }
        if (persistedPlan.plan_revision !== undefined && (!Number.isSafeInteger(persistedPlan.plan_revision) || persistedPlan.plan_revision < 0)) {
          throw new Error('No se recibió una revisión válida del plan. Consulta el borrador antes de reintentar.')
        }
        if (persistedPlan.plan_revision !== undefined) {
          if (baselineRevisionRef.current === null) baselineRevisionRef.current = persistedPlan.plan_revision
          else if (persistedPlan.plan_revision !== baselineRevisionRef.current) {
            throw new Error('El plan cambió desde que abriste el asistente. Tu propuesta sigue guardada en este dispositivo. Vuelve a abrir el borrador para consultar el plan vigente antes de reintentar.')
          }
        } else if (baselineRevisionRef.current !== null) {
          throw new Error('No se recibió la revisión del plan. Vuelve a abrir el borrador antes de reintentar.')
        }
        try {
          await PlantacionService.updateSubcampania(
            subcampaniaId,
            {
              nombre: workingDraft.nombre,
              // Compatibilidad solo con backend anterior, que no ofrece revisión.
              ...(persistedPlan.plan_revision === undefined ? { meta_total_arboles: meta } : {}),
              zona_id: workingDraft.comunidad?.id,
              fecha_estimada_inicio: workingDraft.fecha_estimada_inicio || undefined,
              fecha_estimada_fin: workingDraft.fecha_estimada_fin || undefined,
            },
            authId,
          )
        } catch (updateError) {
          const msg = updateError instanceof Error ? updateError.message : ''
          if (msg !== 'No hay cambios para actualizar.') throw updateError
        }

        const equipoActual = await PlantacionService.getSubcampaniaEquipo(subcampaniaId, authId)
        const coordinadorPersistido = equipoActual.find((member) => member.rol === 'COORDINADOR')
        // EquipoMember.usuario_id (contrato backend) → { id } (modelo de usuario del frontend).
        await syncCoordinador(
          subcampaniaId,
          coordinadorPersistido ? { id: coordinadorPersistido.usuario_id } : null,
          coordinadorNuevo,
        )
      } else {
        if (planPayload.length === 0 && action === 'draft') {
          onDraftSaved()
          return
        }
        const created = await PlantacionService.createSubcampania(
          {
            campania_id: campania.id,
            nombre: workingDraft.nombre,
            zona_id: workingDraft.comunidad?.id as number,
            meta_total_arboles: meta,
            fecha_estimada_inicio: workingDraft.fecha_estimada_inicio || undefined,
            fecha_estimada_fin: workingDraft.fecha_estimada_fin || undefined,
          },
          authId,
        )

        workingDraft = persistDraftLocally(workingDraft, { subcampania_id: created.id })
        subcampaniaId = created.id

        await PlantacionService.setSubcampaniaEquipo(
          created.id,
          [{ usuario_id: coordinadorNuevo.id, rol: 'COORDINADOR' }],
          authId,
        )
        persistedPlan = await PlantacionService.getSubcampaniaPlan(created.id, authId)
        baselineRevisionRef.current = persistedPlan.plan_revision ?? null
      }

      if (subcampaniaId && persistedPlan && planPayload.length > 0) {
        if (persistedPlan.estado !== 'BORRADOR') throw new Error('La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.')
        if (persistedPlan.plan_revision !== undefined) {
          const savedPlan = await PlantacionService.revisarSubcampaniaPlan(subcampaniaId, {
            meta_total_arboles: meta,
            revision_esperada: baselineRevisionRef.current ?? persistedPlan.plan_revision,
            metas: planPayload,
          }, authId)
          baselineRevisionRef.current = savedPlan.plan_revision
        } else {
          await PlantacionService.putSubcampaniaPlan(subcampaniaId, planPayload, authId)
        }
      }

      if (action === 'draft') {
        onDraftSaved()
        return
      }

      onNext()
    } catch (saveError) {
      const msg = saveError instanceof Error ? saveError.message : ''
      setSubmitError(msg || 'No se pudo guardar la subcampaña.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (!initialDraft) {
    return (
      <>
        <main className="space-y-4 px-5 pt-4">
          <section className="rounded-3xl bg-warning-50 p-4 shadow-soft ring-1 ring-warning-100">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning-100 text-warning-800">
                <Icon name="info" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-warning-950">
                  Guarda primero los datos base
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-warning-900">
                  El mix de especies se guarda sobre el mismo borrador de la subcampaña.
                </p>
              </div>
            </div>
          </section>
        </main>
        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-brand-50 via-brand-50/95 to-transparent px-5 pb-5 pt-3">
            <Button variant="primary" size="lg" fullWidth onClick={onBackToBase}>
              Volver al paso anterior
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="space-y-4 px-5 pt-4">
        <PlanMetaEspeciesForm value={value} disabled={submitting || Boolean(stateError)}
          errors={{ ...validation.errors, meta: value.meta === '' ? undefined : validation.errors.meta }}
          onMetaChange={form.changeMeta} onMetaStep={form.stepMeta}
          onPercentageChange={form.changePercentage} onPercentageStep={form.stepPercentage}
          onRemoveSpecies={form.removeSpecies} onOpenCatalog={() => setPickerOpen(true)} />
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-brand-50 via-brand-50/95 to-transparent px-5 pb-5 pt-3">
          {(stateError || submitError) && (
            <p className="mb-2 whitespace-pre-line rounded-2xl bg-danger-50 px-4 py-2 text-center text-xs font-extrabold text-danger-700 ring-1 ring-danger-100">
              {stateError || submitError}
            </p>
          )}
          {!canSave && !stateError && <p className="mb-2 rounded-2xl bg-warning-50 px-4 py-2 text-xs font-semibold text-warning-800">
            El plan incompleto se guarda solo en este dispositivo. Para enviarlo, los porcentajes deben sumar 100% y la meta debe permitir al menos un árbol por especie.
          </p>}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" fullWidth leftIcon="arrow-left" disabled={submitting} onClick={onBackToBase}>
              Atrás
            </Button>
            <Button
              variant="secondary"
              fullWidth
              leftIcon="file"
              onClick={() => void handleSaveStep('draft')}
              disabled={submitting || !canSaveDraft}
            >
              Guardar borrador
            </Button>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            rightIcon="chevron-right"
            onClick={() => void handleSaveStep('next')}
            disabled={submitting || !canSave}
          >
            {submitting ? 'Guardando…' : 'Siguiente'}
          </Button>
        </div>
      </div>

      <CatalogoEspeciesPicker
        open={pickerOpen && !submitting && !stateError}
        excludedPlantaIds={especies.map((especie) => especie.planta_id)}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAddEspecies}
      />
    </>
  )
}

export default SubcampaniaEspeciesStep
