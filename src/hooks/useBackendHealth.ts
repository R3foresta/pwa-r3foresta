import { useEffect, useRef, useState } from 'react'
import { HealthService } from '../services/health.service'

export type BackendHealthStatus = 'checking' | 'available' | 'unavailable' | 'offline'

const HEALTH_INITIALIZATION_TIMEOUT_MS = 45_000
const HEALTH_REQUEST_TIMEOUT_MS = 8_000
const HEALTH_RETRY_DELAY_MS = 1_500

export function useBackendHealth(isOnline: boolean) {
  const [status, setStatus] = useState<BackendHealthStatus>(() =>
    isOnline ? 'checking' : 'offline',
  )
  const initializationCompleted = useRef(!isOnline)

  useEffect(() => {
    if (initializationCompleted.current) return

    if (!isOnline) {
      initializationCompleted.current = true
      setStatus('offline')
      return
    }

    if (!HealthService.isConfigured()) {
      initializationCompleted.current = true
      setStatus('unavailable')
      console.warn('VITE_API_URL no está configurada; se omitió la comprobación de /health.')
      return
    }

    let disposed = false
    let requestController: AbortController | null = null
    let retryTimer: number | null = null
    const deadline = Date.now() + HEALTH_INITIALIZATION_TIMEOUT_MS

    const finish = (nextStatus: Extract<BackendHealthStatus, 'available' | 'unavailable'>) => {
      initializationCompleted.current = true
      setStatus(nextStatus)
    }

    const checkHealth = async () => {
      if (disposed) return

      const remainingTime = deadline - Date.now()
      if (remainingTime <= 0) {
        finish('unavailable')
        return
      }

      requestController = new AbortController()
      const requestTimeout = window.setTimeout(
        () => requestController?.abort(),
        Math.min(HEALTH_REQUEST_TIMEOUT_MS, remainingTime),
      )

      let isAvailable = false
      try {
        isAvailable = await HealthService.isAvailable(requestController.signal)
      } catch {
        // Un backend dormido, una red inestable o un timeout se reintentan abajo.
      } finally {
        window.clearTimeout(requestTimeout)
        requestController = null
      }

      if (disposed) return

      if (isAvailable) {
        finish('available')
        return
      }

      const retryIn = Math.min(HEALTH_RETRY_DELAY_MS, deadline - Date.now())
      if (retryIn <= 0) {
        finish('unavailable')
        return
      }

      retryTimer = window.setTimeout(() => {
        void checkHealth()
      }, retryIn)
    }

    void checkHealth()

    return () => {
      disposed = true
      requestController?.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [isOnline])

  return status
}
