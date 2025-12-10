import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type User = {
  email: string
  name?: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'r3foresta:user'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (error) {
        console.error('Error parsing stored user', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setHydrated(true)
  }, [])

  const login = async (email: string) => {
    const mockUser: User = { email, name: 'Pablo' }
    setUser(mockUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      hydrated,
      login,
      logout,
    }),
    [user, hydrated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
