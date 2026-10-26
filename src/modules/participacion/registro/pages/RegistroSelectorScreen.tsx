import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../../../../components/ui'
import { useAuth } from '../../../../contexts/AuthContext'
import RegistroScopeSelector from '../../components/RegistroScopeSelector'
import { listRegistrationDrafts, REGISTRATION_CHANGED, type RegistrationDraftSummary } from '../../commands/registrationDraftStore'

const draftActions: Record<RegistrationDraftSummary['estado'], { action: string; explanation: string }> = {
  BORRADOR: { action: 'Continuar captura', explanation: 'Puedes editar fotos, ubicación y cantidades.' },
  PREPARADO: { action: 'Continuar captura', explanation: 'Tus datos locales se abrirán y se comprobará la carga de fotos.' },
  RESULTADO_NO_CONFIRMADO: { action: 'Comprobar guardado', explanation: 'El envío ya se intentó. Sus datos están congelados hasta confirmar el resultado.' },
  DESCARTE_PENDIENTE: { action: 'Comprobar descarte', explanation: 'El descarte aún no está confirmado. Podrás reintentarlo con la misma clave.' },
  CONFIRMADO: { action: 'Ver confirmación', explanation: 'El servidor confirmó que la plantación quedó registrada.' },
  RECHAZADO: { action: 'Revisar rechazo', explanation: 'El servidor rechazó este intento; puedes revisar una nueva propuesta.' },
  DESCARTADO: { action: 'Ver descarte', explanation: 'Esta captura se canceló sin registrar una plantación.' },
}

export default function RegistroSelectorScreen() {
  const { user } = useAuth()
  return <AccountRegistroSelector key={user?.id ?? ''} actorId={user?.id ?? ''} />
}

function AccountRegistroSelector({ actorId }: { actorId: string }) {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<RegistrationDraftSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const read = () => { void listRegistrationDrafts(actorId).then(items => { if (active) { setDrafts(items); setError(null); setLoading(false) } }).catch(() => { if (active) { setError('No pudimos consultar los borradores de este dispositivo. Conserva sus datos y vuelve a abrir esta pantalla.'); setLoading(false) } }) }
    read()
    window.addEventListener(REGISTRATION_CHANGED, read)
    window.addEventListener('focus', read)
    return () => { active = false; window.removeEventListener(REGISTRATION_CHANGED, read); window.removeEventListener('focus', read) }
  }, [actorId])
  return <main className="mx-auto max-w-lg space-y-5 px-5 pb-36 pt-6">
    <Button variant="ghost" onClick={() => navigate('/app/home')}>Volver al inicio</Button>
    <h1 className="text-2xl font-bold">Registrar plantación</h1>
    <p className="text-sm leading-6">Las plantas, fotos y participantes se confirman juntos al finalizar el registro.</p>
    <p className="text-sm text-neutral-700">Las capturas de abajo están guardadas en este dispositivo para tu cuenta. Abrir una captura consulta su estado. Confirmar una plantación o reintentar un envío pendiente puede registrarla.</p>
    {loading && <p role="status" className="text-sm text-neutral-600">Buscando capturas de esta cuenta en el dispositivo…</p>}
    {error && <p role="alert" className="rounded-2xl bg-warning-50 p-4 text-sm text-warning-800">{error}</p>}
    {drafts.length > 0 && <Card as="section" padding="lg">
      <h2 className="font-bold">Capturas de esta cuenta</h2>
      <ul className="mt-3 space-y-3">{drafts.map(draft => <li key={draft.subcampania_id}>
        <Link to={`/app/participacion/subcampanias/${draft.subcampania_id}/registrar`} className="block rounded-2xl border border-brand-200 p-3 text-sm font-semibold underline">Subcampaña {draft.subcampania_id} · {draftActions[draft.estado].action}</Link>
        <p className="mt-1 px-1 text-xs text-neutral-600">{draftActions[draft.estado].explanation}</p>
      </li>)}</ul>
    </Card>}
    {!loading && !error && drafts.length === 0 && <Card as="section"><p className="text-sm text-neutral-600">No hay capturas guardadas para esta cuenta en este dispositivo.</p></Card>}
    <Card as="section" padding="lg"><h2 className="mb-4 font-bold">Elegir subcampaña</h2><RegistroScopeSelector onRegistrar={id => navigate(`/app/participacion/subcampanias/${id}/registrar`)} /></Card>
  </main>
}
