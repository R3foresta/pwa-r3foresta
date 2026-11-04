import { useCallback, useSyncExternalStore } from 'react'
import { roleCommandStorageKey } from '../commands/roleCommandStore'

export function useHasPendingRoleCommand(actorId: string | null): boolean {
  const read = useCallback(() => {
    if (!actorId) return false
    try { return localStorage.getItem(roleCommandStorageKey(actorId)) !== null }
    catch { return true }
  }, [actorId])
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener('storage', notify)
    return () => window.removeEventListener('storage', notify)
  }, [])
  return useSyncExternalStore(subscribe, read)
}
