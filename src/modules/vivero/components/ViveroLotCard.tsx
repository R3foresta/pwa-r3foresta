import type { ViveroLotCardData } from '../types/view-models'

const estadoLabel = {
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
} as const

const estadoBadgeStyle = {
  ACTIVO: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FINALIZADO: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
} as const

function formatDate(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatQuantity(value: number | null, unit: string) {
  if (value === null) return 'Pendiente'
  return `${value} ${unit}`
}

function getBalanceTone(ratio: number | null): string {
  if (ratio === null) return 'bg-slate-200'
  if (ratio >= 70) return 'bg-emerald-300'
  if (ratio >= 40) return 'bg-amber-300'
  return 'bg-red-300'
}

type Props = {
  lot: ViveroLotCardData
  onClick?: () => void
}

function ViveroLotCard({ lot, onClick }: Props) {
  const badgeTone = estadoBadgeStyle[lot.estadoLote]
  const isClickable = Boolean(onClick)
  const baseClass =
    'w-full rounded-3xl bg-white px-4 py-4 text-left shadow-soft ring-1 ring-black/5'
  const interactiveClass = isClickable ? ' transition hover:-translate-y-[2px] hover:shadow-md' : ''
  const wrapperClassName = `${baseClass}${interactiveClass}`

  const progressRatio =
    lot.cantidadActual !== null && lot.cantidadInicial > 0
      ? Math.max(0, Math.min(100, Math.round((lot.cantidadActual / lot.cantidadInicial) * 100)))
      : null

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold leading-tight">{lot.especie}</h2>
          <p className="text-sm font-semibold text-brand-500">{lot.codigo}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold ${badgeTone.bg} ${badgeTone.text} ${badgeTone.border}`}
        >
          {estadoLabel[lot.estadoLote]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
        <div className="rounded-2xl bg-brand-50 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-500">Cantidad inicial</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">
            {lot.cantidadInicial} {lot.unidadMedida}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-500">Días desde inicio</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.diasDesdeInicio}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
          <p className="text-xs uppercase tracking-wide text-brand-500">Saldo vivo actual</p>
          <p className="mt-1 text-xl font-extrabold text-brand-700">
            {formatQuantity(lot.cantidadActual, lot.unidadMedida)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
          <p className="text-xs uppercase tracking-wide text-brand-500">Subetapa</p>
          <p className="mt-1 text-xl font-extrabold text-brand-700">
            {lot.subetapaActual ?? 'Sin definir'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-brand-700">
          Balance vivo {progressRatio === null ? '(pendiente)' : `(${progressRatio}%)`}:
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-black/5">
          <div
            className={`h-full ${getBalanceTone(progressRatio)}`}
            style={{ width: `${progressRatio ?? 0}%` }}
          />
          <div className="h-full bg-slate-200" style={{ width: `${100 - (progressRatio ?? 0)}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-brand-700">
        <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
          {lot.fuente === 'SEMILLA' ? 'Semilla' : 'Esqueje'}
        </span>
        <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
          {formatDate(lot.fechaInicio)}
        </span>
        <span className="flex items-center justify-center rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-brand-100">
          {lot.vivero}
        </span>
      </div>
    </>
  )

  if (isClickable) {
    return (
      <button type="button" onClick={onClick} className={wrapperClassName}>
        {content}
      </button>
    )
  }

  return <div className={wrapperClassName}>{content}</div>
}

export default ViveroLotCard
