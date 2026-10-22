import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { hasInternalAppAccess } from '../../../utils/appAccess'
import ImpactoConsultaScreen from '../pages/ImpactoConsultaScreen'

// La entrada pública permanece global; la elección de campaña es explícita.
export default function ImpactoEntry() {
  const { user, hydrated, isAuthenticated } = useAuth()
  if (hydrated && isAuthenticated && hasInternalAppAccess(user?.rol)) return <Navigate to="/app/home" replace />
  return <ImpactoConsultaScreen />
}
