import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { canOpenAppPath, hasInternalAppAccess, isPublicImpactPath } from '../utils/appAccess'

function GuestRoute() {
  const { user, isAuthenticated, hydrated } = useAuth()
  const { state } = useLocation()

  if (!hydrated) {
    return <div role="status" className="p-6 text-center text-brand-700">Verificando sesión...</div>
  }

  if (isAuthenticated) {
    const from = (state as { from?: unknown } | null)?.from
    const fallback = typeof from === 'string' || hasInternalAppAccess(user?.rol) ? '/app/home' : '/participar'
    const destination = typeof from === 'string' && (canOpenAppPath(from, user?.rol) || isPublicImpactPath(from))
      ? from
      : fallback
    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

export default GuestRoute
