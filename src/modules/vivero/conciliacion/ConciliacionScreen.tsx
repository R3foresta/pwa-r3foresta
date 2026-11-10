import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { canAtVivero } from '../../accesos/accessPolicy'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { ConciliacionService, type FichaConciliacion } from './conciliacion.api'

const ESTADOS = {
  FUERA_PADRON: 'Fuera del padrón',
  PENDIENTE: 'Pendiente de comprobación física',
  CONFORME: 'Conciliación conforme',
  INCIDENCIA: 'Incidencia registrada',
  RETIRADO: 'Retirado del padrón',
} satisfies Record<FichaConciliacion['estado'], string>

function DetalleConciliacion({ ficha }: { ficha: FichaConciliacion }) {
  const unidad = ficha.unidad_canonica
  return (
    <>
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">{ficha.codigo_trazabilidad?.trim() || `Origen #${ficha.recoleccion_id}`}</h2>
        <p>Origen {ficha.recoleccion_id} · Vivero {ficha.vivero_id} · Recolección {ficha.fecha_recoleccion}</p>
        <p className="font-semibold">{ESTADOS[ficha.estado]}</p>
        <p>La comprobación histórica corresponde al remanente físico de este origen.</p>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-bold">Cotejo de saldo</h2>
        <dl className="grid grid-cols-2 gap-2">
          <dt>Cantidad inicial</dt><dd>{ficha.cantidad_inicial} {unidad}</dd>
          <dt>Cantidad inicial más movimientos</dt><dd>{ficha.saldo_calculado} {unidad}</dd>
          <dt>Saldo registrado</dt><dd>{ficha.saldo_actual} {unidad}</dd>
          <dt>Último movimiento</dt><dd>{ficha.ultimo_movimiento_en ?? 'Sin movimientos'}</dd>
          <dt>Revisión de captura</dt><dd>{ficha.revision_captura}</dd>
          <dt>Revisión de conciliación</dt><dd>{ficha.revision}</dd>
        </dl>
        <p>{ficha.trazabilidad_conforme ? 'Trazabilidad consistente' : 'Trazabilidad con inconsistencias'}</p>
        {ficha.inconsistencias.length > 0 && <ul className="list-disc pl-5">{ficha.inconsistencias.map(codigo => <li key={codigo}>{codigo}</li>)}</ul>}
        <p>Marca de movimientos <code className="break-all text-xs">{ficha.marca_movimientos}</code></p>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-bold">Trazabilidad del origen</h2>
        <div>
          <h3 className="font-semibold">Movimientos ({ficha.movimientos.length})</h3>
          <ul className="divide-y">{ficha.movimientos.map(m => (
            <li key={m.id} className="py-1">#{m.id} · {m.tipo} · {m.delta} {m.unidad ?? 'Unidad sin registrar'}
              {m.fecha && ` · ${m.fecha}`}              {m.lote_id && ` · Lote ${m.lote_id}`}{m.evento_id && ` · Evento ${m.evento_id}`}
            </li>
          ))}</ul>
        </div>
        <div>
          <h3 className="font-semibold">Lotes de Vivero ({ficha.lotes.length})</h3>
          <ul className="divide-y">{ficha.lotes.map(l => (
            <li key={l.id} className="py-1">#{l.id} · {l.codigo_trazabilidad} · Vivero {l.vivero_id} · {l.cantidad_inicial} {l.unidad}
              {l.evento_inicio_ids.length > 0 && ` · INICIO ${l.evento_inicio_ids.join(', ')}`}
            </li>
          ))}</ul>
        </div>
        <div>
          <h3 className="font-semibold">Asignaciones ({ficha.asignaciones.length})</h3>
          <ul className="divide-y">{ficha.asignaciones.map(a => (
            <li key={a.id} className="py-1">#{a.id} · Lote {a.lote_id} · Subcampaña {a.subcampania_id}</li>
          ))}</ul>
        </div>
      </Card>
      <Card className="space-y-2">
        <h2 className="font-bold">Historial de conciliación ({ficha.historial.length})</h2>
        <ul className="divide-y">{ficha.historial.map(h => (
          <li key={h.id} className="space-y-1 py-2">
            <p className="font-semibold">#{h.id} · {ESTADOS[h.estado]} · Revisión {h.revision}</p>
            {h.motivo && <p>{h.motivo}</p>}
            <p>Actor {h.actor_id} · Registro {h.registrado_en}</p>
            {h.fecha_comprobacion && (
              <p>Comprobación {h.fecha_comprobacion} · Observado {h.cantidad_observada} {h.unidad_observada} · Esperado {h.saldo_esperado} {unidad}</p>
            )}
            {h.inconsistencias.length > 0 && <p>Inconsistencias: {h.inconsistencias.join(', ')}</p>}
          </li>
        ))}</ul>
        <h3 className="font-semibold">Evidencias ({ficha.evidencias.length})</h3>
        <ul className="divide-y">{ficha.evidencias.map(e => (
          <li key={e.id} className="py-1">#{e.id} · {e.titulo ?? 'Evidencia de comprobación'} · {e.mime_type} · Comprobación #{e.observacion_id}</li>
        ))}</ul>
      </Card>
    </>
  )
}

function FichaAutorizada({ actor, id }: { actor: string; id: string }) {
  const { m2 } = useOperationalAccess()
  const [version, setVersion] = useState(0)
  const [lectura, setLectura] = useState<{ version: number; ficha?: FichaConciliacion; error?: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void ConciliacionService.detalle(actor, id, controller.signal).then(ficha => {
      if (!controller.signal.aborted) setLectura({ version, ficha })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLectura({
        version,
        error: error instanceof Error ? error.message : 'No se pudo consultar la ficha.',
      })
    })
    return () => controller.abort()
  }, [actor, id, version])

  const actual = lectura?.version === version ? lectura : null
  const ficha = actual?.ficha
  const disponible = ficha && m2.status === 'ready' && canAtVivero(m2.data, ficha.vivero_id, 'consultar_material')
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-5">
      <PageHeader title="Conciliación histórica" subtitle="Ficha de saldo y trazabilidad de Vivero" backTo="/app/vivero/material" />
      {!actual && <p role="status">Consultando ficha de conciliación…</p>}
      {actual?.error && <Card className="space-y-2">
        <p role="alert">{actual.error}</p>
        <Button variant="secondary" onClick={() => setVersion(v => v + 1)}>Reintentar consulta</Button>
      </Card>}
      {ficha && (disponible ? <DetalleConciliacion ficha={ficha} /> : <p role="alert">Ficha de conciliación no disponible para esta cuenta.</p>)}
    </main>
  )
}

export default function ConciliacionScreen() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!user || !id) return null
  return <FichaAutorizada key={`${user.id}:${localStorage.getItem('authToken') ?? ''}:${id}`} actor={user.id} id={id} />
}
