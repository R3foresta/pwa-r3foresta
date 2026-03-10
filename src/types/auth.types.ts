export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt?: Date;
  auth_id: string; // Obligatorio, viene del backend
  // Campos adicionales del perfil
  nombre?: string;
  apellido?: string;
  doc_identidad?: string;
  wallet_address?: string;
  organizacion?: string;
  contacto?: string;
  rol?: string;
  foto_perfil_url?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User; // Obligatorio en la respuesta
  token: string; // Obligatorio en la respuesta
  auth_id: string; // Obligatorio, se usa para las peticiones
  message?: string;
}

export interface ChallengeResponse {
  challenge: string;
  sessionId: string;
}
