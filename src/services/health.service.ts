export type BackendHealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
  uptimeSeconds: number
}

const RAW_API_URL = import.meta.env.VITE_API_URL as string | undefined
const API_ORIGIN = RAW_API_URL?.replace(/\/+$/, '') || null

function isBackendHealthResponse(value: unknown): value is BackendHealthResponse {
  if (!value || typeof value !== 'object') return false

  const health = value as Partial<BackendHealthResponse>
  return (
    health.status === 'ok' &&
    typeof health.service === 'string' &&
    typeof health.timestamp === 'string' &&
    typeof health.uptimeSeconds === 'number'
  )
}

export class HealthService {
  static isConfigured() {
    return Boolean(API_ORIGIN)
  }

  static async isAvailable(signal?: AbortSignal) {
    if (!API_ORIGIN) return false

    const response = await fetch(`${API_ORIGIN}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })

    if (!response.ok) return false

    const payload = (await response.json()) as unknown
    return isBackendHealthResponse(payload)
  }
}
