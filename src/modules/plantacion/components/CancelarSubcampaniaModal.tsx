import { useState } from 'react'
import Icon from '../../../components/Icon'

type Props = {
  open: boolean
  subcampaniaNombre: string
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (motivo: string) => void
}

const MIN_MOTIVO = 3
const MAX_MOTIVO = 1000

function CancelarSubcampaniaModal({
  open,
  subcampaniaNombre,
  submitting,
  error,
  onClose,
  onConfirm,
}: Props) {
  const [motivo, setMotivo] = useState('')

  // El modal se desmonta cuando open=false (return null), por lo que el motivo
  // se resetea naturalmente al reabrirlo — sin necesidad de un effect.
  if (!open) return null

  const motivoTrim = motivo.trim()
  const motivoLen = motivoTrim.length
  const canConfirm = motivoLen >= MIN_MOTIVO && motivoLen <= MAX_MOTIVO && !submitting

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(motivoTrim)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancelar-subcampania-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:px-4"
    >
      <div className="flex w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-red-500">
              Cancelar subcampaña
            </p>
            <h2
              id="cancelar-subcampania-title"
              className="mt-1 truncate text-lg font-extrabold text-brand-800"
            >
              {subcampaniaNombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 pt-4">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-3 ring-1 ring-red-100">
            <Icon name="info" className="h-5 w-5 shrink-0 text-red-600" />
            <p className="text-[12px] font-bold leading-snug text-red-900">
              La subcampaña quedará <strong>CANCELADA</strong>. Se conserva el registro pero
              deja de ser visible y no se puede reabrir. Las asignaciones de vivero activas
              se liberan automáticamente.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej. Cambio de prioridad institucional."
              maxLength={MAX_MOTIVO}
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1 flex items-center justify-between text-[10.5px] font-bold text-slate-400">
              <span>Mínimo {MIN_MOTIVO} caracteres.</span>
              <span className="tabular-nums">
                {motivoLen}/{MAX_MOTIVO}
              </span>
            </p>
          </div>

          {error && (
            <p className="whitespace-pre-line rounded-2xl bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-2 px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-brand-700 shadow-soft ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            No, volver
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold text-white shadow-soft transition active:scale-[0.99] ${
              !canConfirm ? 'cursor-not-allowed bg-slate-400/70' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? 'Cancelando…' : 'Sí, cancelar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default CancelarSubcampaniaModal
