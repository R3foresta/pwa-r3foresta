import Icon from '../../../components/Icon'
import StatusBadge from '../../../components/ui/StatusBadge'
import {
  formatStockUnits,
  formatStockWeight,
  RECOLECCION_STOCK_LABELS,
  resolveStockAvailability,
} from '../../../config/recoleccionStock'
import type { RecoleccionStockItem } from '../../../services/recolecciones.service'

type Props = {
  item: RecoleccionStockItem
  compact?: boolean
}

function RecoleccionStockCard({ item, compact = false }: Props) {
  const title = item.nombre_comun_principal?.trim() || item.especie
  const scientificName = item.nombre_cientifico?.trim() || item.especie
  const availability = resolveStockAvailability(item)

  return (
    <article
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 bg-white min-[430px]:grid-cols-[minmax(0,1fr)_auto_auto] ${
        compact ? 'px-4 py-3' : 'px-4 py-4'
      }`}
    >
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-600">
          {item.imagen_url ? (
            <img
              src={item.imagen_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Icon name="leaf" className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-brand-700">{title}</h3>
          <p className="truncate text-xs font-medium italic text-brand-500">
            {scientificName}
          </p>
          {!compact && item.variedad && (
            <p className="mt-0.5 truncate text-[11px] text-neutral-500">{item.variedad}</p>
          )}
        </div>
      </div>

      <div className="col-span-2 col-start-1 row-start-2 grid shrink-0 grid-cols-2 divide-x divide-brand-100 justify-self-end text-center min-[430px]:col-span-1 min-[430px]:col-start-2 min-[430px]:row-start-1 min-[430px]:justify-self-auto">
        <div className="px-1.5">
          <p className="text-[10px] font-semibold text-brand-500">Gramos</p>
          <p className="mt-0.5 whitespace-nowrap text-sm font-extrabold tabular-nums text-brand-700">
            {formatStockWeight(item.gramos_disponibles)}
          </p>
        </div>
        <div className="px-1.5">
          <p className="text-[10px] font-semibold text-brand-500">Unidades</p>
          <p className="mt-0.5 text-sm font-extrabold tabular-nums text-brand-700">
            {formatStockUnits(item.unidades_disponibles)}
          </p>
        </div>
      </div>

      <StatusBadge
        status={availability}
        label={RECOLECCION_STOCK_LABELS[availability]}
        className="col-start-2 row-start-1 min-w-[78px] justify-center whitespace-nowrap min-[430px]:col-start-3"
      />
    </article>
  )
}

export default RecoleccionStockCard
