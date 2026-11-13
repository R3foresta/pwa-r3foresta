import type { ReactNode } from 'react'
import { Badge, Card, statusVariant } from '../../../components/ui'
import type { Recoleccion } from '../../../services/recolecciones.service'
import { getUbicacionCoords, getUbicacionDisplay, getUbicacionDivision } from '../../../utils/ubicacion'
import { formatRecoleccionCantidad, formatRecoleccionDate, formatRecoleccionDateTime } from '../recoleccionPresentation'
import { resolveEstadoOperativo, resolveEstadoRegistro } from '../recoleccionStatus'
import { getEstadoOperativoLabel, getEstadoRegistroDescription, getEstadoRegistroLabel } from '../recoleccionStatusPresentation'
import RecoleccionEvidencias from './RecoleccionEvidencias'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-neutral-500">{label}</dt><dd className="min-w-0 break-words text-right">{children}</dd></div>
}

type Props = { recoleccion: Recoleccion; children?: ReactNode }

export function RecoleccionResumen({ recoleccion, children }: Props) {
  const estado = resolveEstadoRegistro(recoleccion)
  const operativo = resolveEstadoOperativo(recoleccion)
  const recibida = estado === 'VALIDADO' && recoleccion.recepcion_conforme === true
  return <Card as="section">
    <h2 className="text-lg font-extrabold text-brand-700">Resumen</h2>
    <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
      <Row label="Nombre comercial">{recoleccion.nombre_comercial || 'No disponible'}</Row>
      <Row label="Nombre científico"><span className="italic">{recoleccion.nombre_cientifico || 'No disponible'}</span></Row>
      <Row label="Tipo de material">{recoleccion.tipo_material}</Row>
      <Row label="Cantidad registrada">{formatRecoleccionCantidad(recoleccion.cantidad_inicial_canonica, recoleccion.unidad_canonica)}</Row>
      <Row label="Saldo en origen">{formatRecoleccionCantidad(recoleccion.saldo_actual, recoleccion.unidad_canonica)}</Row>
      <Row label="Estado de la ficha"><Badge variant={statusVariant(estado)}>{getEstadoRegistroLabel(estado, recibida)}</Badge></Row>
      <Row label="Estado del saldo"><Badge variant={statusVariant(operativo)}>{getEstadoOperativoLabel(operativo)}</Badge></Row>
    </dl>
    <p className="mt-3 text-sm text-neutral-600">{estado === 'VALIDADO' && !recibida ? 'La recepción física no está acreditada en esta ficha.' : getEstadoRegistroDescription(estado)}</p>
    {estado === 'PENDIENTE_VALIDACION' && <p className="mt-2 text-sm text-neutral-600">La ficha no se puede editar mientras espera la recepción.</p>}
    {estado === 'RECHAZADO' && <div className="mt-3 rounded-2xl bg-danger-50 p-3 text-sm text-danger-700">
      <p className="font-semibold">Motivo de la corrección</p>
      <p className="mt-1 whitespace-pre-wrap break-words">{recoleccion.motivo_rechazo?.trim() || 'No disponible.'}</p>
    </div>}
    {operativo === 'CERRADO' && <p className="mt-2 text-sm text-neutral-600">El origen ya no tiene saldo. Sus lotes de vivero pueden continuar su proceso.</p>}
    {children}
  </Card>
}

export function RecoleccionRecepcionResumen({ recoleccion, children }: Props) {
  const recibida = resolveEstadoRegistro(recoleccion) === 'VALIDADO' && recoleccion.recepcion_conforme === true
  return <Card as="section">
    <h2 className="text-lg font-extrabold text-brand-700">Recepción</h2>
    <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
      <Row label={recibida ? 'Vivero de recepción' : 'Destino previsto'}>{recoleccion.vivero?.nombre || 'No disponible'}</Row>
      {recibida && <>
        <Row label="Fecha de recepción">{formatRecoleccionDate(recoleccion.recepcion?.fecha_recepcion, 'long')}</Row>
        <Row label="Recibido por">{recoleccion.recepcion ? `Usuario ${recoleccion.recepcion.recibido_por}` : 'No disponible'}</Row>
      </>}
    </dl>
    {recoleccion.m2_estado_habilitacion === 'PENDIENTE_RECEPCION' && <p className="mt-3 text-sm text-neutral-600">Consumo y desecho requieren recepción conforme.</p>}
    {children}
  </Card>
}

export function RecoleccionOrigen({ recoleccion }: Props) {
  const division = getUbicacionDivision(recoleccion.ubicacion)
  const coords = getUbicacionCoords(recoleccion.ubicacion)
  const usuario = recoleccion.usuario
  const recolector = recoleccion.nombre_recolector_snapshot?.trim()
    || (usuario?.nombre ? [usuario.nombre, usuario.apellido].filter(Boolean).join(' ') : usuario?.username)
  return <Card as="section">
    <h2 className="text-lg font-extrabold text-brand-700">Origen y fotografías</h2>
    <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
      <Row label="Recolectado por">{recolector || 'No disponible'}</Row>
      <Row label="Fecha de recolección">{formatRecoleccionDate(recoleccion.fecha, 'long')}</Row>
      <Row label="Método">{recoleccion.metodo?.nombre || 'No disponible'}</Row>
    </dl>
    <p className="mt-3 text-sm font-semibold text-neutral-700">{getUbicacionDisplay(recoleccion.ubicacion)}</p>
    {division && <p className="text-sm text-neutral-600">{division}</p>}
    {coords && <p className="text-xs text-neutral-500">{coords}</p>}
    {recoleccion.observaciones && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-neutral-600">{recoleccion.observaciones}</p>}
    <h3 className="mt-4 font-bold">Fotos de recolección{recoleccion.evidencias ? ` (${recoleccion.evidencias.length})` : ''}</h3>
    <RecoleccionEvidencias evidencias={recoleccion.evidencias} />
  </Card>
}

export function RecoleccionDatosRegistro({ recoleccion }: Props) {
  return <Card as="section">
    <h2 className="text-lg font-extrabold text-brand-700">Datos del registro</h2>
    <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-700">
      <Row label="Creado en">{formatRecoleccionDateTime(recoleccion.created_at)}</Row>
      {recoleccion.recepcion && <Row label="Recepción registrada en">{formatRecoleccionDateTime(recoleccion.recepcion.registrado_en)}</Row>}
      <Row label="Usuario recolector">{recoleccion.usuario?.username || 'No disponible'}</Row>
    </dl>
  </Card>
}
