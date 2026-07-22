import Icon from '../../../../components/Icon'

type Props = {
  value: string
  onChange: (value: string) => void
  max: number | null
  min?: number
  label: string
  unit: string
  quickPercentages?: number[]
  /**
   * Si se pasa, aparecen dos botones extra (−N y +N) que saltan en grupos
   * de `bigStepSize` unidades. Útil para lotes grandes donde +1 es lento.
   */
  bigStepSize?: number
  showError?: boolean
  errorMessage?: string
  hint?: string
  disabled?: boolean
}

function sanitizeInteger(raw: string): string {
  return raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
}

function clampInt(n: number, min: number, max: number | null): number {
  let v = Math.max(min, Math.trunc(n))
  if (max !== null) v = Math.min(max, v)
  return v
}

function CantidadStepper({
  value,
  onChange,
  max,
  min = 0,
  label,
  unit,
  quickPercentages,
  bigStepSize,
  showError = false,
  errorMessage,
  hint,
  disabled = false,
}: Props) {
  const numeric = Number(value)
  const safeNumeric = Number.isFinite(numeric) ? numeric : 0

  const step = (delta: number) => {
    const next = clampInt(safeNumeric + delta, min, max)
    onChange(String(next))
  }

  const handleChange = (raw: string) => {
    onChange(sanitizeInteger(raw))
  }

  const applyPercentage = (pct: number) => {
    if (max === null || max <= 0) return
    const target = Math.round((max * pct) / 100)
    onChange(String(clampInt(target, Math.max(min, 1), max)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <p className="text-sm font-extrabold text-brand-700">{label}</p>
        {max !== null && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
            Máx {max}
          </span>
        )}
      </div>

      <div className="flex items-stretch overflow-hidden rounded-2xl border border-brand-100 bg-white">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || safeNumeric <= min}
          aria-label="Restar 1"
          className="flex w-14 items-center justify-center text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="minus" className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center justify-center border-x border-brand-100 px-2 py-3">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            disabled={disabled}
            placeholder="0"
            className="w-full border-none bg-transparent text-center text-3xl font-extrabold text-brand-700 outline-none placeholder:text-brand-200 disabled:opacity-50"
          />
          <span className="ml-1 text-xs font-bold uppercase tracking-wider text-brand-500">
            {unit}
          </span>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || (max !== null && safeNumeric >= max)}
          aria-label="Sumar 1"
          className="flex w-14 items-center justify-center text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="plus" className="h-6 w-6" />
        </button>
      </div>

      {bigStepSize && bigStepSize > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => step(-bigStepSize)}
            disabled={disabled || safeNumeric <= min}
            aria-label={`Restar ${bigStepSize}`}
            className="rounded-2xl bg-white py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            − {bigStepSize}
          </button>
          <button
            type="button"
            onClick={() => step(bigStepSize)}
            disabled={disabled || (max !== null && safeNumeric >= max)}
            aria-label={`Sumar ${bigStepSize}`}
            className="rounded-2xl bg-white py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + {bigStepSize}
          </button>
        </div>
      )}

      {quickPercentages && max !== null && max > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {quickPercentages.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPercentage(pct)}
              disabled={disabled}
              className="rounded-2xl bg-white py-2 text-xs font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pct}%
            </button>
          ))}
        </div>
      )}

      {hint && !showError && (
        <p className="text-[11px] font-semibold text-brand-500">{hint}</p>
      )}

      {showError && errorMessage && (
        <p className="text-xs font-semibold text-danger-500">{errorMessage}</p>
      )}
    </div>
  )
}

export default CantidadStepper
