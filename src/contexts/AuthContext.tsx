import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type User = {
  email: string
  name?: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (email: string, password?: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'r3foresta:user'
const TOKEN_KEY = 'authToken'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Verificar si hay un token de WebAuthn primero
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      console.log('✅ AuthContext: Token de WebAuthn encontrado')
      // Si hay token, crear un usuario mock para mantener la sesión
      return { email: 'webauthn-user' }
    }

    // Si no hay token, verificar el usuario tradicional
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Error parsing stored user', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    return null
  })

  const login = async (email: string, password?: string) => {
    const mockUser: User = { email, name: password || 'Usuario' }
    setUser(mockUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
    console.log('👋 AuthContext: Sesión cerrada')
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      hydrated: true,
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
