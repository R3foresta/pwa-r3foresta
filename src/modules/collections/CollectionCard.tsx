import Icon from '../../components/Icon'
import type { CollectionRecord } from './types'

function CollectionCard({ record }: { record: CollectionRecord }) {
  return (
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
            {record.id}
          </h3>
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
            <Icon name="pin" className="h-4 w-4 text-brand-500" />
            <span>{record.location}</span>
          </div>
          <p className="text-base font-semibold text-slate-700">{record.species}</p>
          <p className="text-sm font-semibold text-slate-500">{record.quantity}</p>
        </div>
        <div className="flex items-center gap-2">
          {record.types.includes('seed') && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <Icon name="leaf" className="h-5 w-5" />
            </span>
          )}
          {record.types.includes('cutting') && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
              <Icon name="cutting" className="h-5 w-5" />
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 text-right text-sm font-semibold text-slate-500">
        {record.date}
      </div>
    </article>
  )
}

export default CollectionCard
