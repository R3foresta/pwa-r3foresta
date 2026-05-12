import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'
import { todayLocalISO } from '../../../utils/validations/date'
import CantidadInputCard from '../components/event/CantidadInputCard'
import FotosUploader from '../components/event/FotosUploader'
import type { Photo } from '../components/event/FotosUploader'
import QuickPercentages from '../components/event/QuickPercentages'
import SaldoMeter from '../components/event/SaldoMeter'
import { useEmbolsado } from '../hooks/useEmbolsado'
import { computeMaxPlantasEmbolsado } from '../utils/validators'

const STAGE_TABS = ['Embolsado', 'Adaptabilidad', 'Merma', 'Despacho']
const FORM_ID = 'vivero-embolsado-form'

function ViveroEmbolsadoScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loteId = Number(id)
  const [photos, setPhotos] = useState<Photo[]>([])
  const photosRef = useRef(photos)


  const { step, context, formValues, submitError, result, updateForm, loadContext, submit } =
  useEmbolsado()

  useEffect(() => {
    if (!Number.isFinite(loteId) || loteId <= 0) return
    void loadContext(loteId)
  }, [loteId, loadContext])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    },
    [],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void submit(loteId)
  }

  const unidadInicial = context?.unidad_medida_inicial ?? null
  const unidadInicialDisplay = formatUnidadCanonicaDisplay(
    context?.unidad_medida_inicial,
    context?.cantidad_inicial_en_proceso
  )
  const cantidadInicial = context?.cantidad_inicial_en_proceso ?? 0
  const maxPlantas = context 
    ? computeMaxPlantasEmbolsado(cantidadInicial, context.unidad_medida_inicial) 
    : 0
  const plantasDespues = Math.max(0, parseInt(formValues.plantasVivasIniciales, 10) || 0)
  const overMax = unidadInicial === 'UNIDAD' && plantasDespues > maxPlantas
  const overSuggestedMax = unidadInicial === 'G' && plantasDespues > maxPlantas
  const hasPhoto = formValues.fotos.length > 0
  const submitting = step === 'submitting'
  const today = todayLocalISO()
  const fechaValid =
    Boolean(formValues.fechaEvento) &&
    (!context?.fecha_inicio || formValues.fechaEvento >= context.fecha_inicio) &&
    formValues.fechaEvento <= today
  const cantidadValid = plantasDespues > 0 && !overMax && !overSuggestedMax
  const canSubmit = cantidadValid && fechaValid && hasPhoto
  const pendingMsg = !submitting && !canSubmit ? 'Completá los campos obligatorios.' : undefined
  // Atajos % solo tienen sentido cuando el cap es 1:1 con la cantidad inicial (UNIDAD).
  // Para G el cap es orientativo (cantidad×1000) y aplicar 25/50% de eso da números absurdos.
  const showQuickPercentages = unidadInicial === 'UNIDAD' && maxPlantas > 0

  function sanitizePlantasInput(raw: string): string {
    return raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
  }

  function handlePlantasChange(next: string) {
    updateForm({ plantasVivasIniciales: sanitizePlantasInput(next) })
  }

  function applyQuickPercentage(pct: number) {
    if (maxPlantas <= 0) return
    const next = Math.max(1, Math.round((maxPlantas * pct) / 100))
    updateForm({ plantasVivasIniciales: String(Math.min(maxPlantas, next)) })
  }

  function addPhotos(files: File[]) {
    const nextPhotos = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    const next = [...photos, ...nextPhotos].slice(0, 5)
    setPhotos(next)
    updateForm({ fotos: next.map((photo) => photo.file) })
  }

  function removePhoto(index: number) {
    const next = [...photos]
    const [removed] = next.splice(index, 1)
    if (removed) URL.revokeObjectURL(removed.previewUrl)
    setPhotos(next)
    updateForm({ fotos: next.map((photo) => photo.file) })
  }

  if (step === 'loading') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 pb-28">
        <div className="rounded-3xl bg-white px-6 py-8 text-center shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-brand-600">Verificando embolsado...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="relative min-h-screen bg-[#eef2ed]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-semibold text-red-500">
              {submitError ?? 'No se pudo cargar la información del lote.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'blocked') {
    return (
      <div className="relative min-h-screen bg-[#eef2ed]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-soft"
            >
              <Icon name="arrow-left" className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
                Embolsado
              </p>
              <h1 className="text-2xl font-extrabold text-brand-700">
                {context?.codigo_trazabilidad}
              </h1>
            </div>
          </div>
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Icon name="info" className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-brand-700">
              No se puede registrar el embolsado
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-600">
              {context?.motivo_bloqueo ?? 'El lote no permite esta acción en su estado actual.'}
            </p>
            {context?.evento_embolsado_existente && (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Embolsado existente
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {context.evento_embolsado_existente.cantidad_afectada} plantas ·{' '}
                  {context.evento_embolsado_existente.fecha_evento}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 w-full rounded-2xl bg-brand-700 py-3 text-sm font-extrabold text-white"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success' && result) {
    return (
      <div className="relative min-h-screen bg-[#eef2ed]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 pb-28">
          <div className="w-full rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-brand-700">Embolsado registrado</h2>
            <p className="mt-1 text-sm font-semibold text-brand-500">{result.codigo_trazabilidad}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-brand-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Plantas vivas</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-700">
                  {result.plantas_vivas_iniciales}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-emerald-600">Saldo vivo</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                  {result.saldo_vivo_despues}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/app/vivero/${result.lote_vivero_id}`, { replace: true })}
                className="w-full rounded-2xl bg-brand-700 py-3 text-sm font-extrabold text-white"
              >
                Ver detalle del lote
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/vivero', { replace: true })}
                className="w-full rounded-2xl bg-white py-3 text-sm font-extrabold text-brand-700 ring-1 ring-brand-200"
              >
                Volver a lotes
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#eef2ed] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
        {/* Header */}
        <div className="px-5 pt-10">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-soft transition hover:bg-white"
            >
              <Icon name="arrow-left" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-extrabold leading-tight text-brand-700">
                {context?.nombre_comercial_snapshot ||
                  context?.nombre_cientifico_snapshot ||
                  'Embolsado'}
              </h1>
              <p className="text-sm font-semibold text-brand-500">{context?.codigo_trazabilidad}</p>
            </div>
          </div>

          {/* Stage indicator tabs */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {STAGE_TABS.map((stage, i) => (
              <span
                key={stage}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  i === 0
                    ? 'bg-brand-700 text-white'
                    : 'bg-white/70 text-brand-400 ring-1 ring-brand-100'
                }`}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>

        <form id={FORM_ID} onSubmit={handleSubmit} className="mt-4 space-y-4 px-5 pb-[118px]">
          {/* Lote info card */}
          {context && (
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="leaf" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-400">
                  Lote de vivero
                </p>
                <p className="truncate text-sm font-extrabold text-brand-700">
                  {context.nombre_comercial_snapshot}
                </p>
                <p className="truncate text-xs font-semibold text-brand-500">
                  {context.cantidad_inicial_en_proceso} {unidadInicialDisplay} {context.tipo_material_snapshot}
                </p>
              </div>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-2.5 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <p className="text-xs font-semibold leading-relaxed text-blue-700">
              En esta etapa registramos las nuevas plantas que oficialmente son contadas.
            </p>
          </div>

          {/* Plantas vivas iniciales */}
          <div className="space-y-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Plantas vivas iniciales
            </p>

            <CantidadInputCard
              value={formValues.plantasVivasIniciales}
              onChange={handlePlantasChange}
              unidadDisplay={formatUnidadCanonicaDisplay('UNIDAD', plantasDespues)}
              label="Plantas embolsadas"
              inputMode="numeric"
              placeholder="0"
              hint={
                unidadInicial === 'G'
                  ? `Sin tope literal. Máx orientativo: ${maxPlantas} plantas para ${cantidadInicial} gr de semilla.`
                  : 'Solo enteros. 1 semilla / esqueje = máx 1 planta.'
              }
              disabled={submitting}
            />

            {unidadInicial === 'UNIDAD' && maxPlantas > 0 && (
              <SaldoMeter saldo={maxPlantas} cantidad={plantasDespues} unidad="UNIDAD" />
            )}

            {(overMax || overSuggestedMax) && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
                <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {overSuggestedMax
                    ? `Supera el tope orientativo de ${maxPlantas} plantas para ${cantidadInicial} gr de semilla. Revisá el conteo.`
                    : `No podés registrar más de ${maxPlantas} plantas (1:1 con la cantidad inicial).`}
                </span>
              </div>
            )}

            {showQuickPercentages && (
              <QuickPercentages
                percentages={[25, 50, 80, 100]}
                onApply={applyQuickPercentage}
                disabled={submitting}
              />
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 shadow-soft ring-1 ring-black/5">
            <Icon name="date" className="h-5 w-5 shrink-0 text-brand-400" />
            <input
              type="date"
              value={formValues.fechaEvento}
              onChange={(e) => updateForm({ fechaEvento: e.target.value })}
              min={context?.fecha_inicio}
              max={today}
              required
              disabled={step === 'submitting'}
              className="flex-1 border-none bg-transparent py-4 text-base font-semibold text-brand-700 outline-none disabled:opacity-50"
            />
          </div>

          {/* Photos */}
          <div className="rounded-2xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
            <FotosUploader
              photos={photos}
              onAdd={addPhotos}
              onRemove={removePhoto}
              required
              showError={Boolean(submitError) && !hasPhoto}
              errorMessage="Debes cargar entre 1 y 5 fotos para registrar el embolsado."
              disabled={submitting}
            />
          </div>

          {/* Observaciones */}
          <div>
            <p className="mb-2 text-sm font-bold text-brand-700">Observaciones</p>
            <textarea
              value={formValues.observaciones}
              onChange={(e) => updateForm({ observaciones: e.target.value })}
              maxLength={1000}
              rows={4}
              disabled={step === 'submitting'}
              placeholder="Acá escribes las notas mientras vas haciendo la recolección"
              className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-black/5 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
          </div>

          {submitError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <p className="text-sm font-semibold text-red-600">{submitError}</p>
            </div>
          )}

        </form>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[112px] z-40 px-5">
        <div className="pointer-events-auto mx-auto w-full max-w-md space-y-2 rounded-3xl bg-white/95 px-4 py-3 shadow-soft ring-1 ring-black/5 backdrop-blur">
          {canSubmit || submitting ? (
            <button
              type="submit"
              form={FORM_ID}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-extrabold text-white shadow-soft transition hover:bg-emerald-700 disabled:cursor-progress disabled:opacity-90"
            >
              {submitting ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden
                  />
                  <span>Registrando embolsado...</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  <span>Registrar embolsado</span>
                </>
              )}
            </button>
          ) : null}
          {pendingMsg && (
            <p className="text-center text-[11px] font-semibold text-brand-500">{pendingMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ViveroEmbolsadoScreen
