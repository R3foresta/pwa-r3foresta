import { Link } from 'react-router-dom'
import type { EstadoHabilitacion, OrigenMaterial } from '../api/origenes.api'

const MENSAJES: Record<EstadoHabilitacion, string> = {
  RECEPCION_CONFORME: 'Material habilitado por recepción física conforme.',
  CONCILIACION_CONFORME: 'Remanente habilitado por conciliación histórica conforme.',
  PENDIENTE_RECEPCION: 'Pendiente de recepción física conforme.',
  PENDIENTE_CONCILIACION: 'Pendiente de conciliar el remanente histórico.',
  INCIDENCIA_CONCILIACION: 'Remanente bloqueado por una incidencia de conciliación.',
}

export default function EstadoOrigenMaterial({ origen }: { origen: OrigenMaterial }) {
  const { estado_habilitacion: estado, recoleccion_id: id } = origen
  const etiqueta = origen.codigo_trazabilidad?.trim() || `origen #${id}`
  return (
    <div className="text-sm">
      <p>{MENSAJES[estado]}</p>
      {estado === 'PENDIENTE_RECEPCION' && (
        <Link className="inline-flex min-h-11 items-center font-semibold underline" to={`/app/recepciones-semillas/${id}`}>
          Ver recepción de {etiqueta}
        </Link>
      )}
      {origen.puede_consultar_conciliacion && (
        <Link className="inline-flex min-h-11 items-center font-semibold underline" to={`/app/vivero/conciliaciones/${id}`}>
          Ver conciliación de {etiqueta}
        </Link>
      )}
      {estado === 'PENDIENTE_CONCILIACION' && !origen.puede_consultar_conciliacion && (
        <p className="mt-1">Solicita a Administración la revisión de este origen.</p>
      )}
    </div>
  )
}
