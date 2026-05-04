const DOT_COUNT = 10

type Props = {
  value: number | null
  total: number
  className?: string
}

function DotProgressBar({ value, total, className }: Props) {
  const ratio = value !== null && total > 0 ? value / total : null
  const filledCount = ratio !== null ? Math.round(ratio * DOT_COUNT) : 0
  const dotColor =
    ratio === null
      ? 'bg-slate-300'
      : ratio >= 0.7
        ? 'bg-emerald-400'
        : ratio >= 0.4
          ? 'bg-amber-400'
          : 'bg-red-400'

  return (
    <div className={`flex gap-1 ${className ?? ''}`}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < filledCount ? dotColor : 'bg-slate-200'}`}
        />
      ))}
    </div>
  )
}

export default DotProgressBar
