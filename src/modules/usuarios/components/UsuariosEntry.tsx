import { useOperationalAccess } from '../../accesos/capabilitiesContext'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useParticipacionCapabilities } from '../../participacion/hooks/useParticipacionCapabilities'
import { useHasPendingUserCommand } from '../hooks/useHasPendingUserCommand'

export default function UsuariosEntry() {
  const { user } = useAuth()
  const capabilities = useParticipacionCapabilities()
  const pending = useHasPendingUserCommand(user?.id ?? null)
  const { m1, m2 } = useOperationalAccess()
  const manageModules = m1.status === 'ready' && m1.data?.usuario_id === user?.id && m1.data?.activo && m1.data?.rol_global === 'ADMIN' || m2.status === 'ready' && m2.data?.usuario_id === user?.id && m2.data?.capacidades_globales.administrar
  const canAssign = capabilities.status === 'ready' && capabilities.data?.data.actor?.usuario_id === user?.id && capabilities.data?.data.actor?.rol_global === 'ADMIN' && capabilities.data?.data.capacidades_globales?.asignar_roles === true
  if (!pending && !canAssign && !manageModules) return null
  return <Card as="section" className="mt-5 space-y-3">
    <h2 className="text-lg font-bold">Usuarios y permisos</h2>
    <p className="text-sm text-neutral-600">{pending ? 'Hay un cambio de permisos pendiente de confirmar en esta cuenta.' : 'Administra el rol, Recolección y los viveros de cada cuenta.'}</p>
    <Link to="/app/usuarios" className="inline-flex min-h-11 items-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">{pending ? 'Recuperar permisos' : 'Administrar usuarios'}</Link>
  </Card>
}
