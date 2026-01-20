import type { ViveroPhase } from './data'

export type ViveroLotCardData = {
  id: string
  codigo: string
  especie: string
  fuente: 'SEMILLA' | 'ESQUEJE'
  estado: ViveroPhase
  fechaInicio?: string
  diasDesdeInicio: number
  cantidadInicial: number
  germinadas: number
  muertas: number
  vivero: string
}

const estadoLabel: Record<ViveroPhase, string> = {
  INICIO: 'Germinación',
  EMBOLSADO: 'Embolsado',
  SOMBRA: 'Sombra',
  LISTA_PLANTAR: 'Listo para plantar',
  SALIDA_VIVERO: 'Salida vivero',
}

const estadoBadgeStyle: Record<ViveroPhase, { bg: string; text: string; border: string }> = {
  INICIO: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  EMBOLSADO: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  SOMBRA: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  LISTA_PLANTAR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SALIDA_VIVERO: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
}

function formatDate(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Props = {
  lot: ViveroLotCardData
  onClick?: () => void
}

function ViveroLotCard({ lot, onClick }: Props) {
  const supervivencia = Math.max(
    0,
    Math.round(((lot.cantidadInicial - lot.muertas) / lot.cantidadInicial) * 100),
  )
  const supervivenciaLabel =
    lot.estado === 'LISTA_PLANTAR' || lot.estado === 'SALIDA_VIVERO' ? 'final' : 'parcial'
  const badgeTone = estadoBadgeStyle[lot.estado]
  const isClickable = Boolean(onClick)
  const baseClass =
    'w-full rounded-3xl bg-white px-4 py-4 text-left shadow-soft ring-1 ring-black/5'
  const interactiveClass = isClickable ? ' transition hover:-translate-y-[2px] hover:shadow-md' : ''
  const wrapperClassName = `${baseClass}${interactiveClass}`

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
          {estadoLabel[lot.estado]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-semibold text-brand-600">
        <div className="rounded-2xl bg-brand-50 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-500">Cantidad inicial</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.cantidadInicial}</p>
        </div>
        <div className="rounded-2xl bg-brand-50 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-500">Días desde inicio</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.diasDesdeInicio}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
          <p className="text-xs uppercase tracking-wide text-brand-500">Germinadas</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.germinadas}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-brand-100">
          <p className="text-xs uppercase tracking-wide text-brand-500">Muertas</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">{lot.muertas}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-brand-700">
          Supervivencia {supervivenciaLabel} ({supervivencia}%):
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-black/5">
          <div
            className="h-full bg-[#9ed0ff]"
            style={{ width: `${Math.min(supervivencia, 100)}%` }}
          />
          <div
            className="h-full bg-slate-200"
            style={{ width: `${Math.max(0, 100 - supervivencia)}%` }}
          />
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
