import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../../components/ui'
import { useAuth } from '../../../../contexts/AuthContext'
import { RegistroParticipacionService } from '../../api/registro.api'
import type { DetallePropioRegistro } from '../../registroTypes'

export default function DetallePropioScreen() {
  const { user } = useAuth()
  const { registroId } = useParams()
  return <DetallePropio key={`${user?.id}:${registroId}`} actorId={user?.id ?? null} registroId={registroId ?? null} />
}

function ConfirmedPhoto({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="space-y-1">{failed ? <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">La foto no se pudo cargar.</p> : <img src={RegistroParticipacionService.imagenPublicaUrl(id)} alt={`Evidencia confirmada ${id}`} loading="lazy" onError={() => setFailed(true)} className="h-48 w-full rounded-2xl object-cover" />}<p className="text-xs text-neutral-500">Evidencia {id}</p></div>
}

function DetallePropio({ actorId, registroId }: { actorId: string | null; registroId: string | null }) {
  const { login } = useAuth()
  const [revision, setRevision] = useState(0)
  const [record, setRecord] = useState<{ revision: number; data: DetallePropioRegistro | null; error: string | null; sessionExpired: boolean } | null>(null)
  useEffect(() => {
    if (!actorId || !registroId) return
    const controller = new AbortController()
    RegistroParticipacionService.detallePropio(actorId, registroId, controller.signal).then((response) => {
      if (!controller.signal.aborted) setRecord({ revision, data: response.data, error: null, sessionExpired: false })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setRecord({ revision, data: null, error: error instanceof Error ? error.message : 'No se pudo consultar el registro propio.', sessionExpired: error instanceof Error && 'status' in error && error.status === 401 })
    })
    return () => controller.abort()
  }, [actorId, registroId, revision])
  const current = record?.revision === revision ? record : null
  const data = current?.data
  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-6">
    <PageHeader title="Detalle propio" eyebrow="Plantación" backTo="/app/home" />
    {!actorId || !registroId ? <Card><p className="text-sm text-danger-700">Se necesita una sesión verificada y un registro válido.</p></Card> : !current ? <Card><p role="status" className="text-sm text-neutral-600">Consultando registro persistido…</p></Card> : null}
    {current?.error && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{current.error}</p><Button variant="secondary" onClick={() => { if (current.sessionExpired) void login().then(() => setRevision((value) => value + 1)).catch(() => undefined); else setRevision((value) => value + 1) }}>{current.sessionExpired ? 'Recuperar sesión con passkey' : 'Reintentar consulta propia'}</Button></Card>}
    {data && <>
      <Card className="space-y-2"><h1 className="break-all text-lg font-extrabold text-brand-800">{data.codigo_trazabilidad}</h1><p className="text-sm text-neutral-700">Registro {data.registro_plantacion_id} · Subcampaña {data.subcampania_id}</p><p className="text-sm text-neutral-700">Fecha: {data.fecha_plantacion} · {data.cantidad_total_plantada} plantas</p><p className="text-xs text-neutral-500">Revisión del registro: {data.revision_registro}. La consulta propia no exige conservar acceso operativo.</p></Card>
      <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Especies registradas</h2>{data.especies.map((species) => <p key={species.planta_id} className="text-sm text-neutral-700">Especie {species.planta_id}: {species.cantidad} plantas</p>)}</Card>
      <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Ubicación evaluada</h2><p className="text-sm text-neutral-700">{data.latitud}, {data.longitud}</p><p className="text-sm text-neutral-700">{data.gps_dentro_poligono ? 'Dentro del polígono' : 'Exterior permitido registrado'}</p></Card>
      <Card as="section" className="space-y-3"><h2 className="font-bold text-brand-800">Personas y afiliaciones del registro</h2>{data.participantes.map((person) => <div key={person.usuario_id} className="border-t border-neutral-100 pt-2 text-sm"><p className="font-bold text-brand-800">{person.nombre_snapshot ?? 'Nombre histórico no disponible'} · {person.es_responsable ? 'Responsable' : 'Participante'}</p><p className="text-neutral-600">{person.afiliacion_estado === 'DECLARADA' ? person.afiliacion_snapshot : person.afiliacion_estado === 'NO_DECLARADA' ? 'Sin afiliación declarada' : 'Afiliación histórica no disponible'}</p></div>)}</Card>
      {data.observaciones_autor && <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Observaciones propias</h2><p className="whitespace-pre-wrap break-words text-sm text-neutral-700">{data.observaciones_autor}</p></Card>}
      <Card as="section" className="space-y-3"><h2 className="font-bold text-brand-800">Evidencia confirmada</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{data.evidencia_ids.map((id) => <ConfirmedPhoto key={id} id={id} />)}</div></Card>
    </>}
  </div>
}
