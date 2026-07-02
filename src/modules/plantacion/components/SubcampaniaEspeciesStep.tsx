import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../components/Icon'
import { PlantacionService } from '../../../services/plantacion.service'
import type { Campania, PlanEspecieMetaInput } from '../types/contracts'
import {
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
  type SubcampaniaBaseDraft,
  type SubcampaniaEspecieDraft,
} from '../utils/subcampaniaDraft'
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

// Reparte el residuo del `floor` para que SUM(cantidad_objetivo) === meta cuando SUM(pct) === 100.
function buildPlanMetasPayload(
  meta: number,
  especies: SubcampaniaEspecieDraft[],
): PlanEspecieMetaInput[] {
  const withPct = especies.filter((especie) => especie.pct > 0)
  if (withPct.length === 0) return []

  const draft = withPct.map((especie) => ({
    planta_id: especie.planta_id,
    porcentaje_objetivo: especie.pct,
    cantidad_objetivo: Math.max(1, Math.floor((meta * especie.pct) / 100)),
  }))

  const totalPct = draft.reduce((acc, item) => acc + item.porcentaje_objetivo, 0)
  if (totalPct !== 100) return draft

  const suma = draft.reduce((acc, item) => acc + item.cantidad_objetivo, 0)
  let residuo = meta - suma

  const indices = draft
    .map((_, index) => index)
    .sort((a, b) => draft[b].porcentaje_objetivo - draft[a].porcentaje_objetivo)

  let cursor = 0
  while (residuo > 0 && indices.length > 0) {
    draft[indices[cursor % indices.length]].cantidad_objetivo += 1
    residuo -= 1
    cursor += 1
  }

  const reversed = [...indices].reverse()
  cursor = 0
  while (residuo < 0 && reversed.length > 0) {
    const idx = reversed[cursor % reversed.length]
    if (draft[idx].cantidad_objetivo > 1) {
      draft[idx].cantidad_objetivo -= 1
      residuo += 1
    }
    cursor += 1
    if (cursor > reversed.length * 200) break
  }

  return draft
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
  const planLoadRef = useRef(0)

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
        if (!plan.metas || plan.metas.length === 0) return

        setEspecies((current) => {
          const byId = new Map(current.map((e) => [e.planta_id, e]))
          return plan.metas.map((meta) => {
            const local = byId.get(meta.planta_id)
            return {
              planta_id: meta.planta_id,
              especie: local?.especie ?? meta.planta?.especie ?? '',
              nombre_cientifico:
                local?.nombre_cientifico ?? meta.planta?.nombre_cientifico ?? '',
              nombre_comun_principal: local?.nombre_comun_principal ?? null,
              saldo_disponible: local?.saldo_disponible ?? 0,
              pct: clampPct(meta.porcentaje_objetivo),
            }
          })
        })
      })
      .catch(() => {
        // Silencioso: si el GET falla se sigue con el draft local; el usuario reintenta al guardar.
      })
  }, [authId, initialDraft?.subcampania_id])

  const total = useMemo(() => sumPct(especies), [especies])
  const balanced = total === 100
  const canSaveDraft = meta > 0
  const canSave = meta > 0 && balanced && especies.length > 0

  const handleMeta = (next: number) => {
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
    setEspecies((current) =>
      current.map((especie) =>
        especie.planta_id === plantaId ? { ...especie, pct: clampPct(nextPct) } : especie,
      ),
    )
    setSubmitError(null)
  }

  const handleAddEspecies = (items: EspecieCatalogoItem[]) => {
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
    if (meta <= 0) {
      setSubmitError('Define una meta de árboles mayor a 0.')
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
    }

    try {
      setSubmitting(true)

      const currentDraft = loadSubcampaniaBaseDraft(campania.id, draftId) ?? initialDraft

      let workingDraft = persistDraftLocally(currentDraft, {})

      const coordinadorNuevo = initialDraft.coordinador
      let subcampaniaId = workingDraft.subcampania_id ?? null

      if (subcampaniaId) {
        try {
          await PlantacionService.updateSubcampania(
            subcampaniaId,
            {
              nombre: workingDraft.nombre,
              meta_total_arboles: meta,
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
      }

      // Plan por especie: enviar solo las especies con pct>0. Backend valida
      // consistencia total (SUM(%)=100, SUM(cantidad)=meta) al activar, no aquí.
      const planPayload = buildPlanMetasPayload(meta, especies)
      if (subcampaniaId && planPayload.length > 0) {
        await PlantacionService.putSubcampaniaPlan(subcampaniaId, planPayload, authId)
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
      setSubmitting(false)
    }
  }

  if (!initialDraft) {
    return (
      <>
        <main className="space-y-4 px-5 pt-4">
          <section className="rounded-3xl bg-amber-50 p-4 shadow-soft ring-1 ring-amber-100">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Icon name="info" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-950">
                  Guarda primero los datos base
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-amber-900">
                  El mix de especies se guarda sobre el mismo borrador de la subcampaña.
                </p>
              </div>
            </div>
          </section>
        </main>
        <div className="px-5">
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
            <button
              type="button"
              onClick={onBackToBase}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99]"
            >
              Volver al paso anterior
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="space-y-4 px-5 pt-4">
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
                balanced ? 'text-emerald-700' : 'text-amber-700'
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
              <p className="mt-1 text-xs font-semibold text-slate-500">
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
                      <p className="text-[11px] italic text-slate-500">
                        {especie.nombre_cientifico}
                      </p>
                      <p
                        className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${
                          especie.saldo_disponible <= 0 ? 'text-amber-700' : 'text-slate-400'
                        }`}
                      >
                        Vivero:{' '}
                        <span
                          className={
                            especie.saldo_disponible <= 0 ? 'text-amber-700' : 'text-brand-700'
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
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] font-extrabold text-slate-500">
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
                      className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700 transition hover:bg-red-100"
                    >
                      <Icon name="trash" className="h-3 w-3" />
                      Quitar
                    </button>
                  </div>
                  {(sinStock || cubrimientoExcedido) && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-2 py-1 text-[10.5px] font-extrabold text-amber-800 ring-1 ring-amber-100">
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
      </main>

      <div className="px-5">
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-[#eef2ed] via-[#eef2ed]/95 to-transparent px-5 pb-5 pt-3">
          {submitError && (
            <p className="mb-2 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {submitError}
            </p>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToBase}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99]"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="button"
              onClick={() => void handleSaveStep('draft')}
              disabled={submitting || !canSaveDraft}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold shadow-soft transition active:scale-[0.99] ${
                submitting || !canSaveDraft
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : 'bg-white text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50'
              }`}
            >
              <Icon name="file" className="h-4 w-4" />
              Guardar borrador
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleSaveStep('next')}
            disabled={submitting || !canSave}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
              submitting || !canSave
                ? 'cursor-not-allowed bg-slate-400/70'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {submitting ? 'Guardando…' : 'Siguiente'}
            {!submitting && <Icon name="chevron-right" className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <CatalogoEspeciesPicker
        open={pickerOpen}
        excludedPlantaIds={especies.map((especie) => especie.planta_id)}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAddEspecies}
      />
    </>
  )
}

export default SubcampaniaEspeciesStep
