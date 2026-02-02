// ============================================================================
// CollectionFormContext.tsx
// ============================================================================
// Context API para gestionar el estado del formulario de recolección
// Permite compartir datos entre los 3 pasos del formulario sin prop drilling
// ============================================================================

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { initialFormData, type CollectionFormData } from './formTypes'

/**
 * Tipo de valor que expone el contexto
 * Define las operaciones disponibles para manipular el formulario
 */
type ContextValue = {
  formData: CollectionFormData              // Estado actual del formulario completo
  updateForm: (data: Partial<CollectionFormData>) => void  // Actualiza campos del formulario
  resetForm: () => void                      // Reinicia el formulario a valores iniciales
}

// Crea el contexto con valor inicial undefined (se valida en el hook personalizado)
const CollectionFormContext = createContext<ContextValue | undefined>(undefined)

/**
 * Provider del contexto de formulario de recolección
 * Envuelve los componentes que necesitan acceso al estado del formulario
 * 
 * @param {ReactNode} children - Componentes hijos que tendrán acceso al contexto
 */
export function CollectionFormProvider({ children }: { children: ReactNode }) {
  // Estado principal: almacena todos los datos del formulario multi-paso
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData)

  /**
   * Actualiza campos específicos del formulario
   * Hace merge con el estado actual, no reemplaza todo
   * 
   * @param {Partial<CollectionFormData>} data - Campos a actualizar
   */
  const updateForm = (data: Partial<CollectionFormData>) => {
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
  return <CollectionFormContext.Provider value={value}>{children}</CollectionFormContext.Provider>
}

/**
 * Hook personalizado para acceder al contexto del formulario
 * Debe usarse dentro de un CollectionFormProvider
 * 
 * @returns {ContextValue} Objeto con formData, updateForm y resetForm
 * @throws {Error} Si se usa fuera del Provider
 */
export function useCollectionForm() {
  const ctx = useContext(CollectionFormContext)
  if (!ctx) {
    throw new Error('useCollectionForm must be used within a CollectionFormProvider')
  }
  return ctx
}
