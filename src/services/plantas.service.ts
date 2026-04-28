import type { 
  PlantaCatalogo, 
  TipoPlantaCatalogo, 
  CreatePlantaDto 
} from '../types/plantas.types';

// Definimos la URL directamente desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL;

export class PlantasService {
  // Implementamos el helper de headers localmente
  private static getAuthHeaders(): Record<string, string> {
    const authId = localStorage.getItem('auth_id');
    return {
      'Content-Type': 'application/json',
      'x-auth-id': authId || '',
    };
  }

  // Implementamos el helper de respuesta localmente
  private static async parseJsonResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error en la petición');
    }
    return response.json();
  }

  static async getPlantas(): Promise<PlantaCatalogo[]> {
    const response = await fetch(`${API_URL}/api/plantas`, { 
      headers: this.getAuthHeaders() 
    });
    return this.parseJsonResponse(response);
  }

  static async getTiposPlantas(): Promise<TipoPlantaCatalogo[]> {
    const response = await fetch(`${API_URL}/api/plantas/tipos-planta`, { 
      headers: this.getAuthHeaders() 
    });
    return this.parseJsonResponse(response);
  }

  static async createPlanta(data: CreatePlantaDto): Promise<PlantaCatalogo> {
    const response = await fetch(`${API_URL}/api/plantas`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.parseJsonResponse(response);
  }

  static async updatePlanta(id: number, data: Partial<CreatePlantaDto>): Promise<PlantaCatalogo> {
    const response = await fetch(`${API_URL}/api/plantas/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.parseJsonResponse(response);
  }

  static async deletePlanta(id: number): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/plantas/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No se puede eliminar la planta.');
    }
    return true;
  }
}