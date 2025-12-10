import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { initialFormData, type CollectionFormData } from './formTypes'

type ContextValue = {
  formData: CollectionFormData
  updateForm: (data: Partial<CollectionFormData>) => void
  resetForm: () => void
}

const CollectionFormContext = createContext<ContextValue | undefined>(undefined)

export function CollectionFormProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<CollectionFormData>(initialFormData)

  const updateForm = (data: Partial<CollectionFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const resetForm = () => setFormData(initialFormData)

  const value = useMemo(
    () => ({
      formData,
      updateForm,
      resetForm,
    }),
    [formData],
  )

  return <CollectionFormContext.Provider value={value}>{children}</CollectionFormContext.Provider>
}

export function useCollectionForm() {
  const ctx = useContext(CollectionFormContext)
  if (!ctx) {
    throw new Error('useCollectionForm must be used within a CollectionFormProvider')
  }
  return ctx
}
