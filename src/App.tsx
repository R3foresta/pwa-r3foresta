import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import GuestRoute from './routes/GuestRoute'
import HomeScreen from './modules/home/HomeScreen'
import NewCollectionForm from './modules/collections/NewCollectionForm'
import LocationForm from './modules/collections/LocationForm'
import SummaryForm from './modules/collections/SummaryForm'
import {
  NuevaEvidenciaRecoleccionV2Screen,
  RecoleccionV2DetailScreen,
  RecoleccionesV2Screen,
} from './modules/recolecciones_v2'
import PlaceholderScreen from './modules/PlaceholderScreen'
import CollectionFormLayout from './modules/collections/CollectionFormLayout'
import LoginScreen from './modules/auth/LoginScreen'
import RegisterScreen from './modules/auth/RegisterScreen'
import RecoverScreen from './modules/auth/RecoverScreen'
import { useAuth } from './contexts/AuthContext'
import ViveroScreen from './modules/vivero/ViveroScreen'
import ViveroDetailScreen from './modules/vivero/ViveroDetailScreen'
import ViveroNewScreen from './modules/vivero/ViveroNewScreen'
import MapScreen from './modules/map/MapScreen'
import { CompleteProfileScreen, PerfilScreen } from './modules/user_profile'
import ComunidadesScreen from './modules/comunidades/ComunidadesScreen'
import PlantasScreen from './modules/plantas/PlantasScreen'
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
  return (
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
            <Route index element={<RecoleccionesV2Screen />} />
            <Route path="new" element={<CollectionFormLayout />}>
              <Route index element={<NewCollectionForm />} />
              <Route path="location" element={<LocationForm />} />
              <Route path="summary" element={<SummaryForm />} />
            </Route>
            <Route path=":id" element={<RecoleccionV2DetailScreen />} />
            <Route path=":id/evidencias/new" element={<NuevaEvidenciaRecoleccionV2Screen />} />
          </Route>
          <Route path="vivero">
            <Route index element={<ViveroScreen />} />
            <Route path="new" element={<ViveroNewScreen />} />
            <Route path=":id" element={<ViveroDetailScreen />} />
            <Route
              path=":id/event/new"
              element={<PlaceholderScreen title="Registrar evento de germinación" />}
            />
            <Route
              path=":id/update"
              element={<PlaceholderScreen title="Actualizar fase de germinación" />}
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
          <Route path="scan" element={<PlaceholderScreen title="Escanear" />} />
          <Route path="report" element={<MapScreen />} />
          <Route path="profile" element={<PerfilScreen />} />
          <Route path="edit-profile" element={<CompleteProfileScreen />} />
          <Route path="*" element={<PlaceholderScreen title="Próximamente" />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderScreen title="Página no encontrada" />} />
    </Routes>
  )
}

export default App
