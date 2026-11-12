import { Link } from 'react-router-dom'
import type { EstadoHabilitacion, OrigenMaterial } from '../api/origenes.api'

const MENSAJES: Record<EstadoHabilitacion, string> = {
  RECEPCION_CONFORME: 'Material habilitado por recepción física conforme.',
  PENDIENTE_RECEPCION: 'Pendiente de recepción física conforme.',
}

export default function EstadoOrigenMaterial({ origen }: { origen: OrigenMaterial }) {
  const { estado_habilitacion: estado, recoleccion_id: id } = origen
  const etiqueta = origen.codigo_trazabilidad?.trim() || `origen #${id}`
  return (
    <div className="text-sm">
      <p>{MENSAJES[estado]}</p>
      {estado === 'PENDIENTE_RECEPCION' && (
        <Link className="inline-flex min-h-11 items-center font-semibold underline" to={`/app/collections/validate/${id}`}>
          Ver recepción de {etiqueta}
        </Link>
      )}
    </div>
  )
}
