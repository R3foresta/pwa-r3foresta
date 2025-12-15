import { useState, useEffect } from 'react';
import { WebAuthnService } from '../services/webauthn.service';
import type { User } from '../types/auth.types';

export function useWebAuthn() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay sesión activa al cargar
  useEffect(() => {
    const token = WebAuthnService.getToken();
    if (token) {
      // Aquí podrías validar el token con el backend
      // Por ahora solo verificamos que existe
      console.log('✅ Sesión activa encontrada');
    }
  }, []);

  /**
   * Registra un nuevo usuario
   */
  const register = async (username: string, email?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await WebAuthnService.register(username, email);
      
      if (response.success && response.user) {
        setUser(response.user);
        return response;
      } else {
        throw new Error(response.message || 'Error en el registro');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inicia sesión con passkey
   */
  const login = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await WebAuthnService.login();
      
      if (response.success && response.user) {
        setUser(response.user);
        return response;
      } else {
        throw new Error(response.message || 'Error en el login');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cierra la sesión
   */
  const logout = () => {
    WebAuthnService.logout();
    setUser(null);
    setError(null);
  };

  /**
   * Verifica si hay sesión activa
   */
  const isAuthenticated = WebAuthnService.isAuthenticated();

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated,
  };
}
