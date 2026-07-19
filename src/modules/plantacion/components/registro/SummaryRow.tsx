import Icon, { type IconName } from '../../../../components/Icon'

type Props = {
  icon: IconName
  label: string
  value: React.ReactNode
  accent?: 'brand' | 'amber' | 'emerald'
}

const ACCENTS: Record<NonNullable<Props['accent']>, string> = {
  brand: 'bg-brand-50 text-brand-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
}

/** Fila de resumen con icono, etiqueta eyebrow y valor. */
function SummaryRow({ icon, label, value, accent = 'brand' }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${ACCENTS[accent]}`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-500">
          {label}
        </p>
        <div className="text-sm font-extrabold text-brand-800">{value}</div>
      </div>
    </div>
  )
}

export default SummaryRow
