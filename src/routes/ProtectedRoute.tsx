import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute() {
  const { isAuthenticated, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute
