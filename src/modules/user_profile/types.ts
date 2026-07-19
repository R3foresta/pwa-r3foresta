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

export type ProfileUpdateRequest = ProfileFormData

export type UserProfileResponse = {
  id?: string | number
  username: string
  correo?: string
  auth_id: string
  nombre?: string | null
  apellido?: string | null
  doc_identidad?: string | null
  wallet_address?: string | null
  organizacion?: string | null
  contacto?: string | null
  rol?: string | null
  created_at?: string | null
  foto_perfil_url?: string | null
}

export type ProfilePhotoResponse = {
  foto_perfil_url: string
}

export interface ProfileValidationErrors {
  nombre?: string
  apellido?: string
  doc_identidad?: string
  wallet_address?: string
  contacto?: string
  general?: string
}
