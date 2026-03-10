// ============================================================================
// RecoleccionFormContext.tsx
// ============================================================================
// Context API para gestionar el estado del formulario de recolección
// Permite compartir datos entre los 3 pasos del formulario sin prop drilling
// ============================================================================

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { initialFormData, type RecoleccionFormData } from './recoleccionFormTypes'

/**
 * Tipo de valor que expone el contexto
 * Define las operaciones disponibles para manipular el formulario
 */
type ContextValue = {
  formData: RecoleccionFormData              // Estado actual del formulario completo
  updateForm: (data: Partial<RecoleccionFormData>) => void  // Actualiza campos del formulario
  resetForm: () => void                      // Reinicia el formulario a valores iniciales
}

// Crea el contexto con valor inicial undefined (se valida en el hook personalizado)
const RecoleccionFormContext = createContext<ContextValue | undefined>(undefined)

/**
 * Provider del contexto de formulario de recolección
 * Envuelve los componentes que necesitan acceso al estado del formulario
 * 
 * @param {ReactNode} children - Componentes hijos que tendrán acceso al contexto
 */
export function RecoleccionFormProvider({ children }: { children: ReactNode }) {
  // Estado principal: almacena todos los datos del formulario multi-paso
  const [formData, setFormData] = useState<RecoleccionFormData>(initialFormData)

  /**
   * Actualiza campos específicos del formulario
   * Hace merge con el estado actual, no reemplaza todo
   * 
   * @param {Partial<RecoleccionFormData>} data - Campos a actualizar
   */
  const updateForm = (data: Partial<RecoleccionFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  /**
   * Reinicia el formulario a sus valores iniciales
   * Se usa después de enviar exitosamente la recolección
   */
  const resetForm = () => setFormData(initialFormData)

  // Memoiza el objeto de contexto para evitar re-renderizados innecesarios
  // Solo se recalcula cuando formData cambia
  const value = useMemo(
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

/**
 * Hook personalizado para acceder al contexto del formulario
 * Debe usarse dentro de un RecoleccionFormProvider
 * 
 * @returns {ContextValue} Objeto con formData, updateForm y resetForm
 * @throws {Error} Si se usa fuera del Provider
 */
export function useRecoleccionForm() {
  const ctx = useContext(RecoleccionFormContext)
  if (!ctx) {
    throw new Error('useRecoleccionForm must be used within a RecoleccionFormProvider')
  }
  return ctx
}
