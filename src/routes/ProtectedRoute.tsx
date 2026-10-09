import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute() {
  const { isAuthenticated, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return <div role="status" className="p-6 text-center text-brand-700">Verificando sesión...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  // Ya no redirigimos automáticamente al formulario de perfil
  // El usuario verá el banner en el home y decidirá cuándo completarlo
  return <Outlet />
}

export default ProtectedRoute
