import { useMemo, useState } from 'react'
import Icon from '../../../components/Icon'
import type { Campania } from '../types/contracts'
import {
  loadSubcampaniaBaseDraft,
  saveSubcampaniaBaseDraft,
  type SubcampaniaBaseDraft,
  type SubcampaniaEspecieDraft,
} from '../utils/subcampaniaDraft'
import CatalogoEspeciesPicker, {
  type EspecieCatalogoItem,
} from './CatalogoEspeciesPicker'

type SaveAction = 'draft'

type Props = {
  campania: Campania
  draftId: string
  onDraftSaved: () => void
  onBackToPolygon: () => void
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

function SubcampaniaEspeciesStep({
  campania,
  draftId,
  onDraftSaved,
  onBackToPolygon,
}: Props) {
  const [initialDraft] = useState<SubcampaniaBaseDraft | null>(() =>
    loadSubcampaniaBaseDraft(campania.id, draftId),
  )
  const [meta, setMeta] = useState<number>(() => initialDraft?.meta_total_arboles ?? 0)
  const [especies, setEspecies] = useState<SubcampaniaEspecieDraft[]>(
    () => initialDraft?.especies ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const total = useMemo(() => sumPct(especies), [especies])
  const balanced = total === 100
  const canSave = meta > 0 && balanced && especies.length > 0

  const handleMeta = (next: number) => {
    setMeta(Math.max(0, Math.min(META_MAX, Math.round(next))))
    setStatusMessage(null)
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
    setStatusMessage(null)
    setSubmitError(null)
  }

  const handleAddEspecies = (items: EspecieCatalogoItem[]) => {
    if (items.length === 0) {
      setPickerOpen(false)
      return
    }
    setEspecies((current) => {
      const existingIds = new Set(current.map((especie) => especie.planta_id))
      const newOnes: SubcampaniaEspecieDraft[] = items
        .filter((item) => !existingIds.has(item.planta_id))
        .map((item) => ({
          planta_id: item.planta_id,
          especie: item.especie,
          nombre_cientifico: item.nombre_cientifico,
          nombre_comun_principal: item.nombre_comun_principal,
          saldo_disponible: item.saldo_disponible,
          pct: 0,
        }))
      return [...current, ...newOnes]
    })
    setPickerOpen(false)
    setStatusMessage(null)
    setSubmitError(null)
  }

  const handleRemoveEspecie = (plantaId: number) => {
    setEspecies((current) => current.filter((especie) => especie.planta_id !== plantaId))
    setStatusMessage(null)
    setSubmitError(null)
  }

  const handleSaveStep = (_action: SaveAction) => {
    setSubmitError(null)
    setStatusMessage(null)

    if (!initialDraft) {
      setSubmitError('No se encontró el borrador. Vuelve al paso anterior.')
      return
    }
    if (meta <= 0) {
      setSubmitError('Define una meta de árboles mayor a 0.')
      return
    }
    if (especies.length === 0) {
      setSubmitError('Agrega al menos una especie al mix.')
      return
    }
    if (!balanced) {
      setSubmitError('La suma de porcentajes debe ser 100%.')
      return
    }

    try {
      setSubmitting(true)
      saveSubcampaniaBaseDraft({
        ...initialDraft,
        meta_total_arboles: meta,
        especies,
        updated_at: new Date().toISOString(),
      })
      onDraftSaved()
    } catch (saveError) {
      setSubmitError(
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el borrador.',
      )
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
                  Guarda primero los pasos anteriores
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
              onClick={onBackToPolygon}
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
              {balanced ? ' ✓' : ` · falta ${Math.max(0, 100 - total)}%`}
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
          {statusMessage && (
            <p className="mb-2 rounded-2xl bg-emerald-50 px-4 py-2 text-center text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              {statusMessage}
            </p>
          )}
          {submitError && (
            <p className="mb-2 rounded-2xl bg-red-50 px-4 py-2 text-center text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {submitError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBackToPolygon}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-4 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 active:scale-[0.99]"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Atrás
            </button>
            <button
              type="button"
              onClick={() => handleSaveStep('draft')}
              disabled={submitting || !canSave}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
                submitting || !canSave
                  ? 'cursor-not-allowed bg-slate-400/70'
                  : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              <Icon name="file" className="h-4 w-4" />
              Guardar borrador
            </button>
          </div>
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
