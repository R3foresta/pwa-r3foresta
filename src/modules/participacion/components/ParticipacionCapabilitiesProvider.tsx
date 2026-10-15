import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { ParticipacionApiError, ParticipacionService } from '../api/participacion.api'
import { CapabilitiesContext, type CapabilitiesState } from '../hooks/capabilitiesContext'
import type { CapacidadesLectura } from '../types'

// La frontera de cuenta desmonta las lecturas anteriores antes de mostrar sus hijos.
export function ParticipacionCapabilitiesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const token = localStorage.getItem('authToken')
  const identity = `${user?.auth_id ?? ''}:${user?.id ?? ''}:${token ?? ''}`
  return <AccountCapabilities key={identity} actorId={user?.id ?? null}>{children}</AccountCapabilities>
}

function AccountCapabilities({ actorId, children }: { actorId: string | null; children: ReactNode }) {
  const [state, setState] = useState<Omit<CapabilitiesState, 'refresh'>>({ data: null, status: 'loading', error: null })
  const request = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState(previous => ({ ...previous, status: 'loading', error: null }))
    try {
      let page = await ParticipacionService.capacidades({ limite: 100 }, controller.signal)
      if (!actorId || page.data.actor.usuario_id !== actorId) throw new Error('La cuenta cambió. Verifica tu sesión para consultar sus capacidades.')
      const combined: CapacidadesLectura = { ...page, data: { ...page.data, subcampanias: [...page.data.subcampanias] } }
      const cursors = new Set<string>()
      const ids = new Set(combined.data.subcampanias.map(scope => scope.subcampania_id))
      while (page.siguiente_cursor) {
        if (cursors.has(page.siguiente_cursor)) throw new Error('No se pudo completar la lista de subcampañas. Intenta consultar nuevamente.')
        cursors.add(page.siguiente_cursor)
        page = await ParticipacionService.capacidades({ limite: 100, cursor: page.siguiente_cursor }, controller.signal)
        if (page.data.actor.usuario_id !== actorId || page.data.actor.rol_global !== combined.data.actor.rol_global || JSON.stringify(page.data.capacidades_globales) !== JSON.stringify(combined.data.capacidades_globales)) {
          throw new Error('Las capacidades cambiaron durante la consulta. Actualiza la lista antes de continuar.')
        }
        for (const scope of page.data.subcampanias) {
          if (ids.has(scope.subcampania_id)) throw new Error('La lista cambió durante la consulta. Actualiza las capacidades antes de continuar.')
          ids.add(scope.subcampania_id)
          combined.data.subcampanias.push(scope)
        }
        combined.observado_en = page.observado_en
      }
      combined.siguiente_cursor = null
      if (!controller.signal.aborted) setState({ data: combined, status: 'ready', error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      setState(previous => ({
        ...previous,
        status: error instanceof ParticipacionApiError && error.status === 401 ? 'sessionExpired' : 'error',
        error: error instanceof Error ? error.message : 'No se pudieron consultar las capacidades. Intenta nuevamente.',
      }))
    }
  }, [actorId])

  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onFocus)
    return () => {
      request.current?.abort()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
    }
  }, [refresh])

  return <CapabilitiesContext.Provider value={{ ...state, refresh }}>{children}</CapabilitiesContext.Provider>
}
