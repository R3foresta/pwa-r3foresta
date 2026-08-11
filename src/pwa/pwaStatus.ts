export type PwaInitializationStatus = 'updating' | 'ready'

let currentStatus: PwaInitializationStatus = 'ready'
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

  currentStatus = status
  listeners.forEach((listener) => listener())
}
