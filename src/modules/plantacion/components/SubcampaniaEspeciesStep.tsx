import { useEffect, useMemo, useRef, useState } from 'react'
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
import { buildPlanMetasPayload } from '../utils/planMetas'
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

const META_FINE_STEP = 100
const META_QUICK_STEPS = [500, 1000, 5000, 10000] as const
const META_MAX = 1_000_000
const PCT_STEP = 5

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function sumPct(especies: SubcampaniaEspecieDraft[]): number {
  return especies.reduce((acc, especie) => acc + especie.pct, 0)
}

function getAutomaticPctShares(
  current: SubcampaniaEspecieDraft[],
  newItemsCount: number,
): number[] {
  if (newItemsCount <= 0) return []

  const remainingPct = clampPct(100 - sumPct(current))
  if (remainingPct <= 0) return Array.from({ length: newItemsCount }, () => 0)

  const baseShare = Math.floor(remainingPct / newItemsCount)
  const remainder = remainingPct % newItemsCount

  return Array.from({ length: newItemsCount }, (_, index) =>
    index < remainder ? baseShare + 1 : baseShare,
  )
}

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
      saldo_disponible: local?.saldo_disponible ?? 0,
      pct: clampPct(meta.porcentaje_objetivo),
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
  const [meta, setMeta] = useState<number>(() => initialDraft?.meta_total_arboles ?? 0)
  const [especies, setEspecies] = useState<SubcampaniaEspecieDraft[]>(
    () => initialDraft?.especies ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stateError, setStateError] = useState<string | null>(null)
  const planLoadRef = useRef(0)
  const submittingRef = useRef(false)
  const formEditedRef = useRef(false)
  const baselineRevisionRef = useRef<number | null>(null)

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
        if (initialDraft.meta_total_arboles == null && Number.isSafeInteger(plan.meta_total_arboles) && plan.meta_total_arboles > 0) {
          setMeta(plan.meta_total_arboles)
        }
        if (initialDraft.especies === undefined) {
          setEspecies((current) => mergeDraftEspeciesWithPlan(current, plan.metas))
        }
      })
      .catch(() => {
        // Silencioso: si el GET falla se sigue con el draft local; el usuario reintenta al guardar.
      })

    return () => { planLoadRef.current += 1 }
  }, [authId, campania.id, draftId, initialDraft?.especies, initialDraft?.meta_total_arboles, initialDraft?.subcampania_id])

  const total = useMemo(() => sumPct(especies), [especies])
  const balanced = Math.abs(total - 100) <= 1e-6
  const planPayload = useMemo(() => {
    const positiveSpecies = especies.filter((item) => item.pct > 0)
    if (!Number.isSafeInteger(meta) || meta <= 0 || !balanced || positiveSpecies.length === 0 || meta < positiveSpecies.length ||
      new Set(positiveSpecies.map((item) => item.planta_id)).size !== positiveSpecies.length) return []
    const metas = buildPlanMetasPayload(meta, especies)
    return metas.every((item) => Number.isSafeInteger(item.cantidad_objetivo) && item.cantidad_objetivo > 0) &&
      metas.reduce((sum, item) => sum + item.cantidad_objetivo, 0) === meta ? metas : []
  }, [balanced, especies, meta])
  const canSaveDraft = Number.isSafeInteger(meta) && meta > 0 && !stateError
  const canSave = planPayload.length > 0 && !stateError

  const handleMeta = (next: number) => {
    if (submittingRef.current || stateError) return
    formEditedRef.current = true
    setMeta(Math.max(0, Math.min(META_MAX, Math.round(next))))
    setSubmitError(null)
  }

  const handleMetaInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D+/g, '')
    if (digitsOnly === '') {
      handleMeta(0)
      return
    }
    handleMeta(Number(digitsOnly))
  }

  const handleTogglePct = (plantaId: number, nextPct: number) => {
    if (submittingRef.current || stateError) return
    formEditedRef.current = true
    setEspecies((current) =>
      current.map((especie) =>
        especie.planta_id === plantaId ? { ...especie, pct: clampPct(nextPct) } : especie,
      ),
    )
    setSubmitError(null)
  }

  const handleAddEspecies = (items: EspecieCatalogoItem[]) => {
    if (submittingRef.current || stateError) return
    formEditedRef.current = true
    if (items.length === 0) {
      setPickerOpen(false)
      return
    }
    setEspecies((current) => {
      const existingIds = new Set(current.map((especie) => especie.planta_id))
      const uniqueItems = items.filter((item) => !existingIds.has(item.planta_id))
      const automaticPctShares = getAutomaticPctShares(current, uniqueItems.length)
      const newOnes: SubcampaniaEspecieDraft[] = uniqueItems.map((item, index) => ({
        planta_id: item.planta_id,
        especie: item.especie,
        nombre_cientifico: item.nombre_cientifico,
        nombre_comun_principal: item.nombre_comun_principal,
        saldo_disponible: item.saldo_disponible,
        pct: automaticPctShares[index] ?? 0,
      }))
      return [...current, ...newOnes]
    })
    setPickerOpen(false)
    setSubmitError(null)
  }

  const handleRemoveEspecie = (plantaId: number) => {
    if (submittingRef.current || stateError) return
    formEditedRef.current = true
    setEspecies((current) => current.filter((especie) => especie.planta_id !== plantaId))
    setSubmitError(null)
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
        <fieldset disabled={submitting || Boolean(stateError)} className="min-w-0 space-y-4">
        <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">
              Meta total
            </p>
            {meta > 0 && (
              <button
                type="button"
                onClick={() => handleMeta(0)}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/90 transition hover:bg-white/25"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="mt-2 flex items-end gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={meta === 0 ? '' : meta.toLocaleString('es-BO')}
              onChange={(event) => handleMetaInputChange(event.target.value)}
              placeholder="0"
              aria-label="Meta total de árboles"
              className="w-full min-w-0 border-b-2 border-white/30 bg-transparent text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-white outline-none placeholder:text-white/40 focus:border-white"
            />
            <p className="pb-1 text-sm font-extrabold text-white/80">árboles</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {META_QUICK_STEPS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleMeta(meta + amount)}
                className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-white/25"
              >
                +{amount.toLocaleString('es-BO')}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMeta(meta - META_FINE_STEP)}
                aria-label={`Restar ${META_FINE_STEP} a la meta`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="minus" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleMeta(meta + META_FINE_STEP)}
                aria-label={`Sumar ${META_FINE_STEP} a la meta`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              >
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Mix planificado
            </p>
            <p
              className={`text-[11px] font-extrabold tabular-nums ${
                balanced ? 'text-success-700' : 'text-warning-700'
              }`}
            >
              {total}% asignado
              {balanced ? ' ✓' : total > 100 ? ` · excede ${total - 100}%` : ` · falta ${100 - total}%`}
            </p>
          </div>

          {especies.length === 0 && (
            <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-extrabold text-brand-800">
                Aún no hay especies en el mix
              </p>
              <p className="mt-1 text-xs font-semibold text-neutral-500">
                Agrega especies desde el catálogo para asignarles porcentaje.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {especies.map((especie) => {
              const arbolesEstimados = Math.round((meta * especie.pct) / 100)
              const cubrimientoExcedido =
                especie.saldo_disponible > 0 && arbolesEstimados > especie.saldo_disponible
              const sinStock = especie.saldo_disponible <= 0 && especie.pct > 0
              const nombreMostrado = especie.nombre_comun_principal || especie.especie
              return (
                <div
                  key={especie.planta_id}
                  className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-tight text-brand-800">
                        {nombreMostrado}
                      </p>
                      <p className="text-[11px] italic text-neutral-500">
                        {especie.nombre_cientifico}
                      </p>
                      <p
                        className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${
                          especie.saldo_disponible <= 0 ? 'text-warning-700' : 'text-neutral-400'
                        }`}
                      >
                        Vivero:{' '}
                        <span
                          className={
                            especie.saldo_disponible <= 0 ? 'text-warning-700' : 'text-brand-700'
                          }
                        >
                          {especie.saldo_disponible.toLocaleString('es-BO')}
                        </span>{' '}
                        disponibles
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePct(especie.planta_id, especie.pct - PCT_STEP)}
                        aria-label={`Restar ${PCT_STEP}% a ${nombreMostrado}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"
                      >
                        <Icon name="minus" className="h-4 w-4" />
                      </button>
                      <div className="flex w-16 flex-col items-center">
                        <p className="text-[22px] font-extrabold leading-none tabular-nums text-brand-800">
                          {especie.pct}%
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePct(especie.planta_id, especie.pct + PCT_STEP)}
                        aria-label={`Sumar ${PCT_STEP}% a ${nombreMostrado}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] font-extrabold text-neutral-500">
                    <span>
                      Equivale a{' '}
                      <span className="tabular-nums text-brand-800">
                        {arbolesEstimados.toLocaleString('es-BO')}
                      </span>{' '}
                      árboles
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEspecie(especie.planta_id)}
                      aria-label={`Quitar ${nombreMostrado} del mix`}
                      className="flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-danger-700 transition hover:bg-danger-100"
                    >
                      <Icon name="trash" className="h-3 w-3" />
                      Quitar
                    </button>
                  </div>
                  {(sinStock || cubrimientoExcedido) && (
                    <p className="mt-2 rounded-xl bg-warning-50 px-2 py-1 text-[10.5px] font-extrabold text-warning-800 ring-1 ring-warning-100">
                      {sinStock
                        ? 'No hay stock en vivero todavía. Sirve para planificación.'
                        : `Excede el stock disponible (${especie.saldo_disponible.toLocaleString(
                            'es-BO',
                          )}).`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-black/5 transition hover:ring-brand-300"
          >
            <Icon name="plus" className="h-4 w-4" />
            Agregar especie del catálogo
          </button>
        </section>
        </fieldset>
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
