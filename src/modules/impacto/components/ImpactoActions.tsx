import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { ParticipacionCapabilitiesProvider } from '../../participacion/components/ParticipacionCapabilitiesProvider'
import { CapabilitiesContext } from '../../participacion/hooks/capabilitiesContext'
import { useParticipacionCapabilities } from '../../participacion/hooks/useParticipacionCapabilities'
import { useHasPendingAccessCommand } from '../../participacion/hooks/useHasPendingAccessCommand'
import type { CapacidadSubcampania } from '../../participacion/types'
import { ImpactoService } from '../api/impacto.api'
import { readLastCampaign, saveLastCampaign } from '../utils/lastCampaign'

type Props = { campaniaId?: string; subcampaniaId?: string; defaultEntry?: boolean }
const LINK = 'inline-flex rounded-2xl border border-brand-200 px-4 py-3 text-sm font-semibold text-brand-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400'

function hasContext(scope: CapacidadSubcampania) {
  return scope.permiso_contextual !== null && ['ACTIVA', 'COMPLETADA', 'FINALIZADA_PARCIAL'].includes(scope.estado)
}
function canRegister(scope: CapacidadSubcampania) {
  return scope.estado === 'ACTIVA' && scope.acciones.preparar_registro && scope.acciones.registrar_inicial
}
function canManage(scope: CapacidadSubcampania) {
  const actions = scope.acciones
  return actions.incorporar_plantador || actions.retirar_plantador || actions.designar_administrador || actions.cambiar_administrador || actions.retirar_administrador || actions.reemplazar_administrador
}

export default function ImpactoActions(props: Props) {
  const { user, hydrated, isAuthenticated } = useAuth()
  const sharedCapabilities = useContext(CapabilitiesContext)
  const token = localStorage.getItem('authToken')
  return <Card as="section" className="space-y-3" aria-label="Mi participación">
    <h2 className="text-lg font-bold text-brand-800">Mi participación</h2>
    {!hydrated || !isAuthenticated || !user || !token ? <>
      <p className="text-sm leading-6 text-neutral-600">Para registrar una plantación necesitas iniciar sesión y estar habilitado en una subcampaña.</p>
      <Link to="/auth/login" state={{ from: '/app/participacion/registrar' }} className={LINK}>Iniciar sesión para participar</Link>
    </> : <>
      <div className="flex flex-wrap gap-3"><Link to="/app/participacion/mis-registros" className={LINK}>Mis registros</Link><Link to="/app/profile" className={LINK}>Mi perfil</Link></div>
      {sharedCapabilities ? <AccountActions {...props} actorId={user.id} /> : <ParticipacionCapabilitiesProvider><AccountActions {...props} actorId={user.id} /></ParticipacionCapabilitiesProvider>}
    </>}
  </Card>
}

function AccountActions({ actorId, campaniaId, subcampaniaId, defaultEntry = false }: Props & { actorId: string }) {
  const { login } = useAuth()
  const { data, status, error, refresh } = useParticipacionCapabilities()
  const pendingAccess = useHasPendingAccessCommand(actorId)
  const ready = status === 'ready' && data?.data.actor.usuario_id === actorId && data.siguiente_cursor === null
  const scopes = ready ? data.data.subcampanias : []
  const scoped = scopes.filter(scope => (!campaniaId || scope.campania_id === campaniaId) && (!subcampaniaId || scope.subcampania_id === subcampaniaId))
  const registering = scoped.filter(canRegister)
  const managing = scoped.some(canManage)
  const campaigns = [...new Map(scopes.filter(hasContext).map(scope => [scope.campania_id, scope.campania_nombre])).entries()]
  const rememberCampaign = ready && Boolean(campaniaId) && scoped.some(hasContext)

  useEffect(() => {
    if (rememberCampaign && campaniaId) saveLastCampaign(actorId, campaniaId)
  }, [actorId, campaniaId, rememberCampaign])

  return <div className="space-y-3">
    {defaultEntry && <DefaultCampaign actorId={actorId} />}
    {status === 'loading' && <p role="status" className="text-sm text-neutral-600">Consultando acciones disponibles…</p>}
    {(status === 'error' || status === 'sessionExpired') && <div className="space-y-3">
      <p role="alert" className="text-sm text-danger-700">{error} No pudimos confirmar tus acciones. Puedes seguir consultando el impacto público.</p>
      <Button variant="secondary" onClick={() => { void (status === 'sessionExpired' ? login().catch(() => undefined) : refresh()) }}>{status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar capacidades'}</Button>
    </div>}
    {ready && <>
      {registering.length === 1 ? <Link to={`/app/participacion/subcampanias/${registering[0].subcampania_id}/registrar`} onClick={() => saveLastCampaign(actorId, registering[0].campania_id)} className={LINK}>Registrar plantación en {registering[0].nombre}</Link> : registering.length > 1 ? <details className="text-sm"><summary className="cursor-pointer font-semibold text-brand-800">Registrar plantación · elegir subcampaña</summary><ul className="mt-2 space-y-2">{registering.map(scope => <li key={scope.subcampania_id}><Link to={`/app/participacion/subcampanias/${scope.subcampania_id}/registrar`} onClick={() => saveLastCampaign(actorId, scope.campania_id)} className="font-semibold text-brand-700 underline">{scope.campania_nombre} · {scope.nombre}</Link></li>)}</ul></details> : <p className="text-sm leading-6 text-neutral-600">{campaniaId || subcampaniaId ? 'No tienes habilitación vigente para registrar en este ámbito.' : 'Aún no tienes subcampañas habilitadas para registrar.'} Coordina tu habilitación con el equipo responsable.</p>}
      {managing && <Link to="/app/participacion/accesos" className={LINK}>Gestionar plantadores</Link>}
      <Link to="/app/participacion/registrar" className={LINK}>{campaniaId || subcampaniaId ? 'Registrar en otras subcampañas o recuperar borrador' : 'Elegir subcampaña o recuperar borrador'}</Link>
      {campaigns.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold text-brand-800">Cambiar a una campaña habilitada</summary><ul className="mt-2 space-y-2">{campaigns.map(([id, name]) => <li key={id}><Link to={`/impacto/campanias/${id}`} onClick={() => saveLastCampaign(actorId, id)} className="font-semibold text-brand-700 underline">{name}</Link></li>)}</ul></details>}
    </>}
    {pendingAccess && <Link to="/app/participacion/accesos" className={LINK}>Recuperar envío pendiente de esta cuenta</Link>}
  </div>
}

function DefaultCampaign({ actorId }: { actorId: string }) {
  const navigate = useNavigate()
  const { data, status } = useParticipacionCapabilities()
  const [attempt, setAttempt] = useState(0)
  const [failure, setFailure] = useState<{ attempt: number; message: string } | null>(null)
  const preferred = readLastCampaign(actorId)
  const allowed = status === 'ready' && data?.data.actor.usuario_id === actorId && data.siguiente_cursor === null && data.data.subcampanias.some(scope => scope.campania_id === preferred && hasContext(scope))
  useEffect(() => {
    if (!preferred || !allowed) return
    const controller = new AbortController()
    ImpactoService.consultar({ tipo: 'campania', id: preferred }, undefined, controller.signal).then(() => {
      if (!controller.signal.aborted) navigate(`/impacto/campanias/${preferred}`, { replace: true })
    }).catch((error: unknown) => {
      if (controller.signal.aborted || error instanceof Error && 'status' in error && error.status === 404) return
      setFailure({ attempt, message: 'No pudimos comprobar tu última campaña. Conservamos tu preferencia; puedes consultar el impacto global.' })
    })
    return () => controller.abort()
  }, [allowed, attempt, navigate, preferred])
  return failure?.attempt === attempt && allowed ? <div className="space-y-2"><p role="alert" className="text-sm text-warning-800">{failure.message}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Reintentar última campaña</Button></div> : null
}
