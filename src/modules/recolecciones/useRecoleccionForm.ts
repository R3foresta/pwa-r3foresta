import { createContext, useContext } from 'react'
import type { RecoleccionFormData } from './recoleccionFormTypes'

export type RecoleccionFormContextValue = {
  formData: RecoleccionFormData
  updateForm: (data: Partial<RecoleccionFormData>) => void
  resetForm: () => void
}

export const RecoleccionFormContext = createContext<RecoleccionFormContextValue | undefined>(undefined)

export function useRecoleccionForm() {
  const ctx = useContext(RecoleccionFormContext)
  if (!ctx) {
    throw new Error('useRecoleccionForm must be used within a RecoleccionFormProvider')
  }
  return ctx
}
