// ============================================================================
// CollectionFormLayout.tsx
// ============================================================================
// Layout wrapper que provee el contexto del formulario a las rutas hijas
// Envuelve las 3 pantallas del formulario: NewCollectionForm, LocationForm, SummaryForm
// ============================================================================

import { Outlet } from 'react-router-dom'
import { CollectionFormProvider } from './CollectionFormContext'

/**
 * Layout del formulario de recolección
 * Provee el contexto a todos los pasos del formulario usando React Router
 * 
 * React Router renderizará automáticamente los componentes hijos en <Outlet />
 */
function CollectionFormLayout() {
  return (
    // Envuelve las rutas hijas con el Provider del contexto
    <CollectionFormProvider>
      {/* Outlet renderiza la ruta hija actual:
          - /app/collections/new → NewCollectionForm
          - /app/collections/new/location → LocationForm  
          - /app/collections/new/summary → SummaryForm */}
      <Outlet />
    </CollectionFormProvider>
  )
}

export default CollectionFormLayout
