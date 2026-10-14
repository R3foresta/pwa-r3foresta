import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/Icon'
import { Card } from '../components/ui'
import { canOpenAppPath } from '../utils/appAccess'

function ProtectedRoute() {
  const { user, isAuthenticated, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return <div role="status" className="p-6 text-center text-brand-700">Verificando sesión...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }

  if (!canOpenAppPath(location.pathname, user?.rol)) {
    return (
      <main className="flex min-h-screen items-center bg-brand-50 px-5 py-10 text-brand-700">
        <Card className="mx-auto w-full max-w-md" padding="lg">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <Icon name="shield" className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Acceso del equipo operativo</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Esta sección requiere una cuenta del equipo operativo. Puedes consultar y actualizar tu perfil con tu cuenta actual.
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Si necesitas trabajar en esta sección, coordina tu acceso con el equipo de R3foresta.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/app/home" className="rounded-2xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">Volver al inicio</Link>
            <Link to="/app/profile" className="rounded-2xl px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Ver mi perfil</Link>
          </div>
        </Card>
      </main>
    )
  }

  // Ya no redirigimos automáticamente al formulario de perfil
  // El usuario verá el banner en el home y decidirá cuándo completarlo
  return <Outlet />
}

export default ProtectedRoute
