/* eslint-disable react-refresh/only-export-components -- Contexto y hook se exportan juntos por contrato público. */
import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types/auth.types'
import { ProfileService } from '../modules/user_profile/profile.service'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  isProfileComplete: boolean
  hydrated: boolean
  setUser: (user: User | null) => void
  login: (email: string) => Promise<void>
  logout: () => void
  updateUserFromBackend: () => Promise<User>
}

const STORAGE_KEY = 'r3foresta:user'
const AUTH_ID_KEY = 'auth_id'
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
    // Verificar si hay authId y datos de usuario guardados
    const authId = localStorage.getItem(AUTH_ID_KEY)
    const storedUser = localStorage.getItem(STORAGE_KEY)
    
    console.log('🔍 AuthContext - Inicializando:', { hasAuthId: !!authId, hasStoredUser: !!storedUser })
    
    if (authId && storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        const isProfileComplete = ProfileService.isProfileComplete(userData)
        
        console.log('✅ AuthContext: Sesión restaurada', {
          user_id: userData.id,
          auth_id: userData.auth_id,
          perfil_completo: isProfileComplete,
          datos: userData
        })
        
        return userData
      } catch (error) {
        console.error('❌ Error al parsear usuario guardado', error)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(AUTH_ID_KEY)
      }
    }
    
    console.log('❌ AuthContext: No hay sesión previa')
    return null
  })

  // Efecto para verificar datos frescos del backend cuando se carga la app
  React.useEffect(() => {
    const verifyUserData = async () => {
      const authId = localStorage.getItem(AUTH_ID_KEY)
      if (authId && user) {
        try {
          console.log('🔄 Verificando datos del usuario con el backend...')
          const userData = await ProfileService.getUserProfile()
          
          // Actualizar el usuario con los datos reales del backend
          const updatedUser: User = {
            id: userData.id?.toString() || userData.auth_id,
            username: userData.username,
            email: userData.correo,
            auth_id: userData.auth_id,
            nombre: userData.nombre || undefined,
            apellido: userData.apellido || undefined,
            doc_identidad: userData.doc_identidad || undefined,
            wallet_address: userData.wallet_address || undefined,
            organizacion: userData.organizacion || undefined,
            contacto: userData.contacto || undefined,
            rol: userData.rol || 'GENERAL',
            createdAt: userData.created_at ? new Date(userData.created_at) : undefined,
            foto_perfil_url: userData.foto_perfil_url || undefined
          }
          
          console.log('✅ Usuario verificado con backend:', updatedUser)
          setUser(updatedUser)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
        } catch {
          console.log('⚠️ No se pudieron obtener datos frescos, usando cache local')
        }
      }
    }

    void verifyUserData()
    // La sesión local se usa de inmediato y este refresco continúa en segundo plano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email: string) => {
    // TODO: Aquí debería ir la lógica real de WebAuthn
    // Por ahora mantenemos el mock para no romper el flujo existente
    const mockUser: User = { 
      id: '1',
      username: email, 
      email, 
      rol: 'GENERAL',
      auth_id: 'mock_auth_id'
      // Los campos de perfil vienen null/undefined para simular perfil incompleto
    }
    
    // Guardar authId mock
    const mockAuthId = 'mock_auth_id_' + Date.now()
    localStorage.setItem(AUTH_ID_KEY, mockAuthId)
    
    // Actualizar el usuario con el auth_id correcto
    mockUser.auth_id = mockAuthId
    
    setUser(mockUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser))
    
    console.log('✅ AuthContext: Login mock exitoso')
  }

  const updateUserFromBackend = async () => {
    try {
      console.log('🔄 Actualizando datos del usuario desde el backend...')
      const userData = await ProfileService.getUserProfile()
      
      // Actualizar el usuario con los datos reales del backend
      const updatedUser: User = {
        id: userData.id?.toString() || userData.auth_id,
        username: userData.username,
        email: userData.correo,
        auth_id: userData.auth_id,
        nombre: userData.nombre || undefined,
        apellido: userData.apellido || undefined,
        doc_identidad: userData.doc_identidad || undefined,
        wallet_address: userData.wallet_address || undefined,
        organizacion: userData.organizacion || undefined,
        contacto: userData.contacto || undefined,
        rol: userData.rol || 'GENERAL',
        createdAt: userData.created_at ? new Date(userData.created_at) : undefined,
        foto_perfil_url: userData.foto_perfil_url || undefined
      }
      
      console.log('✅ Usuario actualizado con datos del backend:', updatedUser)
      setUser(updatedUser)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser))
      
      return updatedUser
    } catch (error) {
      console.error('❌ Error al actualizar usuario desde backend:', error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(AUTH_ID_KEY)
    console.log('👋 AuthContext: Sesión cerrada')
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isProfileComplete: ProfileService.isProfileComplete(user),
      hydrated: true,
      setUser: (newUser: User | null) => {
        console.log('🔄 AuthContext - Actualizando usuario:', {
          de: user ? { id: user.id, perfil_completo: ProfileService.isProfileComplete(user) } : 'null',
          a: newUser ? { id: newUser.id, perfil_completo: ProfileService.isProfileComplete(newUser) } : 'null'
        })
        
        setUser(newUser)
        
        if (newUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
          console.log('💾 Usuario guardado en localStorage')
        } else {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(AUTH_ID_KEY)
          console.log('🗑️ Usuario removido del localStorage')
        }
      },
      login,
      logout,
      updateUserFromBackend,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
