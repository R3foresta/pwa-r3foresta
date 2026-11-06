import { createContext, useContext } from 'react'
import type { AccesoM1, AccesoM2 } from './types'

export type AccessState<T> = { status: 'loading' | 'ready' | 'error' | 'sessionExpired'; data: T | null; error: string | null; refresh: () => Promise<void> }
const empty = { status: 'loading' as const, data: null, error: null, refresh: async () => {} }
export const OperationalAccessContext = createContext<{ m1: AccessState<AccesoM1>; m2: AccessState<AccesoM2> }>({ m1: empty, m2: empty })
export function useOperationalAccess() { return useContext(OperationalAccessContext) }
