export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt?: Date;
  auth_id: string; // Obligatorio, viene del backend
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
