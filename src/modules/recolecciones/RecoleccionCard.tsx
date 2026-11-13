import { Link } from 'react-router-dom'
import Icon, { type IconName } from '../../components/Icon'
import { Badge, Card, statusVariant } from '../../components/ui'
import type { Recoleccion } from '../../services/recolecciones.service'
import { formatUnidadCanonicaDisplay } from '../../utils/recoleccionUnidad'
import { getUbicacionComunidadDisplay } from '../../utils/ubicacion'
import { resolveEstadoOperativo, resolveEstadoRegistro } from './recoleccionStatus'
import { getEstadoOperativoLabel, getEstadoRegistroDescription, getEstadoRegistroLabel } from './recoleccionStatusPresentation'

type Props = {
  recoleccion: Recoleccion
  compact?: boolean
  canEdit?: boolean
}

type RecoleccionCompat = Recoleccion & {
  estadoRegistro?: string | null
  estadoRegistroRecoleccion?: string | null
}

function formatDate(value: string) {
  if (Number.isNaN(Date.parse(value))) return 'No disponible'
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatCantidad(value: number | null | undefined, unidad: Recoleccion['unidad_canonica']) {
  if (value == null || !Number.isFinite(value) || unidad == null) return 'No disponible'
  const cantidad = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 6 }).format(value)
  return `${cantidad} ${formatUnidadCanonicaDisplay(unidad, value)}`
}

const ESTADO_ICONS: Readonly<Record<string, IconName>> = {
  BORRADOR: 'file',
  PENDIENTE_VALIDACION: 'date',
  RECHAZADO: 'note',
  VALIDADO: 'check-circle',
}

function RecoleccionCard({ recoleccion, compact = false, canEdit = false }: Props) {
  const nombreComercial = recoleccion.nombre_comercial || 'Sin nombre comercial'
  const recoleccionCompat = recoleccion as RecoleccionCompat
  const estadoRegistro = resolveEstadoRegistro(recoleccionCompat)
  const estadoOperativo = resolveEstadoOperativo(recoleccion)
  const motivoRechazo = estadoRegistro === 'RECHAZADO' ? recoleccion.motivo_rechazo?.trim() : null
  const recibida = estadoRegistro === 'VALIDADO' && recoleccion.recepcion_conforme === true
  const descripcionEstado = estadoRegistro === 'VALIDADO' && !recibida
    ? 'La recepción física no está acreditada en esta ficha.'
    : estadoRegistro === 'BORRADOR' && canEdit
      ? 'Puedes editarla antes de enviarla al vivero.'
      : recibida ? '' : getEstadoRegistroDescription(estadoRegistro)
  const fechaRecepcion = recibida && recoleccion.recepcion?.fecha_recepcion
    ? formatDate(recoleccion.recepcion.fecha_recepcion)
    : null
  const detallePath = `/app/collections/${recoleccion.id}`
  const editable = canEdit && (estadoRegistro === 'BORRADOR' || estadoRegistro === 'RECHAZADO')
  const actionPath = editable ? `/app/collections/new?editId=${recoleccion.id}` : detallePath
  const actionLabel = editable
    ? estadoRegistro === 'RECHAZADO' ? 'Corregir recolección' : 'Revisar y enviar'
    : 'Ver detalle'
  const estadoIcon = estadoRegistro === 'VALIDADO' && !recibida ? 'info' : ESTADO_ICONS[estadoRegistro] ?? 'info'
  const sinSaldo = estadoOperativo === 'CERRADO' && (recoleccion.estado_operativo != null || recoleccion.saldo_actual != null)
  const material = recoleccion.tipo_material === 'SEMILLA' ? 'Semilla' : recoleccion.tipo_material === 'ESQUEJE' ? 'Esqueje' : recoleccion.tipo_material

  const evidenciaPrincipal = recoleccion.evidencias?.find((item) => item.es_principal)
  const fallbackEvidencia = recoleccion.evidencias?.[0]
  const fotoPrincipal = recoleccion.fotos?.find((item) => item.es_principal)
  const fallbackFoto = recoleccion.fotos?.[0]
  const evidencia = evidenciaPrincipal || fallbackEvidencia
  const foto = fotoPrincipal || fallbackFoto
  const imageUrl = evidencia?.public_url ?? foto?.url ?? null
  const cantidadDeclarada = formatCantidad(recoleccion.cantidad_inicial_canonica, recoleccion.unidad_canonica)
  const cantidadPrincipal = recibida ? formatCantidad(recoleccion.saldo_actual, recoleccion.unidad_canonica) : cantidadDeclarada

  return (
    <Card as="article" padding={compact ? 'sm' : 'md'} className="transition hover:shadow-md">
      <Link to={detallePath} aria-label={`Ver detalle de ${recoleccion.codigo_trazabilidad}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {recoleccion.codigo_trazabilidad}
          </p>
          <h3 className="break-words text-lg font-extrabold text-neutral-800">{nombreComercial}</h3>

          <div className="mt-3 space-y-1 text-sm font-semibold text-neutral-600">
            <div className="flex items-start gap-2">
              <span aria-hidden="true"><Icon name="package" className="mt-1 h-4 w-4 text-brand-500" /></span>
              <div>
                <p className="text-xs font-medium text-neutral-500">{recibida ? 'Saldo en origen' : 'Cantidad declarada'}</p>
                <p className="font-bold text-neutral-700">{cantidadPrincipal}</p>
                {recibida && <p className="mt-0.5 text-xs font-medium text-neutral-500">Cantidad declarada: {cantidadDeclarada}</p>}
              </div>
            </div>
            <p className="flex items-center gap-2">
              <Icon name="date" className="h-4 w-4 text-brand-500" />
              <span className="sr-only">Fecha de recolección: </span>
              {formatDate(recoleccion.fecha)}
            </p>
            <p className="flex items-center gap-2">
              <Icon name="pin" className="h-4 w-4 text-brand-500" />
              <span>Origen: {getUbicacionComunidadDisplay(recoleccion.ubicacion)}</span>
            </p>
          </div>
        </div>

        {!compact && <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
          {imageUrl ? (
            <img src={imageUrl} alt={nombreComercial} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="photo" className="h-8 w-8 text-neutral-400" />
            </div>
          )}
        </div>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(estadoRegistro)}>
          <span aria-hidden="true"><Icon name={estadoIcon} className="h-4 w-4 shrink-0" /></span>
          {getEstadoRegistroLabel(estadoRegistro, recibida)}
        </Badge>
        <Badge variant="neutral" size="sm">{material}</Badge>
        {sinSaldo && <Badge variant={statusVariant(estadoOperativo)} size="sm">{getEstadoOperativoLabel(estadoOperativo)}</Badge>}
      </div>
      </Link>
      {descripcionEstado && <p className="mt-2 text-xs leading-relaxed text-neutral-600">{descripcionEstado}</p>}
      {estadoRegistro === 'RECHAZADO' && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-danger-700">
        <span className="font-semibold">Motivo de la corrección: </span>{motivoRechazo || 'No disponible.'}
      </p>}
      {(recibida || recoleccion.vivero?.nombre) && <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-neutral-600">
        <span aria-hidden="true"><Icon name="home" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /></span>
        <span>
          {recibida
            ? recoleccion.vivero?.nombre ? `Recibida en ${recoleccion.vivero.nombre}` : 'Vivero de recepción no disponible'
            : `${estadoRegistro === 'VALIDADO' ? 'Vivero asignado' : 'Destino previsto'}: ${recoleccion.vivero?.nombre}`}
          {fechaRecepcion && ` · Recibida el ${fechaRecepcion}`}
        </span>
      </p>}
      <div className="mt-3 flex justify-end">
        <Link to={actionPath} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-300 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          {actionLabel}<span aria-hidden="true"><Icon name="chevron-right" className="h-4 w-4" /></span>
        </Link>
      </div>
    </Card>
  )
}

export default RecoleccionCard
