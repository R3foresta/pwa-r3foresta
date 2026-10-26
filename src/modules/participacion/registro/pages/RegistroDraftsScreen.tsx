import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { Card } from '../../../../components/ui'
import { useAuth } from '../../../../contexts/AuthContext'
import { hasInternalAppAccess } from '../../../../utils/appAccess'
import { listRegistrationDrafts, REGISTRATION_CHANGED, type RegistrationDraftSummary } from '../../commands/registrationDraftStore'
import { discardRegistrationDraft, RegistrationAlreadyConfirmedError } from '../../commands/discardRegistrationDraft'
import { safeParticipacionReturn } from '../../utils/detailNavigation'

const draftActions: Record<RegistrationDraftSummary['estado'], { action: string; explanation: string }> = {
  BORRADOR: { action: 'Continuar captura', explanation: 'Puedes editar fotos, ubicación y cantidades.' },
  PREPARADO: { action: 'Continuar captura', explanation: 'Tus datos locales se abrirán y se comprobará la carga de fotos.' },
  RESULTADO_NO_CONFIRMADO: { action: 'Comprobar guardado', explanation: 'El envío ya se intentó. Sus datos están congelados hasta confirmar el resultado.' },
  DESCARTE_PENDIENTE: { action: 'Comprobar descarte', explanation: 'El descarte aún no está confirmado. Podrás reintentarlo con la misma clave.' },
  RECHAZADO: { action: 'Revisar rechazo', explanation: 'El servidor rechazó este intento; puedes revisar una nueva propuesta.' },
  CONFIRMADO: { action: 'Ver confirmación', explanation: 'El servidor confirmó que la plantación quedó registrada.' },
  DESCARTADO: { action: 'Ver descarte', explanation: 'Esta captura se canceló sin registrar una plantación.' },
}

function draftsReturnTo(state: unknown, fallback: string): string {
  if (state && typeof state === 'object' && 'participacionReturnTo' in state) {
    return safeParticipacionReturn(state.participacionReturnTo) ?? fallback
  }
  return fallback
}

export default function RegistroDraftsScreen() {
  const { user } = useAuth()
  const { state } = useLocation()
  const returnTo = draftsReturnTo(state, hasInternalAppAccess(user?.rol) ? '/app/home' : '/participar')
  return <AccountDrafts key={user?.id ?? ''} actorId={user?.id ?? ''} returnTo={returnTo} />
}

function AccountDrafts({ actorId, returnTo }: { actorId: string; returnTo: string }) {
  const [drafts, setDrafts] = useState<RegistrationDraftSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedDraft, setSelectedDraft] = useState<RegistrationDraftSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [actionAlert, setActionAlert] = useState<string | null>(null)
  const deletingRef = useRef(false)
  const deletionAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    let active = true
    let requestId = 0
    const read = () => { const id = ++requestId; void listRegistrationDrafts(actorId).then(items => {
      if (active && id === requestId) {
        setDrafts(items.filter(item => item.estado !== 'CONFIRMADO' && item.estado !== 'DESCARTADO').sort((a, b) => b.actualizado_en - a.actualizado_en))
        setError(null)
        setLoading(false)
      }
    }).catch(() => { if (active && id === requestId) { setDrafts([]); setError('No pudimos consultar los borradores de este dispositivo. Conserva sus datos y vuelve a abrir esta pantalla.'); setLoading(false) } }) }
    read()
    window.addEventListener(REGISTRATION_CHANGED, read)
    window.addEventListener('focus', read)
    return () => { active = false; window.removeEventListener(REGISTRATION_CHANGED, read); window.removeEventListener('focus', read) }
  }, [actorId, refreshKey])
  useEffect(() => () => { deletionAbort.current?.abort() }, [])

  async function removeSelected() {
    if (!selectedDraft || deletingRef.current) return
    deletingRef.current = true
    const controller = new AbortController()
    deletionAbort.current = controller
    setDeleting(true)
    setActionAlert(null)
    try {
      const result = await discardRegistrationDraft(actorId, selectedDraft.subcampania_id, selectedDraft, { signal: controller.signal })
      if (controller.signal.aborted) return
      setSelectedDraft(null)
      setFeedback(result === 'LOCAL'
        ? 'El borrador y sus archivos locales se eliminaron de este dispositivo.'
        : 'La preparación quedó cerrada y el borrador local se eliminó. Las fotos no vinculadas quedaron marcadas para limpieza en el servidor; el borrado físico puede tardar.')
    } catch (reason) {
      if (controller.signal.aborted) return
      const message = reason instanceof Error ? reason.message : 'No se pudo confirmar la eliminación. Conservamos el borrador para reintentar.'
      setSelectedDraft(null)
      setActionAlert(reason instanceof RegistrationAlreadyConfirmedError ? message : `${message} La captura permanece guardada. Revisa su estado y vuelve a abrir la eliminación si deseas reintentar.`)
      setRefreshKey(value => value + 1)
    } finally {
      deletingRef.current = false
      if (deletionAbort.current === controller) deletionAbort.current = null
      if (!controller.signal.aborted) setDeleting(false)
    }
  }
  return <main className="mx-auto max-w-lg space-y-5 px-5 pb-36 pt-6">
    <Link to={returnTo} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline">{returnTo.startsWith('/app/planting/subcampanias/') ? 'Volver a la subcampaña' : 'Volver al inicio'}</Link>
    <h1 className="text-2xl font-bold">Plantaciones en Borrador</h1>
    <p className="text-sm leading-6">Aquí están las capturas de esta cuenta guardadas en este dispositivo. Los envíos pendientes aparecen para que puedas comprobar su resultado antes de continuar.</p>
    {loading && <p role="status" className="text-sm text-neutral-600">Buscando plantaciones en borrador…</p>}
    {error && <p role="alert" className="rounded-2xl bg-warning-50 p-4 text-sm text-warning-800">{error}</p>}
    {actionAlert && <p role="alert" className="rounded-2xl bg-warning-50 p-4 text-sm text-warning-800">{actionAlert}</p>}
    {feedback && <p role="status" className="rounded-2xl bg-success-50 p-4 text-sm text-success-800">{feedback}</p>}
    {drafts.length > 0 && <Card as="section" padding="lg">
      <h2 className="font-bold">Capturas por continuar o resolver</h2>
      <ul className="mt-3 space-y-3">{drafts.map(draft => <li key={draft.subcampania_id}>
        <Link to={`/app/participacion/subcampanias/${draft.subcampania_id}/registrar`} state={{ participacionReturnTo: returnTo }} aria-disabled={deleting} onClick={event => { if (deleting) event.preventDefault() }} className={`block rounded-2xl border border-brand-200 p-3 text-sm font-semibold underline ${deleting ? 'pointer-events-none opacity-50' : ''}`}>Subcampaña {draft.subcampania_id} · {draftActions[draft.estado].action}</Link>
        <p className="mt-1 px-1 text-xs text-neutral-600">{draftActions[draft.estado].explanation}</p>
        {draft.estado === 'RESULTADO_NO_CONFIRMADO'
          ? <p className="mt-2 px-1 text-xs text-neutral-600">Comprueba el guardado antes de eliminar esta captura.</p>
          : <button type="button" disabled={deleting} onClick={() => { setSelectedDraft(draft); setFeedback(null); setActionAlert(null) }} className="mt-2 min-h-11 rounded-xl border border-danger-300 bg-white px-3 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-50 disabled:opacity-50">Eliminar borrador de la subcampaña {draft.subcampania_id}</button>}
      </li>)}</ul>
    </Card>}
    {!loading && !error && drafts.length === 0 && <Card as="section"><p className="text-sm text-neutral-600">No hay plantaciones en borrador ni envíos pendientes para esta cuenta en este dispositivo.</p></Card>}
    <ConfirmDialog open={Boolean(selectedDraft)} title={`Eliminar borrador de la subcampaña ${selectedDraft?.subcampania_id ?? ''}`} description="Se cerrará la preparación antes de borrar los datos y fotos de este dispositivo. Las fotos subidas que no estén vinculadas a una plantación confirmada quedarán marcadas para limpieza en el servidor." confirmLabel="Eliminar borrador" variant="danger" loading={deleting} onConfirm={() => void removeSelected()} onCancel={() => setSelectedDraft(null)} />
  </main>
}
