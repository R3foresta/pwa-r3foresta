import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute() {
  const { isAuthenticated, isProfileComplete, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  if (!isProfileComplete) {
    return <Navigate to="/complete-profile" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
