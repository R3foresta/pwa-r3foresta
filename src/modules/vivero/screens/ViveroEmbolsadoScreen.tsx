import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { useEmbolsado } from '../hooks/useEmbolsado'

function ViveroEmbolsadoScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const loteId = Number(id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const { step, context, formValues, submitError, result, updateForm, loadContext, submit } =
    useEmbolsado()

  useEffect(() => {
    if (!Number.isFinite(loteId) || loteId <= 0) return
    void loadContext(loteId)
  }, [loteId, loadContext])

  useEffect(() => {
    if (!formValues.foto) {
      setPhotoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formValues.foto)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formValues.foto])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateForm({ foto: e.target.files?.[0] ?? null })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void submit(loteId)
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
          <div className="w-full rounded-3xl bg-white p-6 shadow-soft ring-1 ring-black/5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
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
              <div className="rounded-2xl bg-brand-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-brand-500">Saldo vivo</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-700">
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
        <div className="flex items-start gap-3 px-5 pt-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
              Registrar evento
            </p>
            <h1 className="text-2xl font-extrabold text-brand-700">Embolsado</h1>
            {context && (
              <p className="text-sm font-semibold text-brand-500">
                {context.nombre_cientifico_snapshot || context.nombre_comercial_snapshot}
              </p>
            )}
          </div>
        </div>

        {context && (
          <div className="mx-5 mt-4 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Lote
              </span>
              <span className="text-xs font-bold text-brand-700">{context.codigo_trazabilidad}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-500">Cantidad inicial</span>
              <span className="text-xs font-bold text-brand-700">
                {context.cantidad_inicial_en_proceso} {context.unidad_medida_inicial}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 px-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-brand-700">
              Plantas vivas iniciales <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={formValues.plantasVivasIniciales}
              onChange={(e) => updateForm({ plantasVivasIniciales: e.target.value })}
              min={1}
              max={context?.cantidad_inicial_en_proceso}
              step={1}
              required
              disabled={step === 'submitting'}
              className="w-full rounded-2xl bg-white px-4 py-3 text-lg font-extrabold text-brand-700 shadow-soft ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
            {context && (
              <p className="mt-1 text-xs font-semibold text-brand-500">
                Máximo: {context.cantidad_inicial_en_proceso} {context.unidad_medida_inicial}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-brand-700">
              Fecha del evento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formValues.fechaEvento}
              onChange={(e) => updateForm({ fechaEvento: e.target.value })}
              min={context?.fecha_inicio}
              max={new Date().toISOString().split('T')[0]}
              required
              disabled={step === 'submitting'}
              className="w-full rounded-2xl bg-white px-4 py-3 text-base font-semibold text-brand-700 shadow-soft ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-brand-700">
              Foto del embolsado <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
              disabled={step === 'submitting'}
            />
            {photoPreviewUrl ? (
              <div className="relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/5">
                <img
                  src={photoPreviewUrl}
                  alt="Vista previa del embolsado"
                  className="h-48 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    updateForm({ foto: null })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={step === 'submitting'}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={step === 'submitting'}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-white px-4 py-6 text-brand-500 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
              >
                <Icon name="photo" className="h-6 w-6" />
                <span className="text-sm font-semibold">Seleccionar foto (JPG/PNG, máx. 5 MB)</span>
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-brand-700">
              Observaciones{' '}
              <span className="text-xs font-medium text-brand-400">(opcional)</span>
            </label>
            <textarea
              value={formValues.observaciones}
              onChange={(e) => updateForm({ observaciones: e.target.value })}
              maxLength={1000}
              rows={3}
              disabled={step === 'submitting'}
              placeholder="Condiciones del embolsado, notas relevantes..."
              className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-black/5 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            />
          </div>

          {submitError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <p className="text-sm font-semibold text-red-600">{submitError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'submitting'}
            className="w-full rounded-2xl bg-brand-700 py-4 text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {step === 'submitting' ? 'Registrando embolsado...' : 'Registrar Embolsado'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ViveroEmbolsadoScreen
