export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface ChallengeResponse {
  challenge: string;
  sessionId: string;
}
