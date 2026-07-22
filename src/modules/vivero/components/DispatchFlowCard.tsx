import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotDetailView } from '../types/view-models'
import {
  DISPATCH_FLOW_DESCRIPTION,
  DISPATCH_FLOW_LABEL,
  getDispatchFlowStatus,
  type DispatchFlowStatus,
} from '../utils/dispatchFlow'

type Props = {
  detail: ViveroLotDetailView
}

const STEPS: Array<{ key: DispatchFlowStatus; icon: IconName }> = [
  { key: 'LOTE_EN_VIVERO', icon: 'vivero' },
  { key: 'LISTO_PARA_DESPACHO', icon: 'truck' },
  { key: 'ASIGNADO_A_DESTINO', icon: 'pin' },
]

function DispatchFlowCard({ detail }: Props) {
  const current = getDispatchFlowStatus(detail)
  const currentIndex = STEPS.findIndex((step) => step.key === current)

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
            Flujo despacho-asignacion
          </p>
          <h2 className="mt-1 text-base font-extrabold text-brand-800">
            {DISPATCH_FLOW_LABEL[current]}
          </h2>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-neutral-500">
            {DISPATCH_FLOW_DESCRIPTION[current]}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon name={STEPS[currentIndex]?.icon ?? 'package'} className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <div
              key={step.key}
              className={`min-h-[86px] rounded-2xl px-2.5 py-3 ring-1 transition ${
                active
                  ? 'bg-brand-700 text-white ring-brand-800'
                  : done
                    ? 'bg-success-50 text-success-800 ring-success-100'
                    : 'bg-neutral-50 text-neutral-500 ring-neutral-100'
              }`}
            >
              <div
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full ${
                  active ? 'bg-white/15' : done ? 'bg-success-100' : 'bg-white'
                }`}
              >
                <Icon name={done ? 'check' : step.icon} className="h-3.5 w-3.5" />
              </div>
              <p className="text-[10px] font-extrabold leading-tight">
                {DISPATCH_FLOW_LABEL[step.key]}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default DispatchFlowCard
