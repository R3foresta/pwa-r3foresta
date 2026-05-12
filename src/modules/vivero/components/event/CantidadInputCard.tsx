type Props = {
  value: string
  onChange: (value: string) => void
  unidadDisplay: string
  label?: string
  hint?: string
  placeholder?: string
  inputMode?: 'numeric' | 'decimal'
  disabled?: boolean
  onBlur?: () => void
}

function CantidadInputCard({
  value,
  onChange,
  unidadDisplay,
  label = 'Cantidad',
  hint,
  placeholder = '0',
  inputMode = 'numeric',
  disabled = false,
  onBlur,
}: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
            {label}
          </p>
          <input
            type="text"
            inputMode={inputMode}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="mt-1 w-full border-none bg-transparent text-4xl font-extrabold text-brand-700 outline-none placeholder:text-brand-200 disabled:opacity-50"
          />
        </div>
        <span className="pb-2 text-base font-extrabold text-brand-500">{unidadDisplay}</span>
      </div>
      {hint && <p className="mt-1 text-[11px] font-semibold text-brand-500">{hint}</p>}
    </div>
  )
}

export default CantidadInputCard
