import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ParticipacionApiError } from '../participacion/api/participacion.transport'
import { AccesosService } from './accesos.api'
import { OperationalAccessContext, type AccessState } from './capabilitiesContext'
import type { AccesoM1, AccesoM2, DominioAcceso } from './types'

function useOwnAccess<T extends AccesoM1 | AccesoM2>(actorId: string | null, domain: DominioAcceso): AccessState<T> {
  const [state, setState] = useState<Omit<AccessState<T>, 'refresh'>>({ status: 'loading', data: null, error: null })
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ status: 'loading', data: null, error: null })
    if (!actorId) return
    try {
      const result = await (domain === 'M1' ? AccesosService.m1(actorId, null, undefined, controller.signal) : AccesosService.m2(actorId, null, undefined, controller.signal))
      if (!controller.signal.aborted) setState({ status: 'ready', data: result.data as T, error: null })
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: error instanceof ParticipacionApiError && error.status === 401 ? 'sessionExpired' : 'error', data: null, error: error instanceof Error ? error.message : 'No se pudieron consultar tus accesos.' })
    }
  }, [actorId, domain])
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => { window.clearTimeout(timer); request.current?.abort() }
  }, [refresh])
  return { ...state, refresh }
}
function AccountAccess({ actorId, children }: { actorId: string | null; children: ReactNode }) {
  const m1 = useOwnAccess<AccesoM1>(actorId, 'M1'), m2 = useOwnAccess<AccesoM2>(actorId, 'M2')
  return <OperationalAccessContext.Provider value={{ m1, m2 }}>{children}</OperationalAccessContext.Provider>
}
export function OperationalAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <AccountAccess key={`${user?.id ?? ''}:${user?.auth_id ?? ''}:${localStorage.getItem('authToken') ?? ''}`} actorId={user?.id ?? null}>{children}</AccountAccess>
}
