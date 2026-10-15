import { createContext } from 'react'
import type { CapacidadesLectura } from '../types'

export type CapabilitiesState = {
  data: CapacidadesLectura | null
  status: 'loading' | 'ready' | 'error' | 'sessionExpired'
  error: string | null
  refresh: () => Promise<void>
}

export const CapabilitiesContext = createContext<CapabilitiesState | null>(null)
