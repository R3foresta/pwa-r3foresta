import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function GuestRoute() {
  const { isAuthenticated, isProfileComplete, hydrated } = useAuth()

  if (!hydrated) {
    return null
  }

  if (isAuthenticated && !isProfileComplete) {
    return <Navigate to="/complete-profile" replace />
  }

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}

export default GuestRoute
