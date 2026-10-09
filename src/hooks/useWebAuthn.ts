import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useWebAuthn() {
  const { user, isAuthenticated, login: loginSession, register: registerSession, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la autenticación')
      throw cause
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: () => run(loginSession),
    register: (username: string, email: string) => run(() => registerSession(username, email)),
    logout,
  }
}
