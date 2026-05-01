export type StageTimelineItem = {
  key: string
  label: string
  done: boolean
  active: boolean
  date: string | null
  hasMermaRisk?: boolean
  subStates?: { key: string; label: string; active: boolean }[]
}

type Props = {
  stages: StageTimelineItem[]
}

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SUBETAPA_LABELS: Record<string, string> = {
  SOMBRA: 'Sombra',
  MEDIA_SOMBRA: 'Media sombra',
  SOL_DIRECTO: 'Sol directo',
}

function StageTimeline({ stages }: Props) {
  return (
    <div>
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1
        const formattedDate = formatDate(stage.date)

        return (
          <div key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  stage.done
                    ? 'bg-emerald-100 text-emerald-700'
                    : stage.active
                      ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {stage.done ? '✓' : stage.active ? '▶' : '○'}
              </div>
              {!isLast && (
                <div
                  className={`mt-1 w-0.5 flex-1 ${stage.done ? 'bg-emerald-200' : 'bg-slate-200'}`}
                  style={{ minHeight: '20px' }}
                />
              )}
            </div>

            <div className="pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-base font-bold ${
                    stage.done || stage.active ? 'text-brand-700' : 'text-brand-400'
                  }`}
                >
                  {stage.label}
                </span>
                {stage.hasMermaRisk && stage.active && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500 ring-1 ring-red-200">
                    merma posible
                  </span>
                )}
              </div>

              {formattedDate ? (
                <p className="text-xs font-semibold text-brand-500">{formattedDate}</p>
              ) : !stage.done && !stage.active ? (
                <p className="text-xs font-semibold text-brand-400">Pendiente</p>
              ) : null}

              {stage.subStates && stage.subStates.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {stage.subStates.map((sub, i) => (
                    <div key={sub.key} className="flex items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          sub.active
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {SUBETAPA_LABELS[sub.key] ?? sub.label}
                      </span>
                      {i < stage.subStates!.length - 1 && (
                        <span className="text-xs text-slate-400">›</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StageTimeline
