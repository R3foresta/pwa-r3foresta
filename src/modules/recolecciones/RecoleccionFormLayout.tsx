// ============================================================================
// RecoleccionFormLayout.tsx
// ============================================================================
// Layout wrapper que provee el contexto del formulario a las rutas hijas
// Envuelve las 3 pantallas del formulario: Datos, Ubicación y Resumen
// ============================================================================

import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { RecoleccionesService } from '../../services/recolecciones.service'
import { RecoleccionFormProvider } from './RecoleccionFormContext'
import { getRecoleccionFormActions } from './recoleccionStatus'
import { useRecoleccionForm } from './useRecoleccionForm'

function RecoleccionFormAccess() {
  const { formData } = useRecoleccionForm()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const rawEditId = searchParams.get('editId')
  const editId = rawEditId === null ? formData.editId : Number(rawEditId)
  const [access, setAccess] = useState<{ id: number; allowed: boolean; message?: string } | null>(null)

  useEffect(() => {
    if (!editId || !Number.isSafeInteger(editId) || editId <= 0) return
    let mounted = true
    RecoleccionesService.getById(editId)
      .then(({ data }) => {
        if (mounted) setAccess({
          id: editId,
          allowed: getRecoleccionFormActions(data, user).canEdit,
          message: 'Este registro no permite edición con tu usuario o en su estado actual.',
        })
      })
      .catch((error: unknown) => {
        if (mounted) setAccess({
          id: editId,
          allowed: false,
          message: error instanceof Error ? error.message : 'No se pudo comprobar el permiso de edición.',
        })
      })
    return () => { mounted = false }
  }, [editId, user])

  if (rawEditId !== null && (!Number.isSafeInteger(editId) || !editId || editId <= 0)) {
    return <p className="p-6 text-center text-danger-700">ID de recolección inválido.</p>
  }
  if (editId && access?.id !== editId) {
    return <p className="p-6 text-center text-brand-700">Comprobando permiso de edición...</p>
  }
  if (editId && !access?.allowed) {
    return <div className="space-y-4 p-6 text-center text-neutral-700">
      <p>{access?.message}</p>
      <button type="button" className="font-semibold text-brand-700 underline" onClick={() => navigate(`/app/collections/${editId}`)}>Ver detalle</button>
    </div>
  }
  if (location.pathname.endsWith('/location') || location.pathname.endsWith('/summary')) {
    if (editId && !formData.editId) return <Navigate to={`/app/collections/new?editId=${editId}`} replace />
  }
  return <Outlet />
}

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
      <RecoleccionFormAccess />
    </RecoleccionFormProvider>
  )
}

export default RecoleccionFormLayout
