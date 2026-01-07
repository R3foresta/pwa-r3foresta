import Icon from "../../components/Icon";
import type { Recoleccion } from "../../services/recoleccion.service";

function CollectionCard({ recoleccion }: { recoleccion: Recoleccion }) {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'SEMILLA':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
      case 'ESTACA':
        return 'bg-orange-50 text-orange-700 ring-orange-100';
      case 'PLANTULA':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'INJERTO':
        return 'bg-purple-50 text-purple-700 ring-purple-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'ALMACENADO':
        return 'bg-green-50 text-green-700 ring-green-100';
      case 'EN_PROCESO':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-100';
      case 'UTILIZADO':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'DESCARTADO':
        return 'bg-red-50 text-red-700 ring-red-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  const getTipoMaterialLabel = (tipo: string) => {
    switch (tipo) {
      case 'SEMILLA': return 'Semilla';
      case 'ESTACA': return 'Esqueje';
      case 'PLANTULA': return 'Plántula';
      case 'INJERTO': return 'Injerto';
      default: return tipo;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'ALMACENADO': return 'Almacenado';
      case 'EN_PROCESO': return 'En Proceso';
      case 'UTILIZADO': return 'Utilizado';
      case 'DESCARTADO': return 'Descartado';
      default: return estado;
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const nombrePlanta = recoleccion.planta?.especie || recoleccion.nombre_comercial || 'Sin especie';
  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico;
  const mainPhoto = recoleccion.fotos[0]?.url;

  return (
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-800">
            {nombrePlanta}
          </h3>
          {nombreCientifico && (
            <p className="text-sm font-medium italic text-slate-600">
              {nombreCientifico}
            </p>
          )}
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="package" className="h-4 w-4 text-brand-500" />
              <span>{recoleccion.cantidad} {recoleccion.unidad}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="pin" className="h-4 w-4 text-brand-500" />
              <span>
                {recoleccion.ubicacion.comunidad || recoleccion.ubicacion.provincia || recoleccion.ubicacion.departamento || 'Sin ubicación'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="date" className="h-4 w-4 text-brand-500" />
              <span>{formatFecha(recoleccion.fecha)}</span>
            </div>
            {recoleccion.vivero && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{recoleccion.vivero.nombre}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={nombrePlanta}
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
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getTypeStyles(recoleccion.tipo_material)}`}
        >
          {getTipoMaterialLabel(recoleccion.tipo_material)}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusStyles(recoleccion.estado)}`}
        >
          {getEstadoLabel(recoleccion.estado)}
        </span>
        {recoleccion.fotos.length > 1 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            📸 {recoleccion.fotos.length}
          </span>
        )}
        {recoleccion.especie_nueva && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            ✨ Nuevo hallazgo
          </span>
        )}
      </div>
    </article>
  );
}

export default CollectionCard;
