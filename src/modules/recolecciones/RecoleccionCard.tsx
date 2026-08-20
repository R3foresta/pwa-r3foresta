import Icon from '../../components/Icon'
import { Badge, Card, statusVariant } from '../../components/ui'
import type { Recoleccion } from '../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay } from '../../utils/recoleccionUnidad'
import { getUbicacionComunidadDisplay } from '../../utils/ubicacion'
import { resolveEstadoOperativo, resolveEstadoRegistro } from './recoleccionStatus'

type Props = {
  recoleccion: Recoleccion
}

type RecoleccionCompat = Recoleccion & {
  estadoRegistro?: string | null
  estadoRegistroRecoleccion?: string | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function RecoleccionCard({ recoleccion }: Props) {
  const recoleccionCompat = recoleccion as RecoleccionCompat
  const nombreComercial =
    recoleccion.planta?.nombre_comun_principal ||
    recoleccion.nombre_comun_principal ||
    recoleccion.planta?.especie ||
    recoleccion.nombre_comercial ||
    'Sin nombre comercial'

  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico

  const evidenciaPrincipal = recoleccion.evidencias?.find((item) => item.es_principal)
  const fallbackEvidencia = recoleccion.evidencias?.[0]
  const fotoPrincipal = recoleccion.fotos?.find((item) => item.es_principal)
  const fallbackFoto = recoleccion.fotos?.[0]
  const evidencia = evidenciaPrincipal || fallbackEvidencia
  const foto = fotoPrincipal || fallbackFoto
  const imageUrl = evidencia?.public_url ?? foto?.url ?? null
  const estadoRegistro = resolveEstadoRegistro(recoleccionCompat)
  const estadoOperativo = resolveEstadoOperativo(recoleccion)
  const cantidadActual = recoleccion.saldo_actual ?? 0
  const unidadDisplay = formatUnidadCanonicaDisplay(recoleccion.unidad_canonica, cantidadActual)
  const evidenciasCount = recoleccion.evidencias?.length ?? recoleccion.fotos?.length ?? 0

  return (
    <Card as="article" className="transition hover:shadow-md">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {recoleccion.codigo_trazabilidad}
          </p>
          <h3 className="truncate text-lg font-extrabold text-neutral-800">{nombreComercial}</h3>
          <p className="truncate text-sm italic text-neutral-500">{nombreCientifico || 'Sin nombre científico'}</p>

          <div className="mt-3 space-y-1 text-sm font-semibold text-neutral-600">
            <p className="flex items-center gap-2">
              <Icon name="package" className="h-4 w-4 text-brand-500" />
              {cantidadActual} {unidadDisplay}
            </p>
            <p className="flex items-center gap-2">
              <Icon name="date" className="h-4 w-4 text-brand-500" />
              {formatDate(recoleccion.fecha)}
            </p>
            <p className="flex items-center gap-2">
              <Icon name="pin" className="h-4 w-4 text-brand-500" />
              {getUbicacionComunidadDisplay(recoleccion.ubicacion)}
            </p>
          </div>
        </div>

        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
          {imageUrl ? (
            <img src={imageUrl} alt={nombreComercial} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="photo" className="h-8 w-8 text-neutral-400" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={recoleccion.tipo_material === 'SEMILLA' ? 'success' : recoleccion.tipo_material === 'ESQUEJE' ? 'warning' : 'neutral'}>
          {recoleccion.tipo_material}
        </Badge>
        <Badge variant={statusVariant(estadoRegistro)}>{estadoRegistro}</Badge>
        <Badge variant={statusVariant(estadoOperativo)}>{estadoOperativo}</Badge>
        <Badge variant="neutral">Evidencias: {evidenciasCount}</Badge>
      </div>
    </Card>
  )
}

export default RecoleccionCard
