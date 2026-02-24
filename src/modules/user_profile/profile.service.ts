import type { ProfileFormData, ProfileFormResponse } from './types'

const API_URL = import.meta.env.VITE_API_URL

export class ProfileService {
  /**
   * Obtiene el perfil completo del usuario desde el backend
   */
  static async getUserProfile(): Promise<any> {
    try {
      const authId = localStorage.getItem('auth_id')
      if (!authId) {
        throw new Error('No se encontró auth_id')
      }

      console.log('📤 Obteniendo perfil del usuario desde el backend...')
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'GET',
        headers: {
          'x-auth-id': authId,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error al obtener perfil: ${response.status}`)
      }

      const userData = await response.json()
      console.log('📥 Datos del perfil obtenidos:', userData)
      
      return userData
    } catch (error) {
      console.error('❌ Error al obtener perfil:', error)
      throw error
    }
  }

  /**
   * Completa el perfil del usuario después del registro
   */
  static async completeProfile(data: ProfileFormData): Promise<ProfileFormResponse> {
    try {
      console.log('📤 Enviando datos de perfil al backend...')
      console.log('📦 Datos:', data)

      const authId = localStorage.getItem('auth_id')
      if (!authId) {
        throw new Error('No se encontró auth_id')
      }

      const response = await fetch(`${API_URL}/api/users/register-form`, {
        method: 'POST',
        headers: {
          'x-auth-id': authId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log('📥 Response data:', result)

      if (!response.ok) {
        console.error('❌ Error del backend:', response.status, result.message)
        const error = new Error(result.message || 'Error al completar el perfil')
        ;(error as any).status = response.status
        throw error
      }

      console.log('✅ Perfil completado exitosamente')
      return result
    } catch (error) {
      console.error('❌ Error en completeProfile:', error)
      throw error
    }
  }

  /**
   * Verifica si el usuario tiene el perfil completo
   */
  static isProfileComplete(user: any): boolean {
    if (!user) return false
    
    // Verificar campos obligatorios
    const hasRequiredFields = 
      user.doc_identidad && 
      user.apellido &&
      user.nombre

    console.log('🔍 Verificando perfil completo:', {
      user_id: user.id,
      doc_identidad: !!user.doc_identidad,
      apellido: !!user.apellido,
      nombre: !!user.nombre,
      isComplete: hasRequiredFields
    })

    return hasRequiredFields
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
  static async updateProfilePhoto(file: File): Promise<any> {
    try {
      const authId = localStorage.getItem('auth_id')
      if (!authId) throw new Error('No se encontró auth_id')

      const formData = new FormData()
      formData.append('file', file) // 'file' debe coincidir con el Interceptor del Backend

      console.log('📤 Subiendo imagen de perfil...')
      const response = await fetch(`http://localhost:3000/api/users/profile/photo`, {
        method: 'PATCH',
        headers: {
          'x-auth-id': authId,
          // Nota: No poner 'Content-Type', el navegador lo pone con el boundary de FormData
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al subir la imagen')
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Error en updateProfilePhoto:', error)
      throw error
    }
  }
}