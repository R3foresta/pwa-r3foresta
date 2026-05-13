import Icon from '../../../../components/Icon'

type Props = {
  value: string
  onChange: (value: string) => void
  min: string
  max: string
  showError?: boolean
  errorMessage?: string
  hint?: string
  label?: string
  disabled?: boolean
  /** Skip the component's own label/hint header. Use when wrapping in another card (e.g. SectionCard) that already provides the title. */
  headerless?: boolean
}

function FechaCard({
  value,
  onChange,
  min,
  max,
  showError = false,
  errorMessage,
  hint,
  label = 'Fecha del evento',
  disabled = false,
  headerless = false,
}: Props) {
  return (
    <div className="space-y-2">
      {!headerless && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-brand-700">{label}</p>
          {hint && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              {hint}
            </span>
          )}
        </div>
      )}
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 transition ${
          showError ? 'border-red-300 bg-red-50' : 'border-brand-100 bg-brand-50'
        }`}
      >
        <Icon name="date" className="h-5 w-5 shrink-0 text-brand-500" />
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full border-none bg-transparent py-3.5 text-base font-bold text-brand-700 outline-none disabled:opacity-50"
        />
      </div>
      {showError && errorMessage && (
        <p className="text-xs font-semibold text-red-500">{errorMessage}</p>
      )}
    </div>
  )
}

export default FechaCard
