const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ===== TIPOS =====
export interface CreateRecoleccionDto {
  fecha: string; // YYYY-MM-DD
  cantidad: number;
  unidad: string;
  tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO';
  estado?: 'ALMACENADO' | 'EN_PROCESO' | 'UTILIZADO' | 'DESCARTADO';
  especie_nueva: boolean;
  observaciones?: string;
  ubicacion: {
    pais?: string;
    departamento?: string;
    provincia?: string;
    comunidad?: string;
    zona?: string;
    latitud: number;
    longitud: number;
  };
  vivero_id?: number;
  metodo_id: number;
  planta_id?: number;
  nombre_cientifico?: string;
  nombre_comercial?: string;
  nueva_planta?: {
    especie: string;
    nombre_cientifico: string;
    variedad: string;
    tipo_planta?: string;
    fuente: 'NATIVA' | 'INTRODUCIDA' | 'ENDEMICA';
  };
  fotos?: File[];
}

export interface Recoleccion {
  id: number;
  fecha: string;
  nombre_cientifico?: string;
  nombre_comercial?: string;
  cantidad: number;
  unidad: string;
  tipo_material: string;
  estado: string;
  especie_nueva: boolean;
  observaciones?: string;
  usuario: {
    id: number;
    nombre: string;
    username: string;
  };
  ubicacion: {
    id: number;
    pais?: string;
    departamento?: string;
    provincia?: string;
    comunidad?: string;
    zona?: string;
    latitud: number;
    longitud: number;
  };
  vivero?: {
    id: number;
    codigo: string;
    nombre: string;
    ubicacion?: {
      departamento?: string;
      comunidad?: string;
    };
  };
  metodo: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  planta?: {
    id: number;
    especie: string;
    nombre_cientifico: string;
    variedad: string;
    fuente: string;
  };
  fotos: Array<{
    id: number;
    url: string;
    formato: string;
    peso_bytes: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Vivero {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion?: {
    departamento?: string;
    comunidad?: string;
  };
}

export interface MetodoRecoleccion {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Planta {
  id: number;
  especie: string;
  nombre_cientifico: string;
  variedad: string;
  tipo_planta?: string;
  fuente: string;
}

export interface RecoleccionFilters {
  usuario_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  vivero_id?: number;
  tipo_material?: string;
  page?: number;
  limit?: number;
}

// ===== SERVICIO =====
export class RecoleccionService {
  /**
   * Crear nueva recolección con fotos usando FormData
   */
  static async create(data: CreateRecoleccionDto): Promise<{ success: boolean; data: Recoleccion }> {
    try {
      console.log('📤 Enviando recolección al backend...', data);
      console.log('🔗 URL Backend:', API_URL);
      
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token:', token ? 'Presente' : 'No encontrado');
      
      // Crear FormData según el formato del backend
      const formData = new FormData();
      
      // 1. Datos básicos de la recolección (convertir a strings)
      formData.append('fecha', data.fecha);
      formData.append('cantidad', String(data.cantidad));
      formData.append('unidad', data.unidad);
      formData.append('tipo_material', data.tipo_material);
      formData.append('estado', data.estado || 'ALMACENADO');
      formData.append('especie_nueva', String(data.especie_nueva));
      formData.append('metodo_id', String(data.metodo_id));
      
      if (data.vivero_id) {
        formData.append('vivero_id', String(data.vivero_id));
      }
      
      if (data.observaciones) {
        formData.append('observaciones', data.observaciones);
      }
      
      // 2. Si NO es especie nueva, enviar planta_id
      if (!data.especie_nueva && data.planta_id) {
        formData.append('planta_id', String(data.planta_id));
        if (data.nombre_cientifico) {
          formData.append('nombre_cientifico', data.nombre_cientifico);
        }
        if (data.nombre_comercial) {
          formData.append('nombre_comercial', data.nombre_comercial);
        }
      }
      
      // 3. Si ES especie nueva, enviar datos de nueva planta
      if (data.especie_nueva && data.nueva_planta) {
        formData.append('nueva_planta[especie]', data.nueva_planta.especie);
        formData.append('nueva_planta[nombre_cientifico]', data.nueva_planta.nombre_cientifico);
        formData.append('nueva_planta[variedad]', data.nueva_planta.variedad);
        formData.append('nueva_planta[fuente]', data.nueva_planta.fuente);
        if (data.nueva_planta.tipo_planta) {
          formData.append('nueva_planta[tipo_planta]', data.nueva_planta.tipo_planta);
        }
      }
      
      // 4. Ubicación (usando notación de corchetes)
      formData.append('ubicacion[latitud]', String(data.ubicacion.latitud));
      formData.append('ubicacion[longitud]', String(data.ubicacion.longitud));
      if (data.ubicacion.pais) {
        formData.append('ubicacion[pais]', data.ubicacion.pais);
      }
      if (data.ubicacion.departamento) {
        formData.append('ubicacion[departamento]', data.ubicacion.departamento);
      }
      if (data.ubicacion.provincia) {
        formData.append('ubicacion[provincia]', data.ubicacion.provincia);
      }
      if (data.ubicacion.comunidad) {
        formData.append('ubicacion[comunidad]', data.ubicacion.comunidad);
      }
      if (data.ubicacion.zona) {
        formData.append('ubicacion[zona]', data.ubicacion.zona);
      }
      
      // 5. Fotos (máximo 5)
      if (data.fotos && data.fotos.length > 0) {
        const maxFotos = Math.min(data.fotos.length, 5);
        for (let i = 0; i < maxFotos; i++) {
          formData.append('fotos', data.fotos[i]);
        }
        console.log(`📸 ${maxFotos} fotos agregadas al FormData`);
      }
      
      console.log('📡 Haciendo POST con FormData a:', `${API_URL}/api/recolecciones`);
      
      const response = await fetch(`${API_URL}/api/recolecciones`, {
        method: 'POST',
        headers: {
          // NO incluir Content-Type, el navegador lo configura automáticamente con boundary
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });
      
      const result = await this.handleResponse(response);
      return result;
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('No se puede conectar con el servidor. Verifica que el backend esté corriendo y que CORS esté configurado correctamente.');
      }
      throw error;
    }
  }

  /**
   * Maneja la respuesta del servidor
   */
  private static async handleResponse(response: Response): Promise<{ success: boolean; data: Recoleccion }> {
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Error ${response.status}: ${response.statusText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }
    }
    
    const result = await response.json();
    console.log('✅ Recolección creada exitosamente', result);
    return result;
  }

  /**
   * Buscar plantas por nombre
   */
  static async searchPlantas(query: string): Promise<Planta[]> {
    try {
      const response = await fetch(`${API_URL}/api/plantas/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Error al buscar plantas');
      }
      
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('❌ Error al buscar plantas:', error);
      return [];
    }
  }

  /**
   * Listar recolecciones con filtros
   */
  static async list(filters?: RecoleccionFilters): Promise<{ success: boolean; data: Recoleccion[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean } }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const token = localStorage.getItem('authToken');
      console.log('📋 Listando recolecciones con filtros:', filters);
      
      const response = await fetch(`${API_URL}/api/recolecciones?${params}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al listar recolecciones');
      }
      
      const result = await response.json();
      console.log('✅ Recolecciones cargadas:', result.data.length);
      return result;
    } catch (error) {
      console.error('❌ Error al listar recolecciones:', error);
      throw error;
    }
  }

  /**
   * Obtener detalle de una recolección
   */
  static async getById(id: number): Promise<{ success: boolean; data: Recoleccion }> {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_URL}/api/recolecciones/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener recolección');
      }
      
      return response.json();
    } catch (error) {
      console.error('❌ Error al obtener recolección:', error);
      throw error;
    }
  }

  /**
   * Listar viveros disponibles
   */
  static async getViveros(): Promise<{ success: boolean; data: Vivero[] }> {
    try {
      const response = await fetch(`${API_URL}/api/viveros`);
      
      if (!response.ok) {
        throw new Error('Error al obtener viveros');
      }
      
      return response.json();
    } catch (error) {
      console.error('❌ Error al obtener viveros:', error);
      throw error;
    }
  }

  /**
   * Listar métodos de recolección
   */
  static async getMetodos(): Promise<{ success: boolean; data: MetodoRecoleccion[] }> {
    try {
      const response = await fetch(`${API_URL}/api/metodos-recoleccion`);
      
      if (!response.ok) {
        throw new Error('Error al obtener métodos');
      }
      
      return response.json();
    } catch (error) {
      console.error('❌ Error al obtener métodos:', error);
      throw error;
    }
  }

  /**
   * Listar todas las plantas
   */
  static async getPlantas(): Promise<Planta[]> {
    try {
      const response = await fetch(`${API_URL}/api/plantas`);
      
      if (!response.ok) {
        throw new Error('Error al obtener plantas');
      }
      
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('❌ Error al obtener plantas:', error);
      return [];
    }
  }

  /**
   * Convertir base64 a File
   */
  static base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
