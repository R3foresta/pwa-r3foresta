import { lazy } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { hasInternalAppAccess } from '../../../utils/appAccess'
import ParticipacionSubcampaniaDetail from '../../participacion/components/ParticipacionSubcampaniaDetail'
import { useParticipacionCapabilities } from '../../participacion/hooks/useParticipacionCapabilities'
import { inicioReturnForActor } from '../../participacion/utils/detailNavigation'

const InternalDetail = lazy(() => import('./DetalleSubcampanaScreen'))

/** Una URL y presentación común, con lecturas separadas según la audiencia autorizada. */
export default function SubcampaniaDetailRoute() {
  const { user } = useAuth()
  const { subcampaniaId = '' } = useParams()
  const identity = `${user?.id}:${localStorage.getItem('authToken')}:${subcampaniaId}`
  if (hasInternalAppAccess(user?.rol)) return <InternalDetail key={identity} />
  return <ParticipantDetail key={identity} actorId={user?.id ?? ''} scopeId={subcampaniaId} />
}

function ParticipantDetail({ actorId, scopeId }: { actorId: string; scopeId: string }) {
  const { login } = useAuth()
  const { data, status, error, refresh } = useParticipacionCapabilities()
  const navigate = useNavigate()
  const location = useLocation()
  const ready = status === 'ready' && data?.data.actor.usuario_id === actorId && data.siguiente_cursor === null
  const scope = ready ? data.data.subcampanias.find(item => item.subcampania_id === scopeId) : undefined
  if (scope) return <ParticipacionSubcampaniaDetail actorId={actorId} scope={scope} onBack={() => navigate(inicioReturnForActor(location.state, actorId, scopeId) ?? `/participar?seleccion=${scopeId}`)} />
  return <main className="mx-auto max-w-md space-y-4 px-5 py-6">
    {status === 'loading' && <Card><p role="status">Consultando el acceso a esta subcampaña…</p></Card>}
    {(status === 'error' || status === 'sessionExpired') && <Card className="space-y-3"><p role="alert">No pudimos consultar el acceso a esta subcampaña. {error}</p><Button variant="secondary" onClick={() => { void (status === 'sessionExpired' ? login().catch(() => undefined) : refresh()) }}>{status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar acceso'}</Button></Card>}
    {ready && <Card><p role="status">La subcampaña del enlace no está disponible para esta cuenta. Elige una de tus subcampañas o consulta Impacto público.</p></Card>}
    <Link to="/participar" className="inline-flex min-h-11 items-center font-bold underline">Volver a mis subcampañas</Link>
    <Link to="/impacto" className="block py-3 font-semibold underline">Explorar impacto público</Link>
  </main>
}
