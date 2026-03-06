import Icon from '../../components/Icon'
import type { RecoleccionV2 } from '../../services/recolecciones-v2.service'
import { getUbicacionDisplay } from '../../utils/ubicacion'

type Props = {
  recoleccion: RecoleccionV2
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function materialBadgeClass(tipoMaterial: string) {
  switch (tipoMaterial) {
    case 'SEMILLA':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    case 'ESQUEJE':
      return 'bg-amber-50 text-amber-700 ring-amber-100'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

function RecoleccionV2Card({ recoleccion }: Props) {
  const nombreComercial =
    recoleccion.planta?.nombre_comun_principal ||
    recoleccion.planta?.especie ||
    recoleccion.nombre_comercial ||
    'Sin nombre comercial'

  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico

  const evidenciaPrincipal = recoleccion.evidencias?.find((item) => item.es_principal)
  const fallbackEvidencia = recoleccion.evidencias?.[0]
  const evidencia = evidenciaPrincipal || fallbackEvidencia
  const imageUrl = evidencia?.public_url ?? null

  return (
    <article className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 transition hover:shadow-md">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {recoleccion.codigo_trazabilidad}
          </p>
          <h3 className="truncate text-lg font-extrabold text-slate-800">{nombreComercial}</h3>
          <p className="truncate text-sm italic text-slate-500">{nombreCientifico || 'Sin nombre científico'}</p>

          <div className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
            <p className="flex items-center gap-2">
              <Icon name="package" className="h-4 w-4 text-brand-500" />
              {recoleccion.cantidad} {recoleccion.unidad}
            </p>
            <p className="flex items-center gap-2">
              <Icon name="date" className="h-4 w-4 text-brand-500" />
              {formatDate(recoleccion.fecha)}
            </p>
            <p className="flex items-center gap-2">
              <Icon name="pin" className="h-4 w-4 text-brand-500" />
              {getUbicacionDisplay(recoleccion.ubicacion)}
            </p>
          </div>
        </div>

        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          {imageUrl ? (
            <img src={imageUrl} alt={nombreComercial} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="photo" className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${materialBadgeClass(recoleccion.tipo_material)}`}>
          {recoleccion.tipo_material}
        </span>
        {recoleccion.estado_registro && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {recoleccion.estado_registro}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          Evidencias: {recoleccion.evidencias?.length ?? 0}
        </span>
      </div>
    </article>
  )
}

export default RecoleccionV2Card
