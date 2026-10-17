import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../../../../components/ui'
import { useAuth } from '../../../../contexts/AuthContext'
import RegistroScopeSelector from '../../components/RegistroScopeSelector'
import { listRegistrationDrafts, REGISTRATION_CHANGED, type RegistrationDraftSummary } from '../../commands/registrationDraftStore'

export default function RegistroSelectorScreen() {
  const { user } = useAuth()
  return <AccountRegistroSelector key={user?.id ?? ''} actorId={user?.id ?? ''} />
}

function AccountRegistroSelector({ actorId }: { actorId: string }) {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<RegistrationDraftSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    const read = () => { void listRegistrationDrafts(actorId).then(items => { if (active) { setDrafts(items); setError(null) } }).catch(() => { if (active) setError('No pudimos consultar los borradores de este dispositivo. Conserva sus datos y vuelve a abrir esta pantalla.') }) }
    read()
    window.addEventListener(REGISTRATION_CHANGED, read)
    window.addEventListener('focus', read)
    return () => { active = false; window.removeEventListener(REGISTRATION_CHANGED, read); window.removeEventListener('focus', read) }
  }, [actorId])
  return <main className="mx-auto max-w-lg space-y-5 px-5 pb-36 pt-6">
    <Button variant="ghost" onClick={() => navigate('/app/home')}>Volver al inicio</Button>
    <h1 className="text-2xl font-bold">Registrar plantación</h1>
    <p className="text-sm leading-6">Las plantas, fotos y participantes se confirman juntos al finalizar el registro.</p>
    {error && <p role="alert" className="rounded-2xl bg-warning-50 p-4 text-sm text-warning-800">{error}</p>}
    {drafts.length > 0 && <Card as="section" padding="lg">
      <h2 className="font-bold">Recuperar registros de esta cuenta</h2>
      <ul className="mt-3 space-y-3">{drafts.map(draft => <li key={draft.subcampania_id}>
        <Link to={`/app/participacion/subcampanias/${draft.subcampania_id}/registrar`} className="block rounded-2xl border border-brand-200 p-3 text-sm font-semibold underline">Subcampaña {draft.subcampania_id} · {draft.estado === 'RESULTADO_NO_CONFIRMADO' ? 'Consultar resultado pendiente' : draft.estado === 'CONFIRMADO' ? 'Ver confirmación' : draft.estado === 'RECHAZADO' ? 'Revisar borrador rechazado' : 'Continuar borrador'}</Link>
      </li>)}</ul>
    </Card>}
    <Card as="section" padding="lg"><h2 className="mb-4 font-bold">Elegir subcampaña</h2><RegistroScopeSelector onRegistrar={id => navigate(`/app/participacion/subcampanias/${id}/registrar`)} /></Card>
  </main>
}
