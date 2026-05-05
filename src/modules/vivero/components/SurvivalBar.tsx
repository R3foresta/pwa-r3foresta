type Props = {
  alive: number | null
  initial: number | null
  showLabel?: boolean
  className?: string
}

function getTone(pct: number) {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
  if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-600' }
  return { bar: 'bg-red-500', text: 'text-red-600' }
}

function SurvivalBar({ alive, initial, showLabel = false, className }: Props) {
  const hasData =
    alive !== null && initial !== null && initial > 0 && Number.isFinite(alive) && Number.isFinite(initial)
  const ratio = hasData ? Math.max(0, Math.min(1, alive / initial)) : 0
  const pct = Math.round(ratio * 100)
  const tone = hasData ? getTone(pct) : { bar: 'bg-slate-300', text: 'text-slate-500' }

  return (
    <div className={`w-full ${className ?? ''}`}>
      {showLabel && (
        <div className="mb-1 flex items-end justify-between text-[11px] font-bold">
          <span className="uppercase tracking-wider text-brand-500">Supervivencia</span>
          <span className={tone.text}>{hasData ? `${pct}%` : '—'}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-black/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
          style={{ width: hasData ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  )
}

export default SurvivalBar
