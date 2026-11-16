import { Link } from 'react-router-dom'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { Button, Card } from '../../../components/ui'
import { ProcedenciaApi, type AudienciaProcedencia } from './procedencia.api'
import type { ProcedenciaRegistro as LecturaProcedencia } from './procedencia.contract'
import { incorporacionLabel } from '../../vivero/utils/presentation'

/** Sólo se monta en detalle propio o en el contenedor administrativo privado. */
export default function ProcedenciaRegistro({ registroId, audiencia }: { registroId: string; audiencia: AudienciaProcedencia }) {
  const { user } = useAuth()
  const token = localStorage.getItem('authToken') ?? ''
  if (!user || !token || audiencia === 'administrativa' && user.rol !== 'ADMIN') return null
  return <ProcedenciaLectura key={JSON.stringify([user.id, user.rol, token, registroId, audiencia])} actor={user.id} token={token} registroId={registroId} audiencia={audiencia} />
}
function ProcedenciaLectura({ actor, token, registroId, audiencia }: { actor: string; token: string; registroId: string; audiencia: AudienciaProcedencia }) {
  const { m2 } = useOperationalAccess()
  const canOpenLot = m2.status === 'ready' && m2.data?.activo && m2.data.capacidades_globales.operar_cualquier_vivero
  const [attempt, setAttempt] = useState(0)
  const [reading, setReading] = useState<{ attempt: number; data?: LecturaProcedencia['data']; error?: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    ProcedenciaApi.leer(actor, registroId, audiencia, token, controller.signal).then(
      result => { if (current()) setReading({ attempt, data: result.data }) },
      error => { if (current()) setReading({ attempt, error: error instanceof Error ? error.message : 'No se pudo consultar la procedencia.' }) },
    )
    return () => controller.abort()
  }, [actor, token, registroId, audiencia, attempt])
  const current = reading?.attempt === attempt ? reading : null
  return <Card as="section" className="space-y-3" aria-label="Procedencia de las plantas">
    <h2 className="font-bold text-brand-800">Procedencia de las plantas</h2>
    <p className="text-xs text-neutral-600">Consumos guardados para esta plantación, por lote y asignación. Cantidades del grupo completo.</p>
    {!current && <p role="status" className="text-sm text-neutral-600">Consultando procedencia…</p>}
    {current?.error && <p role="alert" className="text-sm text-danger-700">{current.error}</p>}
    {current?.data && <>
      <p className="text-sm font-semibold text-brand-800">{current.data.cantidad_total_plantada.toLocaleString('es-BO')} {current.data.cantidad_total_plantada === 1 ? 'planta registrada' : 'plantas registradas'}</p>
      <ul className="space-y-3">{current.data.consumos.map(consumo => <li key={consumo.detalle_id} className="space-y-2 rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">
        <p className="break-words font-bold text-brand-800">{consumo.nombre_comercial_snapshot || consumo.nombre_cientifico_snapshot || 'Nombre histórico no disponible'}</p>
        <dl className="space-y-1">
          {[
            ['Nombre científico registrado', consumo.nombre_cientifico_snapshot || 'No registrado'],
            ['Variedad registrada', consumo.variedad_snapshot || 'No registrada'],
            ['Lote', `${consumo.codigo_lote} · ${consumo.lote_vivero_id}`],
            ['Asignación', consumo.asignacion_id],
            ['Cantidad utilizada', `${consumo.cantidad.toLocaleString('es-BO')} UNIDAD`],
            ['Origen', consumo.origen.tipo === 'RECOLECCION' ? `Recolección ${consumo.origen.recoleccion_id}` : consumo.origen.tipo === 'INCORPORACION' ? incorporacionLabel(consumo.origen.modalidad, consumo.origen.procedencia) : 'Histórico sin origen registrado'],
          ].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-neutral-500">{label}</dt><dd className="break-words">{value}</dd></div>)}
        </dl>
        {canOpenLot && <Link className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 underline" to={`/app/vivero/${consumo.lote_vivero_id}?tab=historial`}>Ver historial del lote</Link>}
        {consumo.origen.tipo === 'INCORPORACION' && consumo.origen.modalidad === 'SALDO_INICIAL' && <p className="text-xs text-neutral-500">Historia anterior al conteo no registrada.</p>}
      </li>)}</ul>
    </>}
    {current && <Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{current.error ? 'Reintentar procedencia' : 'Actualizar procedencia'}</Button>}
  </Card>
}
