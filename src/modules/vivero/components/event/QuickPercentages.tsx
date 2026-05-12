type Props = {
  percentages: readonly number[]
  onApply: (pct: number) => void
  label?: string
  disabled?: boolean
}

function QuickPercentages({ percentages, onApply, label = 'Atajos rápidos', disabled = false }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-500">{label}</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${percentages.length}, minmax(0, 1fr))` }}
      >
        {percentages.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => onApply(pct)}
            disabled={disabled}
            className="rounded-2xl bg-white py-2.5 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pct}%
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickPercentages
