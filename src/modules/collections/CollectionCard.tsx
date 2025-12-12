import Icon from "../../components/Icon";
import { locationsById, nurseriesById, plantsById } from "./data";
import type { CollectionRecord, MaterialType, RecordStatus } from "./types";

function CollectionCard({ record }: { record: CollectionRecord }) {
  const plant = plantsById[record.plantId];
  const location = locationsById[record.collectionLocationId];
  const nursery = nurseriesById[record.storageNurseryId];

  const materialTypes = Array.from(
    new Set(record.materials.map((material) => material.materialType)),
  ) as MaterialType[];

  const getTypeStyles = (type: MaterialType) => {
    switch (type) {
      case 'seed':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
      case 'cutting':
        return 'bg-orange-50 text-orange-700 ring-orange-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  const getStatusStyles = (status: RecordStatus) => {
    switch (status) {
      case 'stored':
        return 'bg-green-50 text-green-700 ring-green-100';
      case 'used':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'discarded':
        return 'bg-red-50 text-red-700 ring-red-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  const formatQuantity = (material: CollectionRecord['materials'][number]) => {
    const unitLabel = material.quantity.unit === 'kg' ? 'kg' : 'unidades';
    const typeLabel = material.materialType === 'seed' ? 'Semilla' : 'Esqueje';
    return `${material.quantity.value} ${unitLabel} · ${typeLabel}`;
  };

  const mainPhoto = record.photos[0]?.url;

  return (
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800">
            {record.code}
          </h3>
          <p className="text-base font-semibold text-slate-700">
            {plant?.commonName ?? plant?.scientificName ?? 'Sin especie'}
          </p>
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="package" className="h-4 w-4 text-brand-500" />
                <p className="text-sm font-semibold text-slate-500">
                  {record.materials.map(formatQuantity).join(' + ')}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{location?.community ?? 'Sin ubicación'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="date" className="h-4 w-4 text-brand-500" />
                <span>{record.date}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{nursery?.name ?? 'Sin vivero'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={record.code}
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
      <div className="mt-3 flex flex-wrap gap-2">
        {materialTypes.map((type) => (
          <span
            key={`type-${type}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getTypeStyles(type)}`}
          >
            {type === 'seed' ? 'Semilla' : 'Esqueje'}
          </span>
        ))}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusStyles(record.status)}`}
        >
          {record.status === 'stored'
            ? 'Almacenado'
            : record.status === 'used'
              ? 'Usado'
              : 'Desechado'}
        </span>
      </div>
    </article>
  );
}

export default CollectionCard;
