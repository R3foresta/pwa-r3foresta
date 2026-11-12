import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { useOperationalAccess } from './capabilitiesContext'
import { hasViveroCapability } from './accessPolicy'

export function OperationalAccessGate({ domain }: { domain: 'M1' | 'M2' }) {
  const { m1, m2 } = useOperationalAccess()
  const { pathname, search } = useLocation()
  const { login } = useAuth()
  const creating = pathname.includes('/collections/new') && !new URLSearchParams(search).has('editId')
  const status = domain === 'M2' ? m2 : m1
  const allowed = domain === 'M2' ? m2.status === 'ready' && hasViveroCapability(m2.data, 'operar')
    : m1.status === 'ready' && Boolean(creating ? m1.data?.capacidades.crear : m1.data?.capacidades.mantener_propias)
  if (allowed) return <Outlet />
  const states = [status]
  const loading = states.some(item => item.status === 'loading')
  const failed = states.find(item => item.status === 'error' || item.status === 'sessionExpired')
  return <Card className="mx-auto my-8 max-w-md space-y-3">
    <h1 className="text-lg font-bold">{domain === 'M1' ? 'Recolección' : 'Vivero'}</h1>
    {loading ? <p role="status">Consultando tus accesos…</p> : failed ? <><p role="alert">{failed.error}</p><Button onClick={() => void (failed.status === 'sessionExpired' ? login() : failed.refresh())}>{failed.status === 'sessionExpired' ? 'Recuperar sesión con passkey' : 'Reintentar permisos'}</Button></> : <p>Tu cuenta no tiene acceso a esta operación. Solicita la asignación al administrador.</p>}
    <Link className="block text-sm underline" to="/app/home">Volver al inicio</Link>
  </Card>
}
