import { client } from '@passwordless-id/webauthn';
import type { AuthResponse, ChallengeResponse } from '../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL;
// const API_URL = 'https://backend-r3foresta.onrender.com';


// Tipos extendidos para manejar propiedades adicionales de WebAuthn
interface ExtendedRegistration {
  id: string;
  credential?: { id: string };
  credentialId?: string;
  [key: string]: unknown;
}

interface ExtendedAuthentication {
  id: string;
  credentialId?: string;
  [key: string]: unknown;
}

export class WebAuthnService {
  /**
   * Obtiene un challenge del servidor
   */
  static async getChallenge(): Promise<ChallengeResponse> {
    try {
      console.log('📡 Solicitando challenge al servidor...');
      const response = await fetch(`${API_URL}/api/auth/challenge`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener el challenge');
      }

      const data = await response.json();
      console.log('✅ Challenge recibido:', data);

      if (!data.challenge) {
        console.error('❌ El servidor no devolvió un challenge válido:', data);
        throw new Error('El servidor no devolvió un challenge válido');
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getChallenge:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario con passkey
   */
  static async register(username: string, email?: string): Promise<AuthResponse> {
    try {
      console.log('🚀 Iniciando proceso de registro...');
      console.log('👤 Usuario:', username);
      console.log('📧 Email:', email || 'No proporcionado');
      
      // Verificar disponibilidad de WebAuthn
      const available = await client.isAvailable();
      if (!available) {
        throw new Error('WebAuthn no está disponible en este navegador');
      }

      // 1. Obtener challenge del servidor
      console.log('📡 Obteniendo challenge del servidor...');
      const { challenge } = await this.getChallenge();
      
      if (!challenge) {
        throw new Error('No se recibió un challenge válido del servidor');
      }
      
      console.log('✅ Challenge válido recibido');

      // 2. Crear credencial con WebAuthn
      console.log('🔐 Creando credencial WebAuthn...');
      const registration = await client.register({
        user: username,
        challenge: challenge,
        userVerification: 'required',
        timeout: 60000,
        attestation: false,
      });

      console.log('✅ Credencial creada exitosamente');
      console.log('📊 Registration completo (JSON):', JSON.stringify(registration, null, 2));
      console.log('📊 Tipo de registration:', typeof registration);
      console.log('📊 Keys de registration:', Object.keys(registration));
      
      // Intentar encontrar el credential ID en diferentes ubicaciones posibles
      const extendedReg = registration as unknown as ExtendedRegistration;
      const credId = extendedReg.credential?.id || extendedReg.credentialId || extendedReg.id;
      console.log('🔑 Credential ID encontrado:', credId);

      // 3. Enviar la credencial al servidor
      console.log('📤 Enviando registro al backend...');
      const requestBody = {
        username,
        email,
        registration: registration, // Enviamos el objeto completo tal como viene
        challenge,
      };
      console.log('📦 Body de la request (JSON):', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);
      
      const data: AuthResponse = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ Error del backend:', data.message);
        throw new Error(data.message || 'Error en el registro');
      }

      // Guardar token y auth_id (ahora son obligatorios en la respuesta)
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('auth_id', data.auth_id);
      
      console.log('✅ Token guardado en localStorage');
      console.log('✅ Auth ID guardado:', data.auth_id);
      
      // Verificar que se guardó correctamente
      const savedAuthId = localStorage.getItem('auth_id');
      console.log('🔍 Verificación - auth_id en localStorage:', savedAuthId);
      
      if (!savedAuthId) {
        console.error('⚠️ ERROR CRÍTICO: No se pudo guardar auth_id en localStorage!');
      }

      console.log('🎉 Registro exitoso!');
      return data;
    } catch (error) {
      console.error('❌ Error en register:', error);
      if (error instanceof Error) {
        console.error('Mensaje de error:', error.message);
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Autentica un usuario con passkey
   */
  static async login(): Promise<AuthResponse> {
    try {
      console.log('🚀 Iniciando proceso de login...');
      
      // Verificar disponibilidad de WebAuthn
      const available = await client.isAvailable();
      if (!available) {
        throw new Error('WebAuthn no está disponible en este navegador');
      }

      // 1. Obtener challenge del servidor
      console.log('📡 Obteniendo challenge del servidor...');
      const { challenge } = await this.getChallenge();
      
      if (!challenge) {
        throw new Error('No se recibió un challenge válido del servidor');
      }
      
      console.log('✅ Challenge válido recibido');

      // 2. Obtener credencial del usuario
      console.log('🔐 Solicitando autenticación al usuario...');
      const authentication = await client.authenticate({
        challenge: challenge,
        userVerification: 'required',
        timeout: 60000,
      });

      console.log('✅ Autenticación completada por el usuario');
      console.log('📊 Objeto authentication completo:', JSON.stringify(authentication, null, 2));
      
      const extendedAuth = authentication as unknown as ExtendedAuthentication;
      console.log('🔑 credentialId:', extendedAuth.credentialId);
      console.log('🔑 id:', extendedAuth.id);
      
      // Normalizar el objeto - asegurar que tenga credentialId
      const normalizedAuth = {
        ...authentication,
        credentialId: extendedAuth.credentialId || extendedAuth.id
      };
      
      // Verificar que tengamos el credentialId
      if (!normalizedAuth.credentialId) {
        console.error('❌ No se encontró credentialId en la respuesta');
        console.error('Objeto recibido:', authentication);
        throw new Error('No se pudo obtener el ID de la credencial');
      }
      
      console.log('✅ Credential ID normalizado:', normalizedAuth.credentialId);

      // 3. Enviar la autenticación al servidor
      console.log('📤 Enviando autenticación al backend...');
      const requestBody = {
        authentication: normalizedAuth,
        challenge: challenge,
      };
      console.log('📦 Body completo a enviar:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);
      
      const data: AuthResponse = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        console.error('❌ Error del backend:', data.message);
        throw new Error(data.message || 'Error en el login');
      }

      // Guardar token y auth_id (ahora son obligatorios en la respuesta)
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('auth_id', data.auth_id);
      
      console.log('✅ Token guardado en localStorage');
      console.log('✅ Auth ID guardado:', data.auth_id);
      
      // Verificar que se guardó correctamente
      const savedAuthId = localStorage.getItem('auth_id');
      console.log('🔍 Verificación - auth_id en localStorage:', savedAuthId);
      
      if (!savedAuthId) {
        console.error('⚠️ ERROR CRÍTICO: No se pudo guardar auth_id en localStorage!');
      }

      console.log('🎉 Login exitoso!');
      return data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      if (error instanceof Error) {
        console.error('Mensaje de error:', error.message);
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  static logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_id');
  }

  /**
   * Obtiene el token actual
   */
  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Verifica si el usuario está autenticado
   */
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
