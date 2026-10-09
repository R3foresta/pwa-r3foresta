import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function GuestRoute() {
  const { isAuthenticated, hydrated } = useAuth()

  if (!hydrated) {
    return <div role="status" className="p-6 text-center text-brand-700">Verificando sesión...</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}

export default GuestRoute
