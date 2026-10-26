import { Link, Outlet } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { ParticipacionCapabilitiesProvider } from '../modules/participacion/components/ParticipacionCapabilitiesProvider'
import { useParticipacionAccountNavigation } from '../modules/participacion/hooks/useParticipacionAccountNavigation'

function AppLayout({ publicMode = false }: { publicMode?: boolean }) {
  useParticipacionAccountNavigation()
  const { isAuthenticated } = useAuth()
  if (publicMode) return <div className="min-h-screen bg-brand-50 text-brand-800">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link to="/impacto" className="flex items-center gap-2 text-lg font-bold"><Icon name="leaf" className="h-6 w-6" />R3foresta</Link><Link to={isAuthenticated ? '/app/profile' : '/auth/login'} state={{ from: '/app/profile' }} aria-label={isAuthenticated ? 'Ver mi perfil' : 'Crear mi perfil o iniciar sesión'} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft focus-visible:ring-2 focus-visible:ring-brand-500"><Icon name="user" className="h-5 w-5" /></Link></header>
    <Outlet /><BottomNav publicMode />
  </div>
  return (
    <ParticipacionCapabilitiesProvider>
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
        <Outlet />
        <BottomNav />
      </div>
    </ParticipacionCapabilitiesProvider>
  )
}

export default AppLayout
