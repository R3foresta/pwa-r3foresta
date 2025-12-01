import Icon from "../../components/Icon";
import type { CollectionRecord, CollectionType, CollectionEstado } from "./types";

function CollectionCard({ record }: { record: CollectionRecord }) {
  // Función para obtener los estilos del tipo
  const getTypeStyles = (type: CollectionType) => {
    switch (type) {
      case 'Semilla':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
      case 'Esqueje':
        return 'bg-orange-50 text-orange-700 ring-orange-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  // Función para obtener los estilos del estado
  const getEstadoStyles = (estado: CollectionEstado) => {
    switch (estado) {
      case 'Alamacenado':
        return 'bg-green-50 text-green-700 ring-green-100';
      case 'Usado':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'Vencido':
        return 'bg-orange-50 text-orange-700 ring-orange-100';
      case 'Perdidido':
      case 'Desechado':
        return 'bg-red-50 text-red-700 ring-red-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

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
      <div className="mt-3 flex flex-wrap gap-2">
        {record.types.map((type, index) => (
          <span 
            key={`type-${index}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getTypeStyles(type)}`}
          >
            {type}
          </span>
        ))}
        {record.estado?.map((estado, index) => (
          <span 
            key={`estado-${index}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getEstadoStyles(estado)}`}
          >
            {estado}
          </span>
        ))}
      </div>
    </article>
  );
}

export default CollectionCard;
