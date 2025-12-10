import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function GuestRoute() {
  const { isAuthenticated, hydrated } = useAuth()

  if (!hydrated) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return <Outlet />
}

export default GuestRoute
