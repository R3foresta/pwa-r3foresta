export type PwaInitializationStatus = 'checking' | 'updating' | 'ready'

let currentStatus: PwaInitializationStatus = 'checking'
const listeners = new Set<() => void>()

export function getPwaInitializationStatus() {
  return currentStatus
}

export function subscribeToPwaInitializationStatus(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setPwaInitializationStatus(status: PwaInitializationStatus) {
  if (status === currentStatus) return
  // Una actualización activada solo puede salir de este estado mediante la recarga.
  if (currentStatus === 'updating' && status === 'ready') return

  currentStatus = status
  listeners.forEach((listener) => listener())
}
