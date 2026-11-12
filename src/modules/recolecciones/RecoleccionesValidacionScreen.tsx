import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import Icon from '../../components/Icon'
import SuccessModal from '../../components/SuccessModal'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { canReview, hasViveroCapability, sameId } from '../accesos/accessPolicy'
import { useOperationalAccess } from '../accesos/capabilitiesContext'
import RecepcionForm from '../vivero/recepcion/RecepcionForm'
import { RecepcionService } from '../vivero/recepcion/recepcion.api'
import type { DetalleRecepcion, OrigenRecepcion } from '../vivero/recepcion/recepcion.contract'
import { useRecepcionCommand } from '../vivero/recepcion/useRecepcionCommand'
import RecoleccionRecepcionCard from './components/RecoleccionRecepcionCard'
import { useRecepcionCatalogos } from './hooks/useRecepcionCatalogos'

const BASE = '/app/collections/validate'
type DetailState = { data?: DetalleRecepcion; error?: string }
type ReadState = { key: string; list: OrigenRecepcion[]; next: string | null; details: Record<string, DetailState>; error?: string }
type RejectSelection = { key: string; detalle: DetalleRecepcion }

function scrollReturn(value: unknown, actor: string): number {
  if (!value || typeof value !== 'object' || !('recepcionReturn' in value)) return 0
  const back = value.recepcionReturn
  if (!back || typeof back !== 'object' || !('actor' in back) || back.actor !== actor || !('scrollY' in back)) return 0
  return typeof back.scrollY === 'number' && Number.isFinite(back.scrollY) && back.scrollY >= 0 ? back.scrollY : 0
}

function RecepcionWorkspace({ actor, actorName }: { actor: string; actorName: string }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const { m2 } = useOperationalAccess()
  const command = useRecepcionCommand(actor)
  const allowed = m2.status === 'ready' && hasViveroCapability(m2.data, 'recibir_y_validar')
  const catalogos = useRecepcionCatalogos(actor, allowed)
  const scopeKey = JSON.stringify([m2.status, m2.data])
  const [version, setVersion] = useState(0)
  const cursor = params.get('antes_de_id') ?? undefined
  const key = JSON.stringify([scopeKey, id, cursor, version, command.receipt?.estado === 'CONFIRMADO' ? command.receipt.comando_id : null])
  const [read, setRead] = useState<ReadState | null>(null)
  const visible = allowed && read?.key === key ? read : null
  const [rejectSelection, setRejectSelection] = useState<RejectSelection | null>(null)
  const rejectTarget = rejectSelection?.key === key ? rejectSelection.detalle : null
  const [rejectLookup, setRejectLookup] = useState<{ key: string; id: string } | null>(null)
  const rejectLoading = rejectLookup?.key === key ? rejectLookup.id : null
  const [actionError, setActionError] = useState<{ key: string; text: string } | null>(null)
  const [retryConfirm, setRetryConfirm] = useState(false)
  const extraControllers = useRef(new Set<AbortController>())
  const handledReceipt = useRef<string | null>(null)
  const restoredKey = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const extras = extraControllers.current
    if (allowed) void (async () => {
      try {
        if (id) {
          const data = await RecepcionService.detalle(actor, id, controller.signal)
          if (!controller.signal.aborted) setRead({ key, list: [data], next: null, details: { [data.recoleccion_id]: { data } } })
          return
        }
        const response = await RecepcionService.cola(actor, cursor, controller.signal)
        if (controller.signal.aborted) return
        setRead({ key, list: response.data, next: response.siguiente_antes_de_id, details: {} })
        // La cola es mínima; enriquecer cada página sin saturar las lecturas del servidor.
        let position = 0
        const enrich = async () => {
          while (position < response.data.length && !controller.signal.aborted) {
            const item = response.data[position++]
            let result: DetailState
            try { result = { data: await RecepcionService.detalle(actor, item.recoleccion_id, controller.signal) } }
            catch (error) { result = { error: error instanceof Error ? error.message : 'No se pudo cargar la ficha y sus fotos.' } }
            if (!controller.signal.aborted) setRead(previous => previous?.key === key ? { ...previous, details: { ...previous.details, [item.recoleccion_id]: result } } : previous)
          }
        }
        await Promise.all(Array.from({ length: Math.min(3, response.data.length) }, enrich))
      } catch (error) {
        if (!controller.signal.aborted) setRead({ key, list: [], next: null, details: {}, error: error instanceof Error ? error.message : 'No se pudieron cargar las recolecciones.' })
      }
    })()
    return () => {
      controller.abort()
      extras.forEach(current => current.abort())
      extras.clear()
    }
  }, [actor, allowed, cursor, id, key])

  useEffect(() => {
    if (id || !visible || restoredKey.current === key) return
    restoredKey.current = key
    window.scrollTo({ top: scrollReturn(location.state, actor) })
  }, [actor, id, key, location.state, visible])

  useEffect(() => {
    if (!id || command.receipt?.estado !== 'CONFIRMADO' || handledReceipt.current === command.receipt.comando_id) return
    handledReceipt.current = command.receipt.comando_id
    navigate(`${BASE}${location.search}`, { replace: true, state: location.state })
  }, [command.receipt, id, location.search, location.state, navigate])

  const permitted = (detail: DetalleRecepcion, action: 'recibir' | 'rechazar') => allowed
    && canReview(m2.data, actor, detail.recolector_id, detail.vivero_id)
    && (action === 'recibir' ? detail.puede_recibir_validar : detail.puede_rechazar)

  const retryDetail = async (recoleccionId: string) => {
    const controller = new AbortController()
    extraControllers.current.add(controller)
    setRead(previous => previous?.key === key ? { ...previous, details: { ...previous.details, [recoleccionId]: {} } } : previous)
    try {
      const data = await RecepcionService.detalle(actor, recoleccionId, controller.signal)
      if (!controller.signal.aborted) setRead(previous => previous?.key === key ? { ...previous, details: { ...previous.details, [recoleccionId]: { data } } } : previous)
    } catch (error) {
      if (!controller.signal.aborted) setRead(previous => previous?.key === key ? { ...previous, details: { ...previous.details, [recoleccionId]: { error: error instanceof Error ? error.message : 'No se pudo consultar la ficha.' } } } : previous)
    } finally { extraControllers.current.delete(controller) }
  }

  const openReject = async (recoleccionId: string) => {
    const controller = new AbortController()
    extraControllers.current.add(controller)
    setRejectLookup({ key, id: recoleccionId })
    setActionError(null)
    try {
      const detalle = await RecepcionService.detalle(actor, recoleccionId, controller.signal)
      if (controller.signal.aborted) return
      if (!permitted(detalle, 'rechazar')) throw new Error('Esta ficha ya no permite el rechazo por tu cuenta. Actualiza la bandeja.')
      setRejectSelection({ key, detalle })
    } catch (error) {
      if (!controller.signal.aborted) setActionError({ key, text: error instanceof Error ? error.message : 'No se pudo preparar el rechazo.' })
    } finally {
      extraControllers.current.delete(controller)
      if (!controller.signal.aborted) setRejectLookup(null)
    }
  }

  const returnState = { recepcionReturn: { actor, scrollY: id ? scrollReturn(location.state, actor) : window.scrollY } }
  const back = () => navigate(`${BASE}${location.search}`, { state: returnState })
  const detail = id ? visible?.details[id]?.data : undefined
  const locked = command.busy || Boolean(command.pending || command.receipt)
  const subtitle = !allowed ? 'Recepción y recuperación de operaciones propias' : !visible ? 'Cargando…' : visible.error ? 'Error al cargar' : id ? detail?.codigo_trazabilidad : `${visible.list.length} pendiente${visible.list.length === 1 ? '' : 's'} en esta página`

  return <main className="min-h-screen bg-brand-50 text-brand-700">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
      <header className="mb-3 flex rounded-b-3xl bg-brand-600 px-5 pb-12 pt-10 text-white shadow-soft">
        <button type="button" aria-label="Volver" disabled={command.busy} onClick={() => id ? back() : navigate('/app/home')} className="my-auto mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-50"><Icon name="arrow-left" className="h-5 w-5" /></button>
        <div><h1 className="text-3xl font-extrabold leading-tight">{id ? 'Recepcionar' : 'Recepción'}</h1><p className="mt-1 text-sm font-medium text-white/90">Semillas y esquejes</p><p className="mt-1 text-xs font-medium text-white/90">{subtitle}</p></div>
      </header>
      <div className="-mt-10 space-y-4 px-5">
        <Card className="bg-warning-50 text-xs font-semibold text-warning-800">La recepción física conforme valida la recolección. Si la ficha o el material no corresponden, rechaza con un motivo para que el recolector pueda corregir y reenviar.</Card>
        {catalogos.warning && <p className="text-xs font-semibold text-warning-800">{catalogos.warning}</p>}
        {command.pending && <Card className="space-y-3 border border-warning-200 bg-warning-50">
          <h2 className="font-extrabold">Operación pendiente de confirmar</h2>
          <p className="text-sm">{command.pending.accion === 'RECHAZAR' ? 'Rechazo' : 'Recepción'} de recolección {command.pending.recoleccion_id}.</p>
          <p className="text-xs">Conservamos la misma intención. Consulta su resultado antes de realizar otra operación.</p>
          <Button disabled={command.busy} loading={command.busy} onClick={() => void command.recuperar()}>Recuperar resultado</Button>
          {command.missing && <Button variant="secondary" disabled={command.busy} onClick={() => setRetryConfirm(true)}>Reenviar la misma intención</Button>}
        </Card>}
        {command.error && <p role="alert" className="rounded-2xl bg-danger-50 p-4 text-sm font-semibold text-danger-700">{command.error}</p>}
        {actionError?.key === key && <p role="alert" className="rounded-2xl bg-danger-50 p-4 text-sm font-semibold text-danger-700">{actionError.text}</p>}
        {command.receipt?.estado === 'RECHAZADO' && <Card className="space-y-3"><p role="alert" className="text-sm">La operación no pudo confirmarse: {command.receipt.error?.codigo}. Consulta la ficha antes de preparar otra decisión.</p><Button onClick={() => { command.clearReceipt(); setVersion(value => value + 1) }}>Actualizar ficha</Button></Card>}
        {!allowed && <Card className="space-y-3 text-sm">{m2.status === 'loading' ? <p role="status">Consultando acceso de recepción…</p> : m2.status === 'error' || m2.status === 'sessionExpired' ? <><p role="alert">{m2.error}</p><Button onClick={() => void (m2.status === 'sessionExpired' ? login() : m2.refresh())}>Reintentar acceso</Button></> : <p>Tu cuenta no tiene permiso actual para recibir material. Puedes recuperar el resultado de una operación propia pendiente.</p>}</Card>}
        {allowed && !visible && <Card><p role="status">Cargando recolecciones y permisos…</p></Card>}
        {visible?.error && <Card className="space-y-3 bg-danger-50"><p role="alert" className="text-sm text-danger-700">{visible.error}</p><Button variant="secondary" onClick={() => setVersion(value => value + 1)}>Reintentar consulta</Button></Card>}
        {visible && !visible.error && !id && <>
          {visible.list.length === 0 ? <Card className="py-8 text-center"><Icon name="check" className="mx-auto mb-3 h-10 w-10 text-success-500" /><h2 className="font-extrabold text-neutral-700">Todo al día</h2><p className="mt-1 text-sm text-neutral-500">No hay recolecciones pendientes de recepción en esta página.</p></Card> : <div className="space-y-3">{visible.list.map(item => {
            const entry = visible.details[item.recoleccion_id]
            const current = entry?.data
            // El detalle actual es la versión revisable, también para las cantidades de la tarjeta.
            return <RecoleccionRecepcionCard key={item.recoleccion_id} item={current ?? item} detalle={current} viveroNombre={catalogos.viveros[item.vivero_id]} metodoNombre={current?.metodo_id ? catalogos.metodos[current.metodo_id] : undefined} loading={!entry || !entry.data && !entry.error} error={entry?.error} busy={locked || Boolean(rejectLoading)} ownCollection={sameId(actor, item.recolector_id)} canReceive={Boolean(current && permitted(current, 'recibir'))} canReject={Boolean(current && permitted(current, 'rechazar'))} onRetry={() => void retryDetail(item.recoleccion_id)} onReceive={() => navigate(`${BASE}/${item.recoleccion_id}${location.search}`, { state: returnState })} onReject={() => void openReject(item.recoleccion_id)} />
          })}</div>}
          <nav aria-label="Páginas de recepción" className="flex flex-wrap justify-between gap-3 text-sm font-semibold">{cursor && <Link className="inline-flex min-h-11 items-center underline" to={BASE}>Primera página</Link>}{visible.next && <Link className="inline-flex min-h-11 items-center underline" to={`${BASE}?antes_de_id=${encodeURIComponent(visible.next)}`}>Siguiente página</Link>}</nav>
        </>}
        {detail && <>
          <RecoleccionRecepcionCard item={detail} detalle={detail} showActions={false} viveroNombre={catalogos.viveros[detail.vivero_id]} metodoNombre={detail.metodo_id ? catalogos.metodos[detail.metodo_id] : undefined} />
          <p className="text-xs text-neutral-500">Puedes desplegar la ficha para revisar las fotos, la ubicación y el historial. La declaración es de solo lectura.</p>
          {sameId(actor, detail.recolector_id) && <Card>Tu recolección necesita otra persona autorizada para recibirla o rechazarla, incluso si eres ADMIN.</Card>}
          {detail.recepcion ? <Card>Recepción física conforme registrada. La recolección está validada; los datos y las evidencias se conservan para consulta.</Card> : !sameId(actor, detail.recolector_id) && !permitted(detail, 'recibir') && <Card>Esta ficha no está disponible para recepción por tu cuenta. Puede haber cambiado de estado o de autorización.</Card>}
          {permitted(detail, 'recibir') && !command.pending && !command.receipt && <RecepcionForm key={`${key}:${detail.revision}`} origen={detail} actor={actorName} viveroNombre={catalogos.viveros[detail.vivero_id]} busy={command.busy} onCancel={back} onConfirm={(entrada, fotos) => command.confirmar(detail.recoleccion_id, entrada, fotos)} />}
          {permitted(detail, 'rechazar') && !locked && <Button variant="danger" fullWidth disabled={Boolean(rejectLoading)} onClick={() => void openReject(detail.recoleccion_id)}>Rechazar recolección</Button>}
        </>}
      </div>
    </div>
    {rejectTarget && permitted(rejectTarget, 'rechazar') && !locked && <RejectionDialog key={`${key}:${rejectTarget.revision}`} detalle={rejectTarget} actor={actorName} viveroNombre={catalogos.viveros[rejectTarget.vivero_id]} onCancel={() => setRejectSelection(null)} onConfirm={motivo => { setRejectSelection(null); void command.rechazar(rejectTarget.recoleccion_id, rejectTarget.revision, motivo) }} />}
    <ConfirmDialog open={retryConfirm} title="Reenviar la misma intención" description="Se conservarán la acción, clave, revisión y datos originales. No se crea otra operación." confirmLabel="Reenviar misma intención" loading={command.busy} onCancel={() => setRetryConfirm(false)} onConfirm={() => { setRetryConfirm(false); void command.reenviar() }} />
    {command.receipt?.estado === 'CONFIRMADO' && <SuccessModal title={command.receipt.resultado?.accion === 'RECHAZAR' ? 'Recolección rechazada' : 'Recepción confirmada'} description={command.receipt.resultado?.accion === 'RECHAZAR' ? 'El recolector podrá corregir la misma ficha y reenviarla.' : 'El material fue recibido y la recolección quedó validada.'} summaryText={`Recolección ${command.receipt.resultado?.recoleccion_id}`} primaryLabel="Continuar en recepción" onPrimaryAction={() => command.clearReceipt()} />}
  </main>
}

function RejectionDialog({ detalle, actor, viveroNombre, onCancel, onConfirm }: { detalle: DetalleRecepcion; actor: string; viveroNombre?: string; onCancel: () => void; onConfirm: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState('')
  return <ConfirmDialog open title="Rechazar recolección" description="El recolector podrá corregir la misma ficha y reenviarla." confirmLabel="Confirmar rechazo" variant="danger" confirmDisabled={motivo.trim().length < 10 || motivo.trim().length > 500} onCancel={onCancel} onConfirm={() => onConfirm(motivo.trim())}>
    <div className="mt-3 space-y-3 text-sm font-semibold text-neutral-600">
      <p>{detalle.codigo_trazabilidad} · {detalle.cantidad_declarada} {detalle.unidad_declarada} · {viveroNombre ?? `Vivero ${detalle.vivero_id}`}</p><p>Responsable: {actor}</p>
      <label className="block">Motivo del rechazo<textarea minLength={10} maxLength={500} value={motivo} onChange={event => setMotivo(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 p-3 focus:border-danger-400 focus:outline-none focus:ring-2 focus:ring-danger-100" /></label><p className="text-right text-xs text-neutral-500">{motivo.length}/500 · mínimo 10 caracteres</p>
    </div>
  </ConfirmDialog>
}

export default function RecoleccionesValidacionScreen() {
  const { user } = useAuth()
  if (!user) return null
  return <RecepcionWorkspace key={`${user.id}:${user.auth_id}:${localStorage.getItem('authToken') ?? ''}`} actor={user.id} actorName={user.nombre ? `${user.nombre} (${user.id})` : user.id} />
}
