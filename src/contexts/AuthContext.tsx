/* eslint-disable react-refresh/only-export-components -- Contexto y hook se exportan juntos por contrato público. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AuthResponse, User } from '../types/auth.types'
import { ProfileRequestError, ProfileService } from '../modules/user_profile/profile.service'
import type { UserProfileResponse } from '../modules/user_profile/types'
import { WebAuthnService } from '../services/webauthn.service'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isProfileComplete: boolean
  hydrated: boolean
  sessionError: string | null
  canRetrySession: boolean
  login: () => Promise<void>
  register: (username: string, email: string) => Promise<void>
  retrySession: () => Promise<void>
  logout: () => void
  updateUserFromBackend: () => Promise<User>
}

const USER_KEY = 'r3foresta:user'
const TOKEN_KEY = 'authToken'
const AUTH_ID_KEY = 'auth_id'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toUser(profile: UserProfileResponse): User {
  return {
    id: profile.id?.toString() || profile.auth_id,
    username: profile.username,
    email: profile.correo,
    auth_id: profile.auth_id,
    nombre: profile.nombre || undefined,
    apellido: profile.apellido || undefined,
    doc_identidad: profile.doc_identidad || undefined,
    wallet_address: profile.wallet_address || undefined,
    organizacion: profile.organizacion || undefined,
    contacto: profile.contacto || undefined,
    rol: profile.rol || undefined,
    createdAt: profile.created_at ? new Date(profile.created_at) : undefined,
    foto_perfil_url: profile.foto_perfil_url || undefined,
  }
}

function isInvalidSession(error: unknown): boolean {
  return error instanceof ProfileRequestError && [401, 403, 404].includes(error.status)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  // Cada operación asíncrona conserva esta versión. Logout invalida todas las anteriores.
  const revision = useRef(0)

  const clearSession = useCallback(() => {
    revision.current += 1
    WebAuthnService.clearSession()
    setUser(null)
    setSessionError(null)
    setHydrated(true)
  }, [])

  const readVerifiedProfile = useCallback(async (token: string, operation: number): Promise<User> => {
    try {
      const profile = await ProfileService.getUserProfile(token)
      if (operation !== revision.current) throw new Error('La sesión cambió durante la verificación')
      const verifiedUser = toUser(profile)
      localStorage.setItem(AUTH_ID_KEY, profile.auth_id)
      localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser))
      setUser(verifiedUser)
      setSessionError(null)
      return verifiedUser
    } catch (error) {
      if (operation === revision.current) {
        setUser(null)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(AUTH_ID_KEY)
        if (isInvalidSession(error)) {
          WebAuthnService.clearSession()
          setSessionError('Tu sesión expiró. Ingresa nuevamente con tu passkey.')
        } else {
          setSessionError('No pudimos verificar tu sesión. Revisa la conexión e intenta de nuevo.')
        }
      }
      throw error
    }
  }, [])

  const retrySession = useCallback(async () => {
    const token = WebAuthnService.getToken()
    if (!token) {
      clearSession()
      setHydrated(true)
      return
    }
    const operation = ++revision.current
    try {
      await readVerifiedProfile(token, operation)
    } finally {
      if (operation === revision.current) setHydrated(true)
    }
  }, [clearSession, readVerifiedProfile])

  useEffect(() => {
    void retrySession().catch(() => {
      // El error ya está disponible en sessionError y el arranque se libera.
    })
    return () => { revision.current += 1 }
  }, [retrySession])

  const acceptAuthResponse = useCallback(async (response: AuthResponse, operation: number) => {
    if (operation !== revision.current) return
    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(AUTH_ID_KEY, response.auth_id)
    await readVerifiedProfile(response.token, operation)
  }, [readVerifiedProfile])

  const login = useCallback(async () => {
    const operation = ++revision.current
    const response = await WebAuthnService.login()
    await acceptAuthResponse(response, operation)
  }, [acceptAuthResponse])

  const register = useCallback(async (username: string, email: string) => {
    const operation = ++revision.current
    const response = await WebAuthnService.register(username, email)
    await acceptAuthResponse(response, operation)
  }, [acceptAuthResponse])

  const updateUserFromBackend = useCallback(async (): Promise<User> => {
    const token = WebAuthnService.getToken()
    if (!token) throw new ProfileRequestError(401, 'La sesión no tiene token')
    const operation = revision.current
    return readVerifiedProfile(token, operation)
  }, [readVerifiedProfile])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: Boolean(user) && Boolean(WebAuthnService.getToken()),
      isProfileComplete: ProfileService.isProfileComplete(user),
      hydrated,
      sessionError,
      canRetrySession: Boolean(WebAuthnService.getToken()),
      login,
      register,
      retrySession,
      logout: clearSession,
      updateUserFromBackend,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
