import { useCallback, useSyncExternalStore } from 'react'
import { moduleCommandStorageKey } from '../../accesos/moduleCommandStore'
import { roleCommandStorageKey } from '../commands/roleCommandStore'

export function useHasPendingUserCommand(actorId: string | null): boolean {
  const read = useCallback(() => {
    if (!actorId) return false
    try { return [roleCommandStorageKey(actorId), moduleCommandStorageKey(actorId, 'M1'), moduleCommandStorageKey(actorId, 'M2')].some(key => localStorage.getItem(key) !== null) }
    catch { return true }
  }, [actorId])
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener('storage', notify)
    return () => window.removeEventListener('storage', notify)
  }, [])
  return useSyncExternalStore(subscribe, read)
}
