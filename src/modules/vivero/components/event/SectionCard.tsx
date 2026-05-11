import Icon from '../../../../components/Icon'
import type { IconName } from '../../../../components/Icon'

export type StepStatus = { done: boolean; active: boolean }

type Props = {
  index: number
  total: number
  status: StepStatus
  icon: IconName
  title: string
  hint?: string
  badge?: React.ReactNode
  children: React.ReactNode
}

function SectionCard({ index, total, status, icon, title, hint, badge, children }: Props) {
  const ringTone = status.done
    ? 'ring-emerald-100'
    : status.active
      ? 'ring-brand-200'
      : 'ring-black/5'
  const badgeTone = status.done
    ? 'bg-emerald-500 text-white'
    : status.active
      ? 'bg-brand-500 text-white'
      : 'bg-brand-50 text-brand-600'

  return (
    <section className={`overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ${ringTone}`}>
      <header className="flex items-start gap-3 px-4 pt-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${badgeTone}`}>
          <Icon name={status.done ? 'check' : icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Paso {index} · {total}
          </p>
          <h2 className="text-base font-extrabold leading-tight text-brand-700">{title}</h2>
          {hint && <p className="mt-0.5 text-xs font-semibold text-brand-500">{hint}</p>}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  )
}

export default SectionCard
