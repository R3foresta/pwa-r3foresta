import { useCallback, useSyncExternalStore } from 'react'
import { accessCommandStorageKey } from '../commands/accessCommandStore'

// La entrada de recuperación depende del envío propio, incluso después de perder permisos.
export function useHasPendingAccessCommand(actorId: string | null): boolean {
  const read = useCallback(() => {
    if (!actorId) return false
    try { return localStorage.getItem(accessCommandStorageKey(actorId)) !== null }
    catch { return true }
  }, [actorId])
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener('storage', notify)
    return () => window.removeEventListener('storage', notify)
  }, [])
  return useSyncExternalStore(subscribe, read)
}
