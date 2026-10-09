import type {
  ProfileFormData,
  ProfileFormResponse,
  ProfilePhotoResponse,
  UserProfileResponse,
} from './types'

const API_URL = import.meta.env.VITE_API_URL

export class ProfileRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ProfileRequestError'
    this.status = status
  }
}

export class ProfileService {
  /**
   * Obtiene el perfil completo del usuario desde el backend
   */
  static async getUserProfile(token = localStorage.getItem('authToken')): Promise<UserProfileResponse> {
    if (!token) throw new ProfileRequestError(401, 'La sesión no tiene token')

    // Un límite evita que el arranque quede detenido cuando la red no responde.
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      const response = await Promise.race([
        (async () => {
          const result = await fetch(`${API_URL}/api/users/profile`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (!result.ok) throw new ProfileRequestError(result.status, 'No se pudo verificar el perfil')
          const userData = (await result.json()) as UserProfileResponse
          if (!userData || typeof userData.auth_id !== 'string' || !userData.auth_id || typeof userData.username !== 'string') {
            throw new Error('El backend devolvió un perfil inválido')
          }
          return userData
        })(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort()
            reject(new Error('Tiempo de espera agotado al verificar la sesión'))
          }, 10000)
        }),
      ])
      return response
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  /**
   * Completa el perfil del usuario después del registro
   */
  static async completeProfile(data: ProfileFormData): Promise<ProfileFormResponse> {
      const token = localStorage.getItem('authToken')
      if (!token) throw new ProfileRequestError(401, 'La sesión no tiene token')

      const response = await fetch(`${API_URL}/api/users/register-form`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as ProfileFormResponse
      if (!response.ok) {
        const error = new Error(result.message || 'Error al completar el perfil') as Error & {
          status?: number
        }
        error.status = response.status
        throw error
      }

      return result
  }

  /**
   * Verifica si el usuario tiene el perfil completo
   */
  static isProfileComplete(
    user:
      | {
          id?: string | number | null
          doc_identidad?: string | null
          apellido?: string | null
          nombre?: string | null
        }
      | null
      | undefined,
  ): boolean {
    if (!user) return false
    
    // Verificar campos obligatorios
    const hasRequiredFields = 
      user.doc_identidad && 
      user.apellido &&
      user.nombre

    return Boolean(hasRequiredFields)
  }

  /**
   * Valida los datos del formulario
   */
  static validateProfileData(data: ProfileFormData): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    // Validaciones obligatorias
    if (!data.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio'
    }

    if (!data.apellido.trim()) {
      errors.apellido = 'El apellido es obligatorio'
    } else if (data.apellido.length > 30) {
      errors.apellido = 'El apellido debe tener máximo 30 caracteres'
    }

    if (!data.doc_identidad.trim()) {
      errors.doc_identidad = 'El documento de identidad es obligatorio'
    }

    // Validaciones opcionales - solo validar si tienen contenido real
    if (data.wallet_address && data.wallet_address.length > 0) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(data.wallet_address)) {
        errors.wallet_address = 'El wallet_address debe tener formato Ethereum (0x seguido de 40 carácteres hex)'
      } else if (data.wallet_address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
        errors.wallet_address = 'Esta wallet no es válida'
      }
    }

    if (data.contacto && data.contacto.length > 0) {
      // Validar formatos más flexibles para cada país
      const validPatterns = [
        /^\+591\d{8}$/,     // Bolivia: +591 + 8 dígitos  
        /^\+51\d{8,9}$/,    // Perú: +51 + 8-9 dígitos (móviles y fijos)
        /^\+52\d{10}$/      // México: +52 + 10 dígitos
      ]
      
      const isValid = validPatterns.some(pattern => pattern.test(data.contacto!))
      
      if (!isValid) {
        errors.contacto = 'Formato incorrecto. Verifique el número ingresado.'
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Sube la foto de perfil al servidor
   */
  static async updateProfilePhoto(file: File): Promise<ProfilePhotoResponse> {
      const token = localStorage.getItem('authToken')
      if (!token) throw new ProfileRequestError(401, 'La sesión no tiene token')

      const formData = new FormData()
      formData.append('file', file) // 'file' debe coincidir con el Interceptor del Backend

      const response = await fetch(`${API_URL}/api/users/profile/photo`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          // Nota: No poner 'Content-Type', el navegador lo pone con el boundary de FormData
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al subir la imagen')
      }

      return (await response.json()) as ProfilePhotoResponse
  }
}
