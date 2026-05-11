import type { UnidadMedidaVivero } from '../../types/contracts'
import { formatCantidadVivero } from '../../utils/format'

type Props = {
  saldo: number
  cantidad: number
  unidad: UnidadMedidaVivero
}

function SaldoMeter({ saldo, cantidad, unidad }: Props) {
  const ratio = saldo > 0 ? Math.max(0, cantidad / saldo) : 0
  const pct = Math.round(Math.min(1, ratio) * 100)
  const overLimit = ratio > 1
  const tone = overLimit
    ? 'bg-red-500'
    : ratio >= 0.9
      ? 'bg-amber-400'
      : ratio > 0
        ? 'bg-emerald-500'
        : 'bg-brand-200'

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between text-[11px] font-bold text-brand-500">
        <span>{overLimit ? 'Excede el saldo disponible' : `Usando ${pct}% del saldo`}</span>
        <span className="text-brand-700">
          {formatCantidadVivero(Math.min(cantidad, saldo), unidad)} /{' '}
          {formatCantidadVivero(saldo, unidad)} {unidad}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

export default SaldoMeter
