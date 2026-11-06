import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Badge, Button, Card, inputClasses } from '../../../components/ui'
import { useViveros } from '../../../hooks/useViveros'
import { AccesosService } from '../../accesos/accesos.api'
import { exactId, sameId } from '../../accesos/accessPolicy'
import { ParticipacionApiError } from '../../participacion/api/participacion.transport'
import type { AccesoM1, AccesoM2, DominioAcceso, LecturaAcceso } from '../../accesos/types'
import type { useModuleCommand } from '../../accesos/useModuleCommand'
import type { UsuariosAccessIssue } from '../hooks/useUsuariosAdministracion'

type Read = LecturaAcceso<AccesoM1 | AccesoM2>
type Props = { actorId: string; usuarioId: string; nombre: string; domain: DominioAcceso; locked: boolean; command: ReturnType<typeof useModuleCommand>; onAccessIssue: (issue: UsuariosAccessIssue) => void }
export default function UsuarioModuleAccess(props: Props) {
  return <AccessPanel key={`${props.actorId}:${props.usuarioId}:${props.domain}`} {...props} />
}
function AccessPanel({ actorId, usuarioId, nombre, domain, locked, command, onAccessIssue }: Props) {
  const [reading, setReading] = useState<Read | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [target, setTarget] = useState<{ otorgar: boolean; viveroId?: string } | null>(null)
  const [review, setReview] = useState<Read | null>(null)
  const [selectedVivero, setSelectedVivero] = useState('')
  const request = useRef<AbortController | null>(null)
  const { viveros, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } = useViveros(domain === 'M2')
  const title = domain === 'M1' ? 'Acceso de Recolección (M1)' : 'Viveros asignados (M2)'
  const read = useCallback(async (cursor?: string) => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(null)
    try {
      const result = await (domain === 'M1' ? AccesosService.m1(actorId, usuarioId, cursor, controller.signal) : AccesosService.m2(actorId, usuarioId, cursor, controller.signal))
      if (controller.signal.aborted) return null
      setReading(previous => cursor && previous ? { ...result, data: { ...result.data, historial: [...previous.data.historial, ...result.data.historial.filter(item => !previous.data.historial.some(old => old.id === item.id))] } } : result)
      return result
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : 'No se pudieron consultar los accesos.')
        if (error instanceof ParticipacionApiError && (error.status === 401 || error.status === 403)) onAccessIssue({ status: error.status, message: error.message })
      }
      return null
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }, [actorId, usuarioId, domain, onAccessIssue])
  useEffect(() => { void read(); return () => request.current?.abort() }, [read])
  const data = reading?.data
  const m1 = data && 'acceso_explicito' in data ? data : null
  const m2 = data && 'viveros' in data ? data : null
  const eligible = Boolean(data?.activo && ['GENERAL', 'VALIDADOR'].includes(data.rol_global))
  const normalizedReason = reason.normalize('NFC').trim()
  const validReason = [...normalizedReason].length >= 3 && [...normalizedReason].length <= 1000
  const unavailable = locked || busy || command.state !== 'idle'
  const labelVivero = (id: string) => viveros.find(item => sameId(item.id, id))?.nombre ?? `Vivero ${id}`
  function changeTarget(value: typeof target) { request.current?.abort(); setBusy(false); setTarget(value); setReason(''); setReview(null); setError(null) }
  async function reviewChange() {
    if (!target || unavailable || !validReason) return
    const latest = await read()
    if (!latest) return
    if (target.otorgar && (!latest.data.activo || !['GENERAL', 'VALIDADOR'].includes(latest.data.rol_global))) {
      setError('La cuenta ya no es elegible para otorgar accesos. Puedes retirar sus vigencias conservadas.'); return
    }
    setReview(latest)
  }
  async function confirm() {
    if (!target || !review || unavailable || !validReason) return
    const value = { usuario_id: usuarioId, otorgar: target.otorgar, revision_esperada: review.data.revision_acceso, motivo: normalizedReason, ...(domain === 'M2' ? { vivero_id: target.viveroId } : {}) }
    setReview(null)
    await command.confirm(value)
  }
  return <Card as="section" className="space-y-3" aria-label={title}>
    <h2 className="text-lg font-bold">{title}</h2>
    {busy && <p role="status" className="text-sm">Consultando accesos…</p>}
    {error && <div><p role="alert" className="text-sm text-danger-700">{error}</p><Button variant="secondary" disabled={locked || busy} onClick={() => { setReview(null); void read() }}>Reintentar {domain}</Button></div>}
    {data && <>
      <p className="text-xs text-neutral-500">Cuenta {data.activo ? 'activa' : 'inactiva'} · Revisión {data.revision_acceso}</p>
      {m1 && <><p className="text-sm">Acceso explícito: <strong>{m1.acceso_explicito ? 'Sí' : 'No'}</strong> · Acceso efectivo: <strong>{m1.acceso_efectivo ? 'Sí' : 'No'}</strong></p>{m1.origen === 'ADMIN' && <p className="text-sm">ADMIN tiene acceso global derivado de su rol.</p>}
        <Button variant={m1.acceso_explicito ? 'secondary' : 'primary'} disabled={unavailable || !m1.acceso_explicito && !eligible} onClick={() => changeTarget({ otorgar: !m1.acceso_explicito })}>{m1.acceso_explicito ? 'Retirar Recolección' : 'Otorgar Recolección'}</Button></>}
      {m2 && <>
        {m2.alcance_global && <p className="text-sm">ADMIN tiene acceso global a todos los viveros sin necesitar asignaciones.</p>}
        {m2.viveros.length === 0 && <p className="text-sm text-neutral-600">Sin viveros asignados explícitamente.</p>}
        <ul className="space-y-2">{m2.viveros.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-neutral-50 p-3"><div className="min-w-0"><p className="break-words font-semibold">{labelVivero(item.vivero_id)}</p><p className="break-all text-xs text-neutral-500">Vivero {item.vivero_id}</p><Badge variant={item.acceso_efectivo ? 'success' : 'neutral'}>{item.acceso_efectivo ? 'Efectivo' : 'Vigencia conservada sin efecto'}</Badge></div><Button size="sm" variant="secondary" disabled={unavailable} onClick={() => changeTarget({ otorgar: false, viveroId: item.vivero_id })} aria-label={`Retirar ${labelVivero(item.vivero_id)}`}>Retirar</Button></li>)}</ul>
        {catalogLoading ? <p role="status" className="text-sm">Cargando catálogo de viveros…</p> : catalogError ? <div><p role="alert" className="text-sm text-danger-700">{catalogError}</p><Button variant="secondary" disabled={unavailable} onClick={refreshCatalog}>Reintentar catálogo de viveros</Button></div> : <div className="space-y-2"><label className="block text-sm font-semibold">Vivero a asignar<select className={inputClasses(false)} value={selectedVivero} disabled={unavailable || !eligible} onChange={event => { setSelectedVivero(event.target.value); changeTarget(null) }}><option value="">Escoge un vivero</option>{viveros.filter(item => !m2.viveros.some(row => sameId(item.id, row.vivero_id))).map(item => <option key={item.id} value={exactId(item.id)}>{item.nombre} · {item.codigo}</option>)}</select></label><Button disabled={unavailable || !eligible || !selectedVivero} onClick={() => changeTarget({ otorgar: true, viveroId: selectedVivero })}>Asignar vivero</Button></div>}
      </>}
      {!eligible && <p className="text-sm text-neutral-600">Solo cuentas GENERAL o VALIDADOR activas reciben accesos explícitos. Las vigencias conservadas pueden retirarse.</p>}
      {target && <form className="space-y-3 border-t border-neutral-100 pt-3" onSubmit={event => { event.preventDefault(); void reviewChange() }}>
        <p className="text-sm font-semibold">{target.otorgar ? 'Otorgar' : 'Retirar'} {domain === 'M1' ? 'Recolección' : labelVivero(target.viveroId!)} a {nombre}</p>
        <label className="block text-sm font-semibold">Motivo de {domain}<textarea className={inputClasses(Boolean(reason) && !validReason)} rows={2} maxLength={1000} value={reason} disabled={unavailable} onChange={event => { request.current?.abort(); setBusy(false); setReason(event.target.value); setReview(null) }} /></label>
        <p className="text-xs text-neutral-500">Entre 3 y 1000 caracteres. Se conserva en el historial.</p>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={unavailable || !validReason}>Revisar cambio de {domain}</Button><Button variant="ghost" disabled={unavailable} onClick={() => changeTarget(null)}>Cancelar cambio de {domain}</Button></div>
      </form>}
      <details className="border-t border-neutral-100 pt-3"><summary className="cursor-pointer text-sm font-semibold">Historial auditable de {domain}</summary><ul className="mt-3 space-y-3 text-sm">{data.historial.map(item => <li className="break-words rounded-2xl bg-neutral-50 p-3" key={item.id}><p className="font-semibold">{item.evento === 'ACCESO_OTORGADO' ? 'Otorgado' : 'Retirado'}{item.vivero_id ? ` · ${labelVivero(item.vivero_id)}` : ''}</p><p>{item.motivo}</p><p className="text-xs text-neutral-500">{new Date(item.creado_en).toLocaleString('es-BO')} · Actor {item.actor_id} · Revisión {item.revision_anterior} → {item.revision_nueva}</p><p className="break-all text-xs text-neutral-500">Comando {item.comando_id}</p></li>)}</ul>{!data.historial.length && <p className="mt-2 text-sm text-neutral-500">Sin cambios registrados.</p>}{data.siguiente_antes_de_id && <Button variant="secondary" disabled={unavailable} onClick={() => { setReview(null); void read(data.siguiente_antes_de_id!) }}>Cargar más historial de {domain}</Button>}</details>
    </>}
    <ConfirmDialog open={Boolean(review && target) && !locked} title={`Confirmar acceso ${domain}`} confirmLabel={`Confirmar ${domain}`} onCancel={() => setReview(null)} onConfirm={() => void confirm()}>
      {target && <div className="mt-3 space-y-2 text-sm"><p className="font-semibold">{nombre} · Cuenta {usuarioId}</p><p>{target.otorgar ? 'Otorgar' : 'Retirar'} {domain === 'M1' ? 'Recolección' : `${labelVivero(target.viveroId!)} (${target.viveroId})`}</p><p className="break-words">Motivo: {normalizedReason}</p><p>Cambia solo esta vigencia. El rol y los demás accesos se conservan.</p></div>}
    </ConfirmDialog>
  </Card>
}
