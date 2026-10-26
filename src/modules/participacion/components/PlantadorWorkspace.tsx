import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useHasPendingAccessCommand } from '../hooks/useHasPendingAccessCommand'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import type { CapacidadSubcampania } from '../types'
import { subcampaniaDetailPath } from '../utils/detailNavigation'
import ParticipacionInicioCards from './ParticipacionInicioCards'
import ParticipacionInicioMap from './ParticipacionInicioMap'

function canManage(scope: CapacidadSubcampania) {
  const actions = scope.acciones
  return actions.incorporar_plantador || actions.retirar_plantador || actions.designar_administrador || actions.cambiar_administrador || actions.retirar_administrador || actions.reemplazar_administrador
}

export default function PlantadorWorkspace({ actorId }: { actorId: string }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { data, status, error, refresh } = useParticipacionCapabilities()
  const pendingAccess = useHasPendingAccessCommand(actorId)
  const [params, setParams] = useSearchParams()
  const ready = status === 'ready' && data?.data.actor.usuario_id === actorId && data.siguiente_cursor === null
  // El DTO incluye los ámbitos globales aunque no haya acciones de escritura.
  const scopes = ready ? data.data.subcampanias : []
  const campaignId = params.get('campania_id')
  const scopeId = params.get('subcampania_id')
  const detail = Boolean(scopeId)
  const scope = scopes.find(item => item.subcampania_id === scopeId && item.campania_id === campaignId)
  const selectedId = params.get('seleccion')
  const map = !detail && params.get('vista') === 'mapa'
  const location = useLocation()
  const state: unknown = location.state
  const homeMode = state && typeof state === 'object' && 'participacionInicio' in state
    && state.participacionInicio && typeof state.participacionInicio === 'object'
    && 'actorId' in state.participacionInicio && state.participacionInicio.actorId === actorId
    && 'map' in state.participacionInicio && state.participacionInicio.map === true

  function enter(target: CapacidadSubcampania) {
    // Guardar también en la entrada anterior del historial para el botón Atrás.
    setParams({ ...(map ? { vista: 'mapa' } : {}), seleccion: target.subcampania_id }, { replace: true })
    navigate(subcampaniaDetailPath(target.subcampania_id), { state: { participacionInicio: { actorId, map } } })
  }
  function returnHome() {
    setParams({ ...(homeMode ? { vista: 'mapa' } : {}), ...(scope ? { seleccion: scope.subcampania_id } : {}) })
  }
  function homeView(showMap: boolean, selection = selectedId) {
    setParams({ ...(showMap ? { vista: 'mapa' } : {}), ...(selection ? { seleccion: selection } : {}) }, { replace: true })
  }

  return <div className="space-y-4">
    {status === 'loading' && <Card><p role="status" className="text-sm text-neutral-600">Consultando tus campañas y subcampañas…</p></Card>}
    {(status === 'error' || status === 'sessionExpired') && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{error} No pudimos consultar tus subcampañas.</p><Button variant="secondary" onClick={() => { void (status === 'sessionExpired' ? login().catch(() => undefined) : refresh()) }}>{status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar campañas'}</Button><Link to="/impacto" className="block py-2 text-sm font-semibold underline">Explorar impacto público</Link></Card>}
    {ready && !scopes.length && <Card className="space-y-3"><h2 className="text-lg font-bold">Todavía no tienes subcampañas asignadas</h2><p className="text-sm leading-6 text-neutral-600">Coordina con el equipo responsable para que habilite tu cuenta en las zonas donde vas a plantar.</p><Link to="/impacto" className="inline-flex min-h-11 items-center text-sm font-semibold underline">Explorar las campañas</Link></Card>}
    {ready && detail && <>
      <Button variant="secondary" className="min-h-11" onClick={returnHome}>Volver a mis subcampañas</Button>
      {scope ? <>
        <Navigate to={subcampaniaDetailPath(scope.subcampania_id, params)} replace state={location.state} />
      </> : <Card><p role="status">La subcampaña del enlace no está disponible para esta cuenta. Vuelve al inicio para elegir otra zona o consulta Impacto público.</p><Link to="/impacto" className="inline-flex min-h-11 items-center font-semibold underline">Explorar impacto público</Link></Card>}
    </>}
    {ready && !detail && scopes.length > 0 && <>
      <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-brand-800">Mis subcampañas</h2><p className="mt-1 text-sm text-neutral-600">Elige dónde vas a participar.</p></div><Button variant="secondary" className="min-h-11" onClick={() => homeView(true)}>Ver mapa</Button></header>
      <ParticipacionInicioCards scopes={scopes} selectedId={selectedId} onEnter={enter} />
      {map && <ParticipacionInicioMap scopes={scopes} selectedId={selectedId} onSelect={id => homeView(true, id)} onEnter={enter} onClose={() => homeView(false)} />}
    </>}
    <nav aria-label="Más opciones de participación" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-brand-700">
      <Link to="/app/participacion/mis-registros" className="inline-flex min-h-11 items-center underline underline-offset-4">Ver todo mi historial</Link>
      <Link to="/app/participacion/registrar" className="inline-flex min-h-11 items-center underline underline-offset-4">Recuperar un borrador</Link>
      {!detail && scopes.some(canManage) && <Link to="/app/participacion/accesos" className="inline-flex min-h-11 items-center underline underline-offset-4">Gestionar plantadores</Link>}
      {pendingAccess && <Link to="/app/participacion/accesos" className="inline-flex min-h-11 items-center underline underline-offset-4">Recuperar envío pendiente de esta cuenta</Link>}
    </nav>
  </div>
}
