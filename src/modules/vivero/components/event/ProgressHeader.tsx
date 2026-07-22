import Icon from '../../../../components/Icon'
import type { StepStatus } from './SectionCard'

type Props = {
  steps: StepStatus[]
  onBack: () => void
  eyebrow: string
  title: string
  counterLabel?: string
}

function ProgressHeader({ steps, onBack, eyebrow, title, counterLabel = 'listos' }: Props) {
  const completed = steps.filter((s) => s.done).length
  return (
    <div className="sticky top-0 z-30 bg-brand-50/95 px-5 pb-4 pt-6 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-700 shadow-soft transition hover:bg-brand-50"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-500">
              {eyebrow}
            </p>
            <h1 className="truncate text-xl font-extrabold leading-tight text-brand-700">
              {title}
            </h1>
          </div>
          <div className="flex flex-col items-end leading-none">
            <span className="text-base font-extrabold text-brand-700">
              {completed}
              <span className="text-brand-400">/{steps.length}</span>
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-400">
              {counterLabel}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.done ? 'bg-success-500' : s.active ? 'bg-brand-500' : 'bg-brand-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProgressHeader
