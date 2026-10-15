import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { Button, Card } from '../../../components/ui'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import { useHasPendingAccessCommand } from '../hooks/useHasPendingAccessCommand'

export default function GestionAccesosEntry() {
  const { user, login } = useAuth()
  const hasPending = useHasPendingAccessCommand(user?.id ?? null)
  const { data, status, error, refresh } = useParticipacionCapabilities()
  const canManage = data?.data.subcampanias.some(scope => scope.acciones.incorporar_plantador || scope.acciones.retirar_plantador || scope.acciones.designar_administrador || scope.acciones.cambiar_administrador || scope.acciones.retirar_administrador || scope.acciones.reemplazar_administrador)
  return (
    <Card as="section" className="mt-5" padding="lg">
      <h2 className="text-lg font-bold">Gestión de accesos</h2>
      {hasPending && <Link to="/app/participacion/accesos" className="mt-3 inline-flex rounded-2xl bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-800 underline">Recuperar envío pendiente de esta cuenta</Link>}
      {status === 'loading' && <p role="status" className="mt-2 text-sm">Consultando tus capacidades…</p>}
      {(status === 'error' || status === 'sessionExpired') && (
        <div className="mt-3 space-y-3">
          <p role="alert" className="text-sm text-danger-700">{error} No pudimos confirmar las acciones disponibles.</p>
          <Button variant="secondary" onClick={() => { void (status === 'sessionExpired' ? login().catch(() => undefined) : refresh()) }}>
            {status === 'sessionExpired' ? 'Recuperar sesión' : 'Reintentar capacidades'}
          </Button>
        </div>
      )}
      {status === 'ready' && (canManage ? (
        <>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Gestiona plantadores y responsabilidades en las subcampañas que administras.</p>
          <Link to="/app/participacion/accesos" className="mt-4 inline-flex rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Gestionar accesos</Link>
        </>
      ) : <p className="mt-2 text-sm leading-6 text-neutral-600">Tu cuenta no tiene subcampañas habilitadas para gestionar accesos. Coordina la habilitación con el equipo responsable.</p>)}
    </Card>
  )
}
