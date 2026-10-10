import { useEffect, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { getPlantacionErrorStatus, PlantacionService } from '../../../services/plantacion.service'
import { WebAuthnService } from '../../../services/webauthn.service'
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

const META_MAX = 2_147_483_647

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
  const { user, isAuthenticated, login } = useAuth()
  const token = WebAuthnService.getToken()?.trim()
  const isAdmin = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadSubcampaniaBaseDraft(campania.id, draftId),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stateError, setStateError] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<401 | 403 | null>(null)
  const [recoveringSession, setRecoveringSession] = useState(false)
  const [reviewRequired, setReviewRequired] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<GetPlanData | null>(null)
  const [readingPlan, setReadingPlan] = useState(false)
  const [unversionedPlan, setUnversionedPlan] = useState(false)
  const planLoadRef = useRef(0)
  const planReadingRef = useRef(false)
  const submittingRef = useRef(false)
  const formEditedRef = useRef(false)
  const baselineRevisionRef = useRef<number | null>(null)
  const sessionMissing = !isAuthenticated || !token || accessError === 401
  const accessBlocked = sessionMissing || accessError === 403 || !isAdmin
  const formDisabled = submitting || Boolean(stateError) || accessBlocked || readingPlan || recoveringSession

  const form = usePlanMetaEspeciesForm(() => createPlanFormFromDraft(initialDraft?.meta_total_arboles ?? 0, initialDraft?.especies ?? []), {
    disabled: formDisabled,
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
  const canSaveDraft = meta > 0 && validPercentageInputs && !stateError && !accessBlocked
  const canSave = planPayload.length > 0 && !stateError && !accessBlocked && !reviewRequired && !unversionedPlan

  const requireSession = (expectedToken = token) => {
    if (!isAuthenticated || !expectedToken || WebAuthnService.getToken()?.trim() !== expectedToken || accessError === 401) {
      throw Object.assign(new Error('Inicia sesión con tu passkey para consultar o guardar el plan. Tu propuesta se conserva.'), { status: 401 })
    }
  }

  const recordAccessError = (reason: unknown) => {
    const status = getPlantacionErrorStatus(reason)
    if (status === 401 || status === 403) setAccessError(status)
  }

  // Si ya existe la subcampaña en backend, precargar el plan de metas por especie.
  // El GET /plan trae planta_id/especie/nombre_cientifico; se mergean con el draft
  // local por planta_id para preservar saldo_disponible y nombre_comun_principal.
  useEffect(() => {
    const subcampaniaId = initialDraft?.subcampania_id
    if (!subcampaniaId || !isAuthenticated || !token || accessError) return

    const requestId = ++planLoadRef.current

    PlantacionService.getSubcampaniaPlan(subcampaniaId, authId)
      .then((plan) => {
        if (requestId !== planLoadRef.current) return

        if (plan.estado !== 'BORRADOR') {
          setStateError('Este asistente solo permite editar BORRADOR. Usa el editor del detalle para revisar un plan ACTIVO.')
          return
        }
        setCurrentPlan(plan)
        const revision = plan.plan_revision
        const versioned = typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0
        setUnversionedPlan(!versioned)
        if (!versioned) setReviewRequired(true)
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
      .catch((reason: unknown) => {
        if (requestId !== planLoadRef.current) return
        const status = getPlantacionErrorStatus(reason)
        if (status === 401 || status === 403) setAccessError(status)
        setReviewRequired(true)
        setSubmitError(reason instanceof Error ? reason.message : 'No se pudo leer el plan vigente. Consulta el plan antes de guardar.')
      })

    return () => { planLoadRef.current += 1 }
  }, [authId, campania.id, draftId, initialDraft?.especies, initialDraft?.meta_total_arboles, initialDraft?.subcampania_id, setValue, isAuthenticated, token, accessError])

  const handleAddEspecies = (items: EspecieCatalogoItem[]) => {
    if (formDisabled) return
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
      requireSession()
      await PlantacionService.removeSubcampaniaEquipoMember(
        subcampaniaId,
        coordinadorActual.id,
        authId,
      )
    }

    requireSession()
    await PlantacionService.setSubcampaniaEquipo(
      subcampaniaId,
      [{ usuario_id: coordinadorNuevo.id, rol: 'COORDINADOR' }],
      authId,
    )
  }

  const handleSaveStep = async (action: 'draft' | 'next') => {
    if (submittingRef.current || stateError || accessBlocked || readingPlan || recoveringSession) return
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

    let planWriteStarted = false
    try {
      submittingRef.current = true
      setSubmitting(true)

      const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId) ?? initialDraft

      let workingDraft = persistDraftLocally(currentDraft, {})

      // Un borrador incompleto o un servidor sin versión solo permite guardar
      // la propuesta en este dispositivo, sin mutar metadatos ni equipo.
      if (action === 'draft' && (planPayload.length === 0 || unversionedPlan || reviewRequired)) {
        onDraftSaved()
        return
      }
      if (reviewRequired || unversionedPlan) return
      requireSession()

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
        if (persistedPlan.plan_revision === undefined || !Number.isSafeInteger(persistedPlan.plan_revision) || persistedPlan.plan_revision < 0) {
          setUnversionedPlan(true)
          throw new Error('El servidor no ofrece una revisión válida del plan. Tu propuesta se conserva solo en este dispositivo.')
        }
        if (persistedPlan.plan_revision !== baselineRevisionRef.current) {
          setCurrentPlan(persistedPlan)
          setReviewRequired(true)
          throw new Error('El plan cambió desde que abriste el asistente. Tu propuesta se conserva. Revisa el plan vigente antes de volver a guardar.')
        }
        try {
          requireSession()
          await PlantacionService.updateSubcampania(
            subcampaniaId,
            {
              nombre: workingDraft.nombre,
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

        requireSession()
        const equipoActual = await PlantacionService.getSubcampaniaEquipo(subcampaniaId, authId)
        const coordinadorPersistido = equipoActual.find((member) => member.rol === 'COORDINADOR')
        // EquipoMember.usuario_id (contrato backend) → { id } (modelo de usuario del frontend).
        await syncCoordinador(
          subcampaniaId,
          coordinadorPersistido ? { id: coordinadorPersistido.usuario_id } : null,
          coordinadorNuevo,
        )
      } else {
        requireSession()
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

        requireSession()
        persistedPlan = await PlantacionService.getSubcampaniaPlan(created.id, authId)
        if (persistedPlan.estado !== 'BORRADOR') throw new Error('La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.')
        if (persistedPlan.plan_revision === undefined || !Number.isSafeInteger(persistedPlan.plan_revision) || persistedPlan.plan_revision < 0) {
          setUnversionedPlan(true)
          throw new Error('El servidor no ofrece una revisión válida del plan. Tu propuesta se conserva solo en este dispositivo.')
        }
        baselineRevisionRef.current = persistedPlan.plan_revision
        requireSession()
        await PlantacionService.setSubcampaniaEquipo(
          created.id,
          [{ usuario_id: coordinadorNuevo.id, rol: 'COORDINADOR' }],
          authId,
        )
      }

      if (subcampaniaId && persistedPlan && planPayload.length > 0) {
        if (persistedPlan.estado !== 'BORRADOR') throw new Error('La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.')
        requireSession()
        const expectedRevision = baselineRevisionRef.current
        if (expectedRevision === null) throw new Error('Consulta y revisa el plan vigente antes de guardar.')
        planWriteStarted = true
        const savedPlan = await PlantacionService.revisarSubcampaniaPlan(subcampaniaId, {
          meta_total_arboles: meta,
          revision_esperada: expectedRevision,
          metas: planPayload,
        }, authId)
        baselineRevisionRef.current = savedPlan.plan_revision
        setCurrentPlan(savedPlan)
        // Solo el snapshot confirmado representa el plan remoto guardado.
        saveSubcampaniaBaseDraft({ ...workingDraft,
          meta_total_arboles: savedPlan.meta_total_arboles,
          especies: mergeDraftEspeciesWithPlan(especies, savedPlan.metas),
          updated_at: new Date().toISOString(),
        })
      }

      if (action === 'draft') {
        onDraftSaved()
        return
      }

      onNext()
    } catch (saveError) {
      const status = getPlantacionErrorStatus(saveError)
      recordAccessError(saveError)
      if (status === 409 || (planWriteStarted && (status === undefined || status >= 500))) {
        setReviewRequired(true)
        setCurrentPlan(null)
      }
      const msg = saveError instanceof Error ? saveError.message : ''
      setSubmitError(msg || 'No se pudo guardar la subcampaña.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const reloadCurrentPlan = async () => {
    const subcampaniaId = loadSubcampaniaBaseDraft(campania.id, draftId)?.subcampania_id
    if (!subcampaniaId || planReadingRef.current || submittingRef.current || accessBlocked) return
    const request = ++planLoadRef.current
    planReadingRef.current = true
    setReadingPlan(true)
    setSubmitError(null)
    setCurrentPlan(null)
    try {
      requireSession()
      const plan = await PlantacionService.getSubcampaniaPlan(subcampaniaId, authId)
      if (request !== planLoadRef.current) return
      setCurrentPlan(plan)
      if (plan.estado !== 'BORRADOR') {
        setStateError('La subcampaña dejó de estar en BORRADOR. Revisa su plan desde el detalle.')
        return
      }
      const versioned = typeof plan.plan_revision === 'number' && Number.isSafeInteger(plan.plan_revision) && plan.plan_revision >= 0
      setUnversionedPlan(!versioned)
      if (!versioned) setSubmitError('El servidor no ofrece una revisión válida del plan. Tu propuesta se conserva solo en este dispositivo.')
      // Leer otra versión nunca autoriza por sí solo una nueva escritura.
      setReviewRequired(true)
    } catch (reason) {
      if (request !== planLoadRef.current) return
      recordAccessError(reason)
      setSubmitError(reason instanceof Error ? reason.message : 'No se pudo consultar el plan vigente.')
    } finally {
      planReadingRef.current = false
      setReadingPlan(false)
    }
  }

  const recoverSession = async () => {
    if (recoveringSession || submittingRef.current) return
    setRecoveringSession(true)
    setSubmitError(null)
    try {
      await login()
      setAccessError(null)
      setCurrentPlan(null)
      setReviewRequired(Boolean(loadSubcampaniaBaseDraft(campania.id, draftId)?.subcampania_id))
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión con tu passkey.')
    } finally {
      setRecoveringSession(false)
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
        {sessionMissing && <section role="alert" className="rounded-3xl bg-warning-50 p-4 text-xs font-semibold text-warning-900">
          <p>Inicia sesión con tu passkey para consultar o guardar el plan. Tu propuesta se conserva en este dispositivo.</p>
          <Button variant="secondary" size="sm" className="mt-3" loading={recoveringSession}
            disabled={recoveringSession || submitting} onClick={() => { void recoverSession() }}>Iniciar sesión con passkey</Button>
        </section>}
        {!sessionMissing && (accessError === 403 || !isAdmin) && <p role="alert" className="rounded-3xl bg-warning-50 p-4 text-xs font-semibold text-warning-900">
          {accessError === 403 ? 'El servidor rechazó el permiso para editar el plan. Tu sesión se conserva.' : 'Solo ADMIN global puede editar el plan de una subcampaña.'}
        </p>}
        {unversionedPlan && <p role="status" className="rounded-3xl bg-warning-50 p-4 text-xs font-semibold text-warning-900">
          El servidor no ofrece una revisión válida del plan. Puedes conservar el borrador solo en este dispositivo.
        </p>}
        {reviewRequired && !accessBlocked && <section className="space-y-3 rounded-3xl bg-warning-50 p-4 text-xs font-semibold text-warning-900">
          <p>Consulta y revisa el plan vigente antes de volver a guardar. Tu propuesta se conserva y no se reenvía automáticamente.</p>
          {currentPlan && <div className="rounded-2xl bg-white p-3">
            <p>Plan vigente: {currentPlan.meta_total_arboles} árboles · Revisión {currentPlan.plan_revision ?? 'no disponible'}</p>
            <ul className="mt-2 space-y-1">{currentPlan.metas.map(item => <li key={item.planta_id}>
              {item.planta?.especie || `Especie #${item.planta_id}`}: {item.porcentaje_objetivo}% · {item.cantidad_objetivo} árboles
            </li>)}</ul>
            <p className="mt-2">Tu propuesta: {meta} árboles. Revisa el mix en el formulario.</p>
          </div>}
          <Button variant="secondary" size="sm" loading={readingPlan} disabled={readingPlan || submitting}
            onClick={() => { void reloadCurrentPlan() }}>Consultar plan vigente</Button>
          {currentPlan && !unversionedPlan && currentPlan.estado === 'BORRADOR' && <Button variant="secondary" size="sm"
            disabled={readingPlan || submitting} onClick={() => {
              if (currentPlan.plan_revision === undefined) return
              baselineRevisionRef.current = currentPlan.plan_revision
              setReviewRequired(false)
              setSubmitError(null)
            }}>Revisé el plan vigente</Button>}
        </section>}
        <PlanMetaEspeciesForm value={value} disabled={formDisabled}
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
          {planPayload.length === 0 && !stateError && <p className="mb-2 rounded-2xl bg-warning-50 px-4 py-2 text-xs font-semibold text-warning-800">
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
              disabled={submitting || readingPlan || recoveringSession || !canSaveDraft}
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
            disabled={submitting || readingPlan || recoveringSession || !canSave}
          >
            {submitting ? 'Guardando…' : 'Siguiente'}
          </Button>
        </div>
      </div>

      <CatalogoEspeciesPicker
        open={pickerOpen && !formDisabled}
        excludedPlantaIds={especies.map((especie) => especie.planta_id)}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAddEspecies}
      />
    </>
  )
}

export default SubcampaniaEspeciesStep
