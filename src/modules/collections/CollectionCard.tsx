import Icon from "../../components/Icon";
import type { CollectionRecord } from "./types";

function CollectionCard({ record }: { record: CollectionRecord }) {
  return (
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
            {record.id}
          </h3>
          <p className="text-base font-semibold text-slate-700">
            {record.species}
          </p>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="package" className="h-4 w-4 text-brand-500" />
                <p className="text-sm font-semibold text-slate-500">
                  {record.quantity}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{record.locationRecolecion}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="date" className="h-4 w-4 text-brand-500" />
                <span>{record.date}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{record.locationAlmacenado}</span>
              </div>
            </div>
            
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
            {record.imageUrl ? (
              <img 
                src={record.imageUrl} 
                alt={record.species}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Icon name="photo" className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default CollectionCard;
