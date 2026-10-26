import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'

type Species = { id: string; nombre: string; nombre_cientifico?: string | null; cantidad_objetivo: number; porcentaje_objetivo: number }

export default function SubcampaniaSpeciesCard({ items, onEdit }: { items: Species[]; onEdit?: () => void }) {
  return (
    <section aria-label="Especies de plantas" className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-brand-100">
      <div className="flex items-center justify-between gap-3 border-b border-brand-100 bg-brand-50/60 p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100/70 text-brand-600">
            <Icon name="leaf" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold leading-snug text-brand-800">
              Especies de plantas
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
              {items.length} {items.length === 1 ? 'especie' : 'especies'} en el plan
            </p>
          </div>
        </div>
        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon="note"
            className="min-h-11 shrink-0 rounded-xl shadow-none"
            aria-label="Editar meta y especies"
            onClick={onEdit}
          >
            Editar
          </Button>
        )}
      </div>
      <ul className="divide-y divide-neutral-100 px-4">
        {items.map((meta) => {
          const pctObjetivo = Math.max(0, Math.min(100, meta.porcentaje_objetivo))
          return (
            <li key={meta.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-brand-800">{meta.nombre}</p>
                  {meta.nombre_cientifico && (
                    <p className="mt-0.5 break-words text-[11px] italic leading-relaxed text-neutral-500">
                      {meta.nombre_cientifico}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold leading-none tabular-nums text-brand-800">
                    {meta.cantidad_objetivo.toLocaleString('es-BO')}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-neutral-500">árboles</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-50">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${pctObjetivo}%` }}
                  />
                </div>
                <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-bold tabular-nums text-brand-600">
                  {pctObjetivo.toLocaleString('es-BO', { maximumFractionDigits: 2 })}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
