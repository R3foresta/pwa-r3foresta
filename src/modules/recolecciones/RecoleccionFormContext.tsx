// ============================================================================
// RecoleccionFormContext.tsx
// ============================================================================
// Context API para gestionar el estado del formulario de recolección
// Permite compartir datos entre los 3 pasos del formulario sin prop drilling
// ============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { initialFormData, type RecoleccionFormData } from './recoleccionFormTypes'
import {
  revokeRecoleccionFormPhotoPreviewUrls,
  revokeRemovedPhotoPreviewUrls,
} from './utils/photoPreviewUrls'
import { RecoleccionFormContext, type RecoleccionFormContextValue } from './useRecoleccionForm'

/**
 * Provider del contexto de formulario de recolección
 * Envuelve los componentes que necesitan acceso al estado del formulario
 * 
 * @param {ReactNode} children - Componentes hijos que tendrán acceso al contexto
 */
export function RecoleccionFormProvider({ children }: { children: ReactNode }) {
  // Estado principal: almacena todos los datos del formulario multi-paso
  const [formData, setFormData] = useState<RecoleccionFormData>(initialFormData)
  const formDataRef = useRef(formData)

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    return () => {
      revokeRecoleccionFormPhotoPreviewUrls(formDataRef.current)
    }
  }, [])

  /**
   * Actualiza campos específicos del formulario
   * Hace merge con el estado actual, no reemplaza todo
   * 
   * @param {Partial<RecoleccionFormData>} data - Campos a actualizar
   */
  const updateForm = (data: Partial<RecoleccionFormData>) => {
    setFormData((prev) => {
      if (data.placePhotos) {
        revokeRemovedPhotoPreviewUrls(prev.placePhotos, data.placePhotos)
      }
      if (data.totalPhotos) {
        revokeRemovedPhotoPreviewUrls(prev.totalPhotos, data.totalPhotos)
      }

      const next = { ...prev, ...data }
      formDataRef.current = next
      return next
    })
  }

  /**
   * Reinicia el formulario a sus valores iniciales
   * Se usa después de enviar exitosamente la recolección
   */
  const resetForm = () => {
    setFormData((prev) => {
      revokeRecoleccionFormPhotoPreviewUrls(prev)
      formDataRef.current = initialFormData
      return initialFormData
    })
  }

  // Memoiza el objeto de contexto para evitar re-renderizados innecesarios
  // Solo se recalcula cuando formData cambia
  const value = useMemo<RecoleccionFormContextValue>(
    () => ({
      formData,
      updateForm,
      resetForm,
    }),
    [formData],
  )

  // Provee el contexto a todos los componentes hijos
  return <RecoleccionFormContext.Provider value={value}>{children}</RecoleccionFormContext.Provider>
}
