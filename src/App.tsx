import { Navigate, Route, Routes, useParams } from 'react-router-dom'
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
import { collectionRecords } from './modules/collections/data'
import { useAuth } from './contexts/AuthContext'

function RootRedirect() {
  const { isAuthenticated, hydrated } = useAuth()
  if (!hydrated) return null
  return <Navigate to={isAuthenticated ? '/app/home' : '/auth/login'} replace />
}

function CollectionDetailRoute() {
  const { id } = useParams()
  const record = collectionRecords.find((item) => item.id === id)
  if (!record) return <PlaceholderScreen title="Recolección no encontrada" />
  return <CollectionDetailScreen record={record} onBackPath="/app/collections" />
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

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomeScreen />} />
          <Route path="collections">
            <Route index element={<CollectionsScreen />} />
            <Route path=":id" element={<CollectionDetailRoute />} />
            <Route path="new" element={<CollectionFormLayout />}>
              <Route index element={<NewCollectionForm />} />
              <Route path="location" element={<LocationForm />} />
              <Route path="summary" element={<SummaryForm />} />
            </Route>
          </Route>
          <Route path="nursery" element={<PlaceholderScreen title="Vivero" />} />
          <Route path="planting" element={<PlaceholderScreen title="Plantación" />} />
          <Route path="co2" element={<PlaceholderScreen title="CO₂" />} />
          <Route path="map" element={<PlaceholderScreen title="Mapa" />} />
          <Route path="scan" element={<PlaceholderScreen title="Escanear" />} />
          <Route path="report" element={<PlaceholderScreen title="Reporte" />} />
          <Route path="profile" element={<PlaceholderScreen title="Perfil" />} />
          <Route path="*" element={<PlaceholderScreen title="Próximamente" />} />
        </Route>
      </Route>

      <Route path="*" element={<PlaceholderScreen title="Página no encontrada" />} />
    </Routes>
  )
}

export default App
