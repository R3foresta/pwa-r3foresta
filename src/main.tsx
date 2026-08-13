import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { PwaInstallProvider } from './contexts/PwaInstallContext'
import { registerPwa } from './pwa/registerPwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PwaInstallProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PwaInstallProvider>
    </BrowserRouter>
  </StrictMode>,
)

registerPwa()
