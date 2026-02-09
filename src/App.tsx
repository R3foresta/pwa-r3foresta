import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import GuestRoute from './routes/GuestRoute'
import HomeScreen from './modules/home/HomeScreen'
import CollectionsScreen from './modules/collections/CollectionsScreen'
import CollectionDetailScreen from './modules/collections/CollectionDetailScreen'
import NewCollectionForm from './modules/collections/NewCollectionForm'
import LocationForm from './modules/collections/LocationForm'
import SummaryForm from './modules/collections/SummaryForm'
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
import { CompleteProfileScreen } from './modules/user_profile'

function RootRedirect() {
  const { isAuthenticated, isProfileComplete, hydrated } = useAuth()
  
  if (!hydrated) return null
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  
  if (isAuthenticated && !isProfileComplete) {
    return <Navigate to="/complete-profile" replace />
  }
  
  return <Navigate to="/app/home" replace />
}

// Guard para la ruta de completar perfil: requiere auth pero NO perfil completo
function CompleteProfileRoute() {
  const { isAuthenticated, isProfileComplete, hydrated } = useAuth()
  
  if (!hydrated) return null
  
  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  
  // Si ya tiene perfil completo, redirigir a home
  if (isProfileComplete) {
    return <Navigate to="/app/home" replace />
  }
  
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
            <Route index element={<CollectionsScreen />} />
            <Route path=":id" element={<CollectionDetailScreen />} />
            <Route path="new" element={<CollectionFormLayout />}>
              <Route index element={<NewCollectionForm />} />
              <Route path="location" element={<LocationForm />} />
              <Route path="summary" element={<SummaryForm />} />
            </Route>
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
          <Route path="scan" element={<PlaceholderScreen title="Escanear" />} />
          <Route path="report" element={<MapScreen />} />
          <Route path="profile" element={<PlaceholderScreen title="Perfil" />} />
          <Route path="*" element={<PlaceholderScreen title="Próximamente" />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderScreen title="Página no encontrada" />} />
    </Routes>
  )
}

export default App
