import { lazy, Suspense, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import GuestRoute from './routes/GuestRoute'
import PwaInstallPrompt from './components/PwaInstallPrompt'
import PlaceholderScreen from './modules/PlaceholderScreen'
import { useAuth } from './contexts/AuthContext'
import AppInitializationScreen from './components/AppInitializationScreen'
import {
  getPwaInitializationStatus,
  subscribeToPwaInitializationStatus,
} from './pwa/pwaStatus'

const HomeScreen = lazy(() => import('./modules/home/HomeScreen'))
const LoginScreen = lazy(() => import('./modules/auth/LoginScreen'))
const RegisterScreen = lazy(() => import('./modules/auth/RegisterScreen'))
const RecoverScreen = lazy(() => import('./modules/auth/RecoverScreen'))
const RecoleccionesScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionesScreen'),
)
const RecoleccionDetailScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionDetailScreen'),
)
const RecoleccionNuevaEvidenciaScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionNuevaEvidenciaScreen'),
)
const RecoleccionesValidacionScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionesValidacionScreen'),
)
const RecoleccionFormLayout = lazy(
  () => import('./modules/recolecciones/RecoleccionFormLayout'),
)
const RecoleccionFormDatosScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionFormDatosScreen'),
)
const RecoleccionFormUbicacionScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionFormUbicacionScreen'),
)
const RecoleccionFormResumenScreen = lazy(
  () => import('./modules/recolecciones/RecoleccionFormResumenScreen'),
)
const ViveroScreen = lazy(() => import('./modules/vivero/screens/ViveroScreen'))
const ViveroDetailScreen = lazy(
  () => import('./modules/vivero/screens/ViveroDetailScreen'),
)
const ViveroNewScreen = lazy(() => import('./modules/vivero/screens/ViveroNewScreen'))
const ViveroEmbolsadoScreen = lazy(
  () => import('./modules/vivero/screens/ViveroEmbolsadoScreen'),
)
const ViveroEventScreen = lazy(
  () => import('./modules/vivero/screens/ViveroEventScreen'),
)
const PlantacionDashboardScreen = lazy(
  () => import('./modules/plantacion/screens/PlantacionDashboardScreen'),
)
const CrearCampanaScreen = lazy(
  () => import('./modules/plantacion/screens/CrearCampanaScreen'),
)
const CampaniaAdminDashboardScreen = lazy(
  () => import('./modules/plantacion/screens/CampaniaAdminDashboardScreen'),
)
const EditarCampanaScreen = lazy(
  () => import('./modules/plantacion/screens/EditarCampanaScreen'),
)
const CrearSubcampanaScreen = lazy(
  () => import('./modules/plantacion/screens/CrearSubcampanaScreen'),
)
const DetalleSubcampanaScreen = lazy(
  () => import('./modules/plantacion/screens/DetalleSubcampanaScreen'),
)
const RegistrarPlantacionScreen = lazy(
  () => import('./modules/plantacion/screens/RegistrarPlantacionScreen'),
)
const MapScreen = lazy(() => import('./modules/map/MapScreen'))
const PerfilScreen = lazy(() => import('./modules/user_profile/perfil'))
const CompleteProfileScreen = lazy(() =>
  import('./modules/user_profile/CompleteProfileScreen').then((module) => ({
    default: module.CompleteProfileScreen,
  })),
)
const ComunidadesScreen = lazy(
  () => import('./modules/comunidades/ComunidadesScreen'),
)
const NuevaComunidadScreen = lazy(
  () => import('./modules/comunidades/NuevaComunidadScreen'),
)
const EditarComunidadScreen = lazy(
  () => import('./modules/comunidades/EditarComunidadScreen'),
)
const OrganizacionesScreen = lazy(
  () => import('./modules/organizaciones/OrganizacionesScreen'),
)
const NuevaOrganizacionScreen = lazy(
  () => import('./modules/organizaciones/NuevaOrganizacionScreen'),
)
const EditarOrganizacionScreen = lazy(
  () => import('./modules/organizaciones/EditarOrganizacionScreen'),
)
const PlantasScreen = lazy(() => import('./modules/plantas/PlantasScreen'))
const NuevaPlantaScreen = lazy(() => import('./modules/plantas/NuevaPlantaScreen'))
const EditarPlantaScreen = lazy(() => import('./modules/plantas/EditarPlantaScreen'))

function RootRedirect() {
  const { isAuthenticated, hydrated } = useAuth()

  if (!hydrated) return null

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <Navigate to="/app/home" replace />
}

// Guard para la ruta de completar perfil: requiere auth
function CompleteProfileRoute() {
  const { isAuthenticated, hydrated } = useAuth()

  if (!hydrated) return null

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  // La redirección si el perfil está completo se maneja en CompleteProfileScreen
  // para permitir que se muestre el modal de éxito.

  return <CompleteProfileScreen />
}

function App() {
  const { pathname } = useLocation()
  const pwaStatus = useSyncExternalStore(
    subscribeToPwaInitializationStatus,
    getPwaInitializationStatus,
    getPwaInitializationStatus,
  )

  if (pwaStatus === 'updating') {
    return <AppInitializationScreen message="Aplicando una nueva versión" />
  }

  const installPromptPosition = pathname.startsWith('/app') ? 'bottom-28' : 'bottom-4'

  return (
    <>
      <Suspense fallback={<AppInitializationScreen message="Cargando la aplicación" />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

        <Route element={<GuestRoute />}>
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<LoginScreen />} />
            <Route path="register" element={<RegisterScreen />} />
            <Route path="recover" element={<RecoverScreen />} />
          </Route>
        </Route>

        {/* Ruta especial para completar perfil - requiere autenticación pero no perfil completo */}
        <Route path="/complete-profile" element={<CompleteProfileRoute />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeScreen />} />
            <Route path="collections">
              <Route index element={<RecoleccionesScreen />} />
              <Route path="new" element={<RecoleccionFormLayout />}>
                <Route index element={<RecoleccionFormDatosScreen />} />
                <Route path="location" element={<RecoleccionFormUbicacionScreen />} />
                <Route path="summary" element={<RecoleccionFormResumenScreen />} />
              </Route>
              <Route path="validate" element={<RecoleccionesValidacionScreen />} />
              <Route path=":id" element={<RecoleccionDetailScreen />} />
              <Route path=":id/evidencias/new" element={<RecoleccionNuevaEvidenciaScreen />} />
            </Route>
            <Route path="vivero">
              <Route index element={<ViveroScreen />} />
              <Route path="new" element={<ViveroNewScreen />} />
              <Route path=":id" element={<ViveroDetailScreen />} />
              <Route path=":id/event" element={<Navigate to="embolsado" replace />} />
              <Route path=":id/event/new" element={<ViveroEmbolsadoScreen />} />
              <Route path=":id/event/:tipo" element={<ViveroEventScreen />} />
              <Route
                path=":id/update"
                element={<PlaceholderScreen title="Actualizar lote de vivero" />}
              />
            </Route>
            <Route path="nursery" element={<Navigate to="/app/vivero" replace />} />
            <Route path="planting">
              <Route index element={<PlantacionDashboardScreen />} />
              <Route path="campanias/new" element={<CrearCampanaScreen />} />
              <Route path="campanias/:campaniaId" element={<CampaniaAdminDashboardScreen />} />
              <Route
                path="campanias/:campaniaId/edit"
                element={<EditarCampanaScreen />}
              />
              <Route
                path="campanias/:campaniaId/subcampanias/new"
                element={<CrearSubcampanaScreen />}
              />
              <Route
                path="subcampanias/:subcampaniaId"
                element={<DetalleSubcampanaScreen />}
              />
              <Route
                path="subcampanias/:subcampaniaId/plantaciones/new"
                element={<RegistrarPlantacionScreen />}
              />
            </Route>
            <Route path="co2" element={<PlaceholderScreen title="CO₂" />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="comunidades" element={<ComunidadesScreen />} />
            <Route path="comunidades/nueva" element={<NuevaComunidadScreen />} />
            <Route path="comunidades/:id/editar" element={<EditarComunidadScreen />} />
            <Route path="organizaciones" element={<OrganizacionesScreen />} />
            <Route path="organizaciones/nueva" element={<NuevaOrganizacionScreen />} />
            <Route path="organizaciones/:id/editar" element={<EditarOrganizacionScreen />} />
            <Route path="plantas" element={<PlantasScreen />} />
            <Route path="plantas/nueva" element={<NuevaPlantaScreen />} />
            <Route path="plantas/:id/editar" element={<EditarPlantaScreen />} />
            <Route path="scan" element={<PlaceholderScreen title="Escanear" />} />
            <Route path="report" element={<MapScreen />} />
            <Route path="profile" element={<PerfilScreen />} />
            <Route path="edit-profile" element={<CompleteProfileScreen />} />
            <Route path="*" element={<PlaceholderScreen title="Próximamente" />} />
          </Route>
        </Route>

          <Route path="*" element={<PlaceholderScreen title="Página no encontrada" />} />
        </Routes>
      </Suspense>

      <PwaInstallPrompt className={installPromptPosition} />
    </>
  )
}

export default App
