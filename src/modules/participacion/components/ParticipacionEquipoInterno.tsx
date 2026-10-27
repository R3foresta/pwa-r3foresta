import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import ParticipacionDetalleEquipo from './ParticipacionDetalleEquipo'

/** Añade los permisos de participación al Equipo interno sin mezclar sus servicios logísticos. */
export default function ParticipacionEquipoInterno({ subcampaniaId }: { subcampaniaId: string }) {
  const { user, login } = useAuth()
  const capabilities = useParticipacionCapabilities()
  const ready = capabilities.status === 'ready' && capabilities.data?.siguiente_cursor === null && capabilities.data.data.actor.usuario_id === user?.id
  const globalAdmin = ready && capabilities.data?.data.actor.rol_global === 'ADMIN'
  const canDesignateAdmins = globalAdmin && capabilities.data?.data.capacidades_globales.designar_administradores === true
  const scope = ready ? capabilities.data?.data.subcampanias.find(item => item.subcampania_id === subcampaniaId) : undefined

  return <section className="space-y-3 border-t border-brand-100 pt-5" aria-label="Participación de la subcampaña">
    <h2 className="text-sm font-extrabold text-brand-800">Participación</h2>
    {capabilities.status === 'loading' && <p role="status" className="text-sm text-neutral-600">Consultando permisos de participación…</p>}
    {(capabilities.status === 'error' || capabilities.status === 'sessionExpired') && <div className="space-y-2 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
      <p role="alert" className="text-sm text-danger-700">{capabilities.error ?? 'No se pudieron consultar los permisos vigentes.'}</p>
      <Button size="sm" variant="secondary" onClick={() => { void (capabilities.status === 'sessionExpired' ? login() : capabilities.refresh()) }}>{capabilities.status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar'}</Button>
    </div>}
    {capabilities.status === 'ready' && !ready && <div className="space-y-2 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5"><p role="alert" className="text-sm text-danger-700">No se pudieron verificar las capacidades de esta cuenta. Actualiza la consulta antes de gestionar participantes.</p><Button size="sm" variant="secondary" onClick={() => void capabilities.refresh()}>Actualizar permisos</Button></div>}
    {ready && !scope && <div className="space-y-2 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5"><p className="text-sm text-neutral-600">La participación de esta subcampaña no está disponible en la consulta actual.</p><Button size="sm" variant="secondary" onClick={() => void capabilities.refresh()}>Actualizar permisos</Button></div>}
    {ready && scope && user?.id && <ParticipacionDetalleEquipo scope={scope} globalAdmin={Boolean(globalAdmin)} canDesignateAdmins={canDesignateAdmins} actorId={user.id} includeLogistics={false} />}
  </section>
}
