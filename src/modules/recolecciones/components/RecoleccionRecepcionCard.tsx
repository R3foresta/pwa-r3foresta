import { useId, useState } from 'react'
import Icon from '../../../components/Icon'
import { Badge, Button, Card, statusVariant } from '../../../components/ui'
import type { DetalleRecepcion, OrigenRecepcion } from '../../vivero/recepcion/recepcion.contract'
import { getEstadoRegistroLabel } from '../recoleccionStatusPresentation'
import { formatRecoleccionDate, formatRecoleccionDateTime } from '../recoleccionPresentation'
import RecoleccionEvidencias from './RecoleccionEvidencias'

type Props = {
  item: OrigenRecepcion
  detalle?: DetalleRecepcion
  error?: string
  loading?: boolean
  busy?: boolean
  canReceive?: boolean
  canReject?: boolean
  ownCollection?: boolean
  showActions?: boolean
  viveroNombre?: string
  metodoNombre?: string
  onReceive?: () => void
  onReject?: () => void
  onRetry?: () => void
}

const fecha = (value: string) => value.includes('T') ? formatRecoleccionDateTime(value) : formatRecoleccionDate(value)

export default function RecoleccionRecepcionCard({ item, detalle, error, loading, busy, canReceive, canReject, ownCollection, showActions = true, viveroNombre, metodoNombre, onReceive, onReject, onRetry }: Props) {
  const [expanded, setExpanded] = useState(false)
  const detailId = useId()
  const nombre = item.nombre_comercial_snapshot ?? item.nombre_cientifico_snapshot ?? 'Especie no disponible'
  const fotos = detalle?.evidencias ?? []
  const foto = fotos[0]
  const ubicacion = detalle?.ubicacion
  const motivoRechazo = item.estado_registro === 'RECHAZADO' ? item.motivo_rechazo?.trim() : null

  return (
    <Card as="article" padding="none" className="overflow-hidden">
      <button type="button" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded(value => !value)} className="w-full p-4 text-left transition hover:bg-neutral-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{item.codigo_trazabilidad}</p>
            <h3 className="truncate text-lg font-extrabold text-neutral-800">{nombre}</h3>
            <p className="truncate text-sm italic text-neutral-500">{item.nombre_cientifico_snapshot ?? 'Sin nombre científico'}</p>
            <div className="mt-3 space-y-1 text-sm font-semibold text-neutral-600">
              <p className="flex items-center gap-2"><Icon name="package" className="h-4 w-4 text-brand-500" />{item.cantidad_declarada} {item.unidad_declarada}</p>
              <p className="flex items-center gap-2"><Icon name="date" className="h-4 w-4 text-brand-500" />{fecha(item.fecha_recoleccion)}</p>
              <p className="flex items-center gap-2"><Icon name="pin" className="h-4 w-4 shrink-0 text-brand-500" /><span className="truncate">{ubicacion?.nombre ?? (loading ? 'Cargando ubicación…' : 'Ubicación no disponible')}</span></p>
            </div>
          </div>
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            {foto ? <img src={foto.public_url} alt={foto.titulo ?? nombre} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Icon name="photo" className="h-8 w-8 text-neutral-400" /></div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={item.tipo_material === 'SEMILLA' ? 'success' : 'warning'}>{item.tipo_material}</Badge>
          <Badge variant={statusVariant(item.estado_registro)}>{getEstadoRegistroLabel(item.estado_registro, item.recepcion !== null)}</Badge>
          {detalle && <Badge variant="neutral">Evidencias: {fotos.length}</Badge>}
          <Icon name="chevron-down" className={`ml-auto h-4 w-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {item.estado_registro === 'PENDIENTE_VALIDACION' && <p className="px-4 pb-3 text-xs font-semibold text-neutral-600">El vivero debe revisar la ficha y confirmar el material recibido.</p>}
      {motivoRechazo && <p className="px-4 pb-3 text-sm font-semibold text-danger-700">Motivo de corrección: {motivoRechazo}</p>}
      {item.recepcion && <p className="px-4 pb-3 text-xs font-semibold text-neutral-600">Recibida en {viveroNombre ?? `Vivero ${item.vivero_id}`} · {fecha(item.recepcion.fecha_recepcion)}</p>}
      {loading && <p role="status" className="px-4 pb-3 text-xs font-semibold text-neutral-500">Cargando datos y fotos autorizadas…</p>}
      {error && <div className="space-y-2 border-t border-danger-100 bg-danger-50 p-4"><p role="alert" className="text-sm text-danger-700">{error}</p><Button variant="secondary" size="sm" onClick={onRetry}>Reintentar detalle</Button></div>}

      <div id={detailId} hidden={!expanded}>{expanded && detalle && <div className="space-y-3 border-t border-neutral-100 px-4 pb-4 pt-3">
        <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
          <h4 className="text-base font-extrabold text-brand-700">Material</h4>
          <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
            <Row label="Nombre comercial" value={detalle.nombre_comercial_snapshot ?? 'No disponible'} />
            <Row label="Nombre científico" value={detalle.nombre_cientifico_snapshot ?? 'No disponible'} />
            <Row label="Tipo de material" value={detalle.tipo_material} />
            <Row label="Cantidad declarada" value={`${detalle.cantidad_declarada} ${detalle.unidad_declarada}`} />
            <Row label="Saldo registrado" value={`${detalle.saldo_actual} ${detalle.unidad_declarada}`} />
            <Row label={detalle.recepcion ? 'Vivero receptor' : 'Destino previsto'} value={viveroNombre ?? `Vivero ${detalle.vivero_id}`} />
            {detalle.metodo_id && <Row label="Método" value={metodoNombre ?? `Método ${detalle.metodo_id}`} />}
            {detalle.observaciones && <Row label="Observaciones" value={detalle.observaciones} />}
          </dl>
        </section>
        <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
          <h4 className="text-base font-extrabold text-brand-700">Ubicación</h4>
          <p className="mt-3 text-sm font-semibold text-neutral-700">{ubicacion?.nombre ?? 'No disponible'}</p>
          {ubicacion?.referencia && <p className="mt-1 text-sm text-neutral-600">{ubicacion.referencia}</p>}
          {ubicacion?.latitud != null && ubicacion.longitud != null && <p className="mt-1 text-xs text-neutral-500">{ubicacion.latitud}, {ubicacion.longitud}</p>}
          {ubicacion?.precision_m != null && <p className="text-xs text-neutral-500">Precisión: {ubicacion.precision_m} m</p>}
          {ubicacion?.fuente && <p className="text-xs text-neutral-500">Fuente: {ubicacion.fuente}</p>}
        </section>
        <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
          <h4 className="text-base font-extrabold text-brand-700">Evidencias ({fotos.length})</h4>
          <RecoleccionEvidencias evidencias={fotos} />
        </section>
        <section className="rounded-2xl bg-brand-50 p-4 ring-1 ring-black/5">
          <h4 className="text-base font-extrabold text-brand-700">Auditoría</h4>
          <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
            <Row label="Recolector" value={detalle.nombre_recolector_snapshot ?? `Persona ${detalle.recolector_id}`} />
            <Row label="Fecha de recolección" value={fecha(detalle.fecha_recoleccion)} />
            {detalle.recepcion && <><Row label="Fecha física de recepción" value={fecha(detalle.recepcion.fecha_recepcion)} /><Row label="Registrado en" value={fecha(detalle.recepcion.registrado_en)} /><Row label="Recibido por" value={`Persona ${detalle.recepcion.recibido_por}`} /></>}
          </dl>
          {detalle.historial.length > 0 && <><p className="mt-4 text-xs font-bold text-brand-600">Historial auditable · Los registros se conservan</p><ol className="mt-2 space-y-3">{detalle.historial.map(evento => <li key={evento.id} className="border-t border-brand-100 pt-2 text-xs text-neutral-600">
            <p className="font-bold">{evento.tipo_historial} · {evento.estado_destino}</p>
            <p>{fecha(evento.fecha)} · Persona {evento.actor_id ?? 'no disponible'}</p>
            <HistoricalAmount metadata={evento.metadata} />
            {typeof evento.metadata.motivo_rechazo === 'string' && <p>{evento.metadata.motivo_rechazo}</p>}
          </li>)}</ol></>}
        </section>
      </div>}</div>
      {ownCollection && <p className="px-4 pb-3 text-xs font-semibold text-warning-800">Tu recolección necesita otra persona autorizada para recibirla o rechazarla.</p>}
      {showActions && <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
        <Button variant="danger" size="sm" className="flex-1 rounded-xl" onClick={onReject} disabled={busy || !canReject || !onReject}>Rechazar</Button>
        <Button size="sm" className="flex-1 rounded-xl" onClick={onReceive} disabled={busy || !canReceive || !onReceive}>Recepcionar</Button>
      </div>}
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><dt className="shrink-0 text-neutral-500">{label}</dt><dd className="break-words text-right">{value}</dd></div>
}

function HistoricalAmount({ metadata }: { metadata: Record<string, unknown> }) {
  const snapshot = metadata.ficha_revisada
  if (!snapshot || typeof snapshot !== 'object' || !('cantidad_inicial_canonica' in snapshot) || !('unidad_canonica' in snapshot)) return null
  return (typeof snapshot.cantidad_inicial_canonica === 'number' || typeof snapshot.cantidad_inicial_canonica === 'string') && typeof snapshot.unidad_canonica === 'string'
    ? <p>Declaración revisada: {snapshot.cantidad_inicial_canonica} {snapshot.unidad_canonica}</p>
    : null
}
