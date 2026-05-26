import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import GuestRoute from './routes/GuestRoute'
import HomeScreen from './modules/home/HomeScreen'
import PwaInstallPrompt from './components/PwaInstallPrompt'
import {
  RecoleccionDetailScreen,
  RecoleccionNuevaEvidenciaScreen,
  RecoleccionesScreen,
  RecoleccionesValidacionScreen,
} from './modules/recolecciones'
import PlaceholderScreen from './modules/PlaceholderScreen'
import RecoleccionFormDatosScreen from './modules/recolecciones/RecoleccionFormDatosScreen'
import RecoleccionFormLayout from './modules/recolecciones/RecoleccionFormLayout'
import RecoleccionFormResumenScreen from './modules/recolecciones/RecoleccionFormResumenScreen'
import RecoleccionFormUbicacionScreen from './modules/recolecciones/RecoleccionFormUbicacionScreen'
import LoginScreen from './modules/auth/LoginScreen'
import RegisterScreen from './modules/auth/RegisterScreen'
import RecoverScreen from './modules/auth/RecoverScreen'
import { useAuth } from './contexts/AuthContext'
import {
  ViveroDetailScreen,
  ViveroEmbolsadoScreen,
  ViveroEventScreen,
  ViveroNewScreen,
  ViveroScreen,
} from './modules/vivero'
import MapScreen from './modules/map/MapScreen'
import { CompleteProfileScreen, PerfilScreen } from './modules/user_profile'
import ComunidadesScreen from './modules/comunidades/ComunidadesScreen'
import PlantasScreen from './modules/plantas/PlantasScreen'
import NuevaPlantaScreen from './modules/plantas/NuevaPlantaScreen'
import EditarPlantaScreen from './modules/plantas/EditarPlantaScreen'
import NuevaComunidadScreen from './modules/comunidades/NuevaComunidadScreen'
import EditarComunidadScreen from './modules/comunidades/EditarComunidadScreen'

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
  const installPromptPosition = pathname.startsWith('/app') ? 'bottom-28' : 'bottom-4'

  return (
    <>
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
            <Route path="planting" element={<PlaceholderScreen title="Plantación" />} />
            <Route path="co2" element={<PlaceholderScreen title="CO₂" />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="comunidades" element={<ComunidadesScreen />} />
            <Route path="comunidades/nueva" element={<NuevaComunidadScreen />} />
            <Route path="comunidades/:id/editar" element={<EditarComunidadScreen />} />
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

      <PwaInstallPrompt className={installPromptPosition} />
    </>
  )
}

export default App
