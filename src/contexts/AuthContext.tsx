import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type User = {
  id?: string
  username: string
  email?: string
  rol?: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  hydrated: boolean
  setUser: (user: User | null) => void
  login: (email: string) => Promise<void>
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
    // Verificar si hay token y datos de usuario guardados
    const token = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(STORAGE_KEY)
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        console.log('✅ AuthContext: Sesión restaurada', userData)
        return userData
      } catch (error) {
        console.error('❌ Error al parsear usuario guardado', error)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
    }
    
    return null
  })

  const login = async (email: string) => {
    const mockUser: User = { username: email, email, rol: 'GENERAL' }
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
      setUser: (newUser: User | null) => {
        setUser(newUser)
        if (newUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      },
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
