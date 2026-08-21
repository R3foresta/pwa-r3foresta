import Card from '../../../components/ui/Card'
import type { RecoleccionStockItem } from '../../../services/recolecciones.service'
import RecoleccionStockCard from './RecoleccionStockCard'

type Props = {
  items: RecoleccionStockItem[]
  limit?: number
  compact?: boolean
  onViewAll?: () => void
}

function RecoleccionStockPanel({ items, limit, compact = false, onViewAll }: Props) {
  const visibleItems = limit ? items.slice(0, limit) : items

  return (
    <section>
      <h2 className="text-lg font-extrabold text-brand-700">Disponibilidad por especie</h2>
      <Card padding="none" className="mt-3 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {visibleItems.map((item) => (
            <RecoleccionStockCard key={item.planta_id} item={item} compact={compact} />
          ))}
        </div>

        {onViewAll && (
          <div className="p-3 pt-2">
            <button
              type="button"
              onClick={onViewAll}
              className="w-full rounded-2xl bg-brand-50 px-4 py-3 text-sm font-extrabold text-brand-700 transition hover:bg-brand-100 active:scale-[0.99]"
            >
              Ver todas las especies
            </button>
          </div>
        )}
      </Card>
    </section>
  )
}

export default RecoleccionStockPanel
