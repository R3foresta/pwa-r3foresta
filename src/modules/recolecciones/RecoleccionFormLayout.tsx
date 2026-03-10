// ============================================================================
// RecoleccionFormLayout.tsx
// ============================================================================
// Layout wrapper que provee el contexto del formulario a las rutas hijas
// Envuelve las 3 pantallas del formulario: Datos, Ubicación y Resumen
// ============================================================================

import { Outlet } from 'react-router-dom'
import { RecoleccionFormProvider } from './RecoleccionFormContext'

/**
 * Layout del formulario de recolección
 * Provee el contexto a todos los pasos del formulario usando React Router
 * 
 * React Router renderizará automáticamente los componentes hijos en <Outlet />
 */
function RecoleccionFormLayout() {
  return (
    // Envuelve las rutas hijas con el Provider del contexto
    <RecoleccionFormProvider>
      {/* Outlet renderiza la ruta hija actual:
          - /app/collections/new → RecoleccionFormDatosScreen
          - /app/collections/new/location → RecoleccionFormUbicacionScreen
          - /app/collections/new/summary → RecoleccionFormResumenScreen */}
      <Outlet />
    </RecoleccionFormProvider>
  )
}

export default RecoleccionFormLayout
