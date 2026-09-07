import Icon, { type IconName } from '../../../components/Icon'
import { formatStockUnits, formatStockWeight } from '../../../config/recoleccionStock'

type Props = {
  gramos: number
  unidades: number
  pendientes: number
}

type Metric = {
  label: string
  value: string
  icon: IconName
}

function RecoleccionStockMetrics({ gramos, unidades, pendientes }: Props) {
  const metrics: Metric[] = [
    {
      label: 'Disponible en gramos',
      value: formatStockWeight(gramos),
      icon: 'leaf',
    },
    {
      label: 'Disponible en unidades',
      value: formatStockUnits(unidades),
      icon: 'box',
    },
    {
      label: 'Por validar',
      value: formatStockUnits(pendientes),
      icon: 'date',
    },
  ]

  return (
    <section aria-label="Resumen de disponibilidad" className="grid grid-cols-3 gap-2.5">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="flex min-h-36 flex-col items-center rounded-3xl bg-white px-2 py-4 text-center shadow-soft ring-1 ring-black/5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Icon name={metric.icon} className="h-5 w-5" />
          </span>
          <p className="mt-3 min-h-9 text-[11px] font-semibold leading-tight text-brand-600">
            {metric.label}
          </p>
          <p className="mt-auto whitespace-nowrap text-lg font-extrabold tabular-nums text-brand-700">
            {metric.value}
          </p>
        </article>
      ))}
    </section>
  )
}

export default RecoleccionStockMetrics
