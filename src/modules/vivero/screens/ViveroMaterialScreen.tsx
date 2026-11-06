import { useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, Card, PageHeader, inputClasses } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useViveros } from '../../../hooks/useViveros'
import { RecoleccionesService } from '../../../services/recolecciones.service'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { canAtVivero, exactId } from '../../accesos/accessPolicy'
import { mapToCantidadYUnidadCanonica } from '../../../utils/recoleccionUnidad'
import type { OrigenMaterial } from '../api/origenes.api'
import { useOrigenes } from '../hooks/useOrigenes'

export default function ViveroMaterialScreen() {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const catalog = useViveros()
  const [vivero, setVivero] = useState(''), [page, setPage] = useState(1), [version, setVersion] = useState(0)
  const [target, setTarget] = useState<OrigenMaterial | null>(null), [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null)
  const [uncertainAtVersion, setUncertainAtVersion] = useState<number | null>(null)
  const origins = useOrigenes(user?.id ?? null, vivero || null, page, version)
  // Sólo una lectura correcta de una versión posterior permite preparar otro desecho.
  // useOrigenes no expone datos de una clave anterior durante carga o error.
  const observedAfterDiscard = uncertainAtVersion !== null && version > uncertainAtVersion && origins.pagination !== null
  const uncertain = uncertainAtVersion !== null && !observedAfterDiscard
  const allowed = m2.status === 'ready' ? m2.data : null
  const canDiscard = (item: OrigenMaterial) => canAtVivero(allowed, item.vivero_almacenamiento_id, 'desechar_semillas')
  function refreshMaterial() {
    setTarget(null); setMessage(null); setVersion(value => value + 1)
  }
  async function discard() {
    if (!target || busy || uncertain || !canDiscard(target)) return
    let cantidad: number
    try {
      cantidad = mapToCantidadYUnidadCanonica(quantity, target.unidad_canonica === 'G' ? 'g' : 'units').cantidad_inicial_canonica
      if (cantidad <= 0 || cantidad > target.saldo_actual) throw new Error('La cantidad debe ser positiva y no superar el saldo disponible.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Cantidad inválida.'); return }
    setBusy(true); setMessage(null)
    try {
      const result = await RecoleccionesService.registrarDesecho(target.recoleccion_id, { cantidad })
      setMessage(result.data.message); setTarget(null); setVersion(value => value + 1)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo confirmar el desecho.')
      setUncertainAtVersion(version)
    } finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-2xl space-y-4 px-4 pb-32 pt-5">
    <PageHeader title="Material de origen" subtitle="Semillas y esquejes validados con saldo en tu vivero" backTo="/app/vivero" />
    <Card className="space-y-3"><label className="block text-sm font-semibold">Vivero de almacenamiento<select className={inputClasses(false)} value={vivero} disabled={busy} onChange={event => { setVivero(event.target.value); setPage(1); setTarget(null); setMessage(null); setUncertainAtVersion(null) }}><option value="">Escoge un vivero</option>{catalog.viveros.filter(item => canAtVivero(allowed, item.id, 'consultar_material')).map(item => <option key={item.id} value={exactId(item.id)}>{item.nombre} · {item.codigo}</option>)}</select></label>{catalog.loading && <p role="status">Cargando viveros…</p>}{catalog.error && <p role="alert">{catalog.error}</p>}<p className="text-xs text-neutral-500">La validación documental del origen no acredita recepción física.</p></Card>
    {message && <p role={uncertain ? 'alert' : 'status'} className="text-sm">{message}</p>}
    {uncertain && !target && !origins.loading && !origins.error && <Button variant="secondary" onClick={refreshMaterial}>Consultar material actual</Button>}
    {observedAfterDiscard && <p role="status" className="text-sm">Material actualizado desde el servidor. El resultado del desecho anterior sigue sin confirmar.</p>}
    {origins.loading && <p role="status">Consultando material…</p>}
    {origins.error && <Card><p role="alert">{origins.error}</p><Button onClick={refreshMaterial}>Reintentar material</Button></Card>}
    {vivero && !origins.loading && !origins.error && !origins.items.length && <Card>Sin material disponible en este vivero.</Card>}
    {origins.items.map(item => <Card key={item.recoleccion_id} className="space-y-3"><h2 className="font-bold">{item.nombre_comercial_snapshot ?? item.nombre_cientifico_snapshot ?? item.codigo_trazabilidad}</h2><p className="text-sm">{item.codigo_trazabilidad} · {item.tipo_material}</p><p className="font-semibold">Saldo: {item.saldo_actual} {item.unidad_canonica}</p><p className="text-xs text-neutral-500">Snapshot del origen · Recolector {item.recolector_id}</p>{canDiscard(item) && <Button variant="secondary" disabled={busy || uncertain} onClick={() => { setTarget(item); setQuantity(''); setMessage(null); setUncertainAtVersion(null) }}>Registrar desecho de {item.codigo_trazabilidad}</Button>}</Card>)}
    {origins.pagination && <div className="flex items-center justify-between gap-2"><Button variant="secondary" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</Button><span className="text-sm">Página {page}</span><Button variant="secondary" disabled={page * 20 >= origins.pagination.total || busy} onClick={() => setPage(value => value + 1)}>Siguiente</Button></div>}
    <Link className="block text-sm underline" to="/app/vivero/new">Iniciar un lote de vivero</Link>
    <ConfirmDialog open={Boolean(target && canDiscard(target))} title="Confirmar desecho del material" confirmLabel="Registrar desecho" variant="danger" loading={busy} confirmDisabled={uncertain} onConfirm={() => void discard()} onCancel={() => { if (!busy) setTarget(null) }} errorMessage={message}>
      {target && <div className="mt-3 space-y-3 text-sm"><p>{target.codigo_trazabilidad} · Vivero {target.vivero_almacenamiento_id}</p><p>Se descontará material de Recolección. El movimiento quedará en el historial.</p><label className="block font-semibold">Cantidad ({target.unidad_canonica})<input className={inputClasses(false)} inputMode="decimal" value={quantity} disabled={busy || uncertain} onChange={event => setQuantity(event.target.value)} /></label><p>Saldo consultado: {target.saldo_actual} {target.unidad_canonica}</p>{uncertain && <><p role="alert">El resultado no está confirmado. Consulta el material antes de preparar otro desecho.</p><Button variant="secondary" onClick={refreshMaterial}>Consultar material actual</Button></>}</div>}
    </ConfirmDialog>
  </div>
}
