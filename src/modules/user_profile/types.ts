export interface UserProfile {
  id?: string
  username: string
  email?: string
  auth_id?: string
  // Campos del perfil adicionales
  nombre?: string
  apellido?: string
  doc_identidad?: string
  wallet_address?: string
  organizacion?: string
  contacto?: string
  rol?: string
  createdAt?: Date
}

export interface ProfileFormData {
  nombre: string
  apellido: string
  doc_identidad: string
  wallet_address?: string
  organizacion?: string
  contacto?: string
  rol?: string
}

export interface ProfileFormResponse {
  success: boolean
  user: UserProfile
  message?: string
}

export interface ProfileUpdateRequest extends ProfileFormData {}

export interface ProfileValidationErrors {
  nombre?: string
  apellido?: string
  doc_identidad?: string
  wallet_address?: string
  contacto?: string
  general?: string
}