// ============================================================================
// recoleccion.service.ts
// ============================================================================
// Servicio HTTP para gestionar todas las operaciones relacionadas con recolecciones
// Maneja la comunicación con el backend REST API
// 
// Endpoints principales:
// - POST   /api/recolecciones           - Crear nueva recolección
// - GET    /api/recolecciones           - Listar recolecciones
// - GET    /api/recolecciones/:id       - Detalle de recolección
// - GET    /api/plantas                 - Listar plantas
// - POST   /api/plantas                 - Crear nueva planta
// - GET    /api/plantas/search          - Buscar plantas
// - GET    /api/viveros                 - Listar viveros
// - GET    /api/metodos-recoleccion     - Listar métodos
// ============================================================================

import type { UbicacionApi, UbicacionCreateInput } from '../types/ubicacion'

// URL base del backend desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================
// Define las estructuras de datos para comunicación con el backend
// TODO: Revisar si la estructura de las interfaces coincide con el backend y en especial con la estructura de la base de datos.

/**
 * DTO (Data Transfer Object) para crear una nueva recolección
 * Se envía al backend en el endpoint POST /api/recolecciones
 * 
 * El backend procesa estos datos y:
 * 1. Sube las fotos a Pinata (IPFS)
 * 2. Crea el registro en la base de datos
 * 3. Genera un NFT en la blockchain
 * 4. Retorna la recolección creada con URLs de IPFS y datos blockchain
 */
export interface CreateRecoleccionDto {
  fecha: string;                           // Fecha de recolección (YYYY-MM-DD)
  cantidad: number;                        // Cantidad recolectada
  unidad: string;                          // Unidad: "kg", "g", "unidades", etc.
  tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO'; // Tipo de material forestal
  estado?: 'ALMACENADO' | 'EN_PROCESO' | 'UTILIZADO' | 'DESCARTADO'; // Estado actual
  especie_nueva: boolean;                  // Si es una especie no registrada
  observaciones?: string;                  // Notas adicionales del recolector
  ubicacion: UbicacionCreateInput;
  vivero_id?: number;                      // ID del vivero donde se almacena (opcional)
  metodo_id: number;                       // ID del método de recolección usado
  planta_id?: number;                      // ID de la planta (si existe en catálogo)
  nombre_cientifico?: string;              // Nombre científico (opcional)
  nombre_comercial?: string;               // Nombre comercial (opcional)
  nueva_planta?: {                         // Datos de planta nueva (si especie_nueva=true)
    especie: string;                       // Nombre común
    nombre_cientifico: string;             // Nombre científico en latín
    variedad: string;                      // Variedad específica
    tipo_planta?: string;                  // Tipo: "Árbol", "Arbusto", etc.
    fuente: 'NATIVA' | 'INTRODUCIDA' | 'ENDEMICA'; // Origen de la especie
  };
  fotos?: File[];                          // Archivos de imagen (máximo 5)
}

/**
 * Interfaz completa de una recolección
 * Representa el objeto que retorna el backend con todas sus relaciones
 * Incluye datos de blockchain, fotos en IPFS y trazabilidad
 */
export interface Recoleccion {
  id: number;                              // ID único de la recolección
  fecha: string;                           // Fecha de recolección
  nombre_cientifico?: string;              // Nombre científico (opcional)
  nombre_comercial?: string;               // Nombre comercial (opcional)
  cantidad: number;                        // Cantidad recolectada
  unidad: string;                          // Unidad de medida
  tipo_material: string;                   // Tipo: SEMILLA, ESTACA, PLANTULA, INJERTO
  estado: string;                          // Estado: ALMACENADO, EN_PROCESO, UTILIZADO, DESCARTADO
  especie_nueva: boolean;                  // Si es una especie nueva
  observaciones?: string;                  // Notas del recolector
  codigo_trazabilidad: string;             // Código único para trazabilidad
  usuario: {                               // Usuario que realizó la recolección
    id: number;
    nombre: string;
    apellido: string;
    username: string;
  };
  ubicacion: UbicacionApi | null;
  vivero?: {                               // Vivero de almacenamiento (opcional)
    id: number;
    codigo: string;
    nombre: string;
    ubicacion?: UbicacionApi | null;
  };
  metodo: {                                // Método de recolección usado
    id: number;
    nombre: string;
    descripcion?: string;
  };
  planta?: {                               // Datos de la planta recolectada
    id: number;
    especie: string;
    nombre_cientifico: string;
    variedad: string;
    fuente: string;
  };
  fotos: Array<{                           // Array de fotos subidas a IPFS
    id: number;
    url: string;                           // URL de IPFS
    formato: string;                       // Formato: image/jpeg, image/png
    peso_bytes: number;                    // Tamaño del archivo
  }>;
  blockchain_url?: string;                 // URL del NFT en blockchain explorer
  token_id?: string;                       // ID del token NFT generado
  transaction_hash?: string;               // Hash de transacción blockchain
  created_at: string;                      // Fecha de creación
  updated_at: string;                      // Fecha de última actualización
}

/**
 * Vivero (almacén de material forestal)
 * Retornado por GET /api/viveros
 */
export interface Vivero {
  id: number;                              // ID único del vivero
  codigo: string;                          // Código alfanumérico (ej: "VIV-001")
  nombre: string;                          // Nombre del vivero
  ubicacion?: UbicacionApi | null;
}

export interface PaisCatalogo {
  id: number;
  nombre: string;
  codigo_iso2: string | null;
}

export interface DivisionCatalogo {
  id: number;
  pais_id: number;
  parent_id: number | null;
  tipo_id: number;
  tipo_nombre: string | null;
  tipo_orden: number | null;
  nombre: string;
}

/**
 * Método de recolección
 * Retornado por GET /api/metodos-recoleccion
 */
export interface MetodoRecoleccion {
  id: number;                              // ID único del método
  nombre: string;                          // Nombre del método
  descripcion?: string;                    // Descripción detallada (opcional)
}

/**
 * Planta/Especie
 * Retornado por GET /api/plantas
 */
export interface TipoPlanta {
  id: number;                              // ID único del tipo de planta
  nombre: string;                          // Nombre del tipo (ej: "Árbol", "Arbusto", "Hierba")
  created_at: string;                      // Fecha de creación
}

export interface Planta {
  id: number;                              // ID único de la planta
  especie: string;                         // Nombre común (ej: "Mara")
  nombre_cientifico: string;               // Nombre científico en latín
  variedad: string;                        // Variedad específica
  tipo_planta?: string;                    // Tipo: "Árbol", "Arbusto", "Herbácea" (deprecado)
  tipo_planta_id?: number;                 // ID del tipo de planta (foreign key)
  fuente: string;                          // Fuente: "NATIVA", "INTRODUCIDA", "ENDÉMICA"
  imagen_url?: string;                     // URL de imagen de la planta
  nombres_comunes?: string;                // Otros nombres comunes de la planta
}

/**
 * DTO para crear una nueva planta
 * Se envía al backend en el endpoint POST /api/plantas
 * Usado cuando el usuario registra una especie nueva
 */
export interface CreatePlantaDto {
  especie: string;                         // Nombre común de la especie (requerido)
  nombre_cientifico: string;               // Nombre científico en latín (requerido)
  variedad?: string;                       // Variedad específica (opcional)
  tipo_planta_id: number;                  // ID del tipo de planta - foreign key (requerido)
  nombre_comun_principal: string;          // Nombre común principal (requerido)
  nombres_comunes?: string;                // Otros nombres comunes (opcional)
  imagen_url: string;                      // URL de imagen de la planta - base64 o URL (requerido)
  notas?: string;                          // Notas adicionales sobre la planta (opcional)
}

/**
 * Filtros para listar recolecciones
 * Se envía como query params al endpoint GET /api/recolecciones
 */
export interface RecoleccionFilters {
  usuario_id?: number;                     // Filtrar por usuario
  fecha_inicio?: string;                   // Fecha inicio (YYYY-MM-DD)
  fecha_fin?: string;                      // Fecha fin (YYYY-MM-DD)
  estado?: string;                         // Filtrar por estado
  vivero_id?: number;                      // Filtrar por vivero
  tipo_material?: string;                  // Filtrar por tipo de material
  search?: string;
  q?: string;
  page?: number;                           // Número de página
  limit?: number;                          // Items por página para paginación
}

// ============================================================================
// CLASE DE SERVICIO
// ============================================================================
// Clase estática que agrupa todos los métodos HTTP relacionados con recolecciones
// Todos los métodos son estáticos, no se necesita instanciar la clase
// ============================================================================

export class RecoleccionService {
  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================
  
  /**
   * Construye los headers HTTP con autenticación para peticiones al backend
   * 
   * Lee tokens de localStorage:
   * - authToken: JWT token de autenticación
   * - auth_id: ID de usuario autenticado
   * 
   * @param {boolean} includeContentType - Si debe incluir 'Content-Type: application/json'
   * @returns {HeadersInit} Objeto con headers: Authorization, x-auth-id, Content-Type
   * 
   * @example
   * const headers = this.getAuthHeaders(); // Con Content-Type
   * const headers = this.getAuthHeaders(false); // Sin Content-Type (para FormData)
  */
  private static getAuthHeaders(includeContentType = true): HeadersInit {
    const token = localStorage.getItem('authToken')
    const authId = localStorage.getItem('auth_id')
    const headers: HeadersInit = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    if (authId) {
      headers['x-auth-id'] = authId
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  /**
   * Maneja la respuesta HTTP del servidor
   * Parsea JSON y valida errores
   * 
   * @param {Response} response - Objeto Response de fetch
   * @returns {Promise<{success: boolean, data: Recoleccion}>} Resultado parseado
   * @throws {Error} Si la respuesta no es OK o hay error de parseo
   * 
   * PRIVADO: Solo usado internamente por otros métodos del servicio
  */
  private static async handleResponse(response: Response): Promise<{ success: boolean; data: Recoleccion }> {
    if (!response.ok) {
      const errorText = await response.text()
      
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.message || `Error ${response.status}: ${response.statusText}`)
      } catch {
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`)
      }
    }
    
    return response.json()
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - RECOLECCIONES
  // ==========================================================================

  /**
   * Crea una nueva recolección en el backend
   * 
   * ENDPOINT: POST /api/recolecciones
   * 
   * Proceso completo:
   * 1. Construye FormData con todos los campos
   * 2. Incluye archivos de fotos (máximo 5)
   * 3. Envía petición HTTP POST al backend
   * 4. Backend procesa: sube fotos a Pinata (IPFS), crea registro en DB, genera NFT
   * 5. Retorna recolección creada con URLs de blockchain
   * 
   * @param {CreateRecoleccionDto} data - DTO con todos los datos de la recolección
   * @returns {Promise<{success: boolean, data: Recoleccion}>} Recolección creada
   * @throws {Error} Si hay error de red, autenticación o validación
   * 
   * @example
   * const dto = {
   *   fecha: '2026-02-01',
   *   cantidad: 5,
   *   unidad: 'kg',
   *   tipo_material: 'SEMILLA',
   *   // ... más campos
   * };
   * const result = await RecoleccionService.create(dto);
   * console.log('ID creado:', result.data.id);
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
      // TODO: ¿Acá la planta esta validada? Hay que asegurarse de que venga completa
      if (data.especie_nueva && data.nueva_planta) {
        formData.append('nueva_planta[especie]', data.nueva_planta.especie);
        formData.append('nueva_planta[nombre_cientifico]', data.nueva_planta.nombre_cientifico);
        formData.append('nueva_planta[variedad]', data.nueva_planta.variedad);
        formData.append('nueva_planta[fuente]', data.nueva_planta.fuente);
        if (data.nueva_planta.tipo_planta) {
          formData.append('nueva_planta[tipo_planta]', data.nueva_planta.tipo_planta);
        }
      }
      
      // 4. Ubicación V2 (sin campos legacy)
      formData.append('ubicacion[latitud]', String(data.ubicacion.latitud));
      formData.append('ubicacion[longitud]', String(data.ubicacion.longitud));
      if (data.ubicacion.pais_id !== undefined) {
        formData.append('ubicacion[pais_id]', String(data.ubicacion.pais_id));
      }
      if (data.ubicacion.division_id !== undefined) {
        formData.append('ubicacion[division_id]', String(data.ubicacion.division_id));
      }
      if (data.ubicacion.nombre) {
        formData.append('ubicacion[nombre]', data.ubicacion.nombre);
      }
      if (data.ubicacion.referencia) {
        formData.append('ubicacion[referencia]', data.ubicacion.referencia);
      }
      if (
        data.ubicacion.precision_m !== undefined &&
        Number.isFinite(data.ubicacion.precision_m) &&
        data.ubicacion.precision_m > 0
      ) {
        formData.append('ubicacion[precision_m]', String(data.ubicacion.precision_m));
      }
      if (data.ubicacion.fuente) {
        formData.append('ubicacion[fuente]', data.ubicacion.fuente);
      }
      
      // 5. Fotos (máximo 5)
      if (data.fotos && data.fotos.length > 0) {
        const maxFotos = Math.min(data.fotos.length, 5);
        for (let i = 0; i < maxFotos; i++) {
          formData.append('fotos', data.fotos[i]);
        }
        console.log(`📸 ${maxFotos} fotos agregadas al FormData`);
      }
      
      const authId = localStorage.getItem('auth_id');
      
      if (!authId) {
        throw new Error('No se encontró auth_id. Por favor, cierra sesión e inicia sesión nuevamente.');
      }
      
      // Construir headers para FormData (NO incluir Content-Type)
      const headers: HeadersInit = { 'x-auth-id': authId };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      let response: Response | undefined;
      
      try {
        response = await fetch(`${API_URL}/api/recolecciones`, {
          method: 'POST',
          headers: headers,
          body: formData,
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);
        
        const result = await this.handleResponse(response);
        return result;
        
      } catch (fetchError) {
        console.error('❌ Error completo en fetch:', fetchError);
        console.error('📊 Status de respuesta:', response?.status);
        console.error('📊 Status text:', response?.statusText);
        
        if (response) {
          try {
            const errorText = await response.text();
            console.error('📄 Contenido de la respuesta:', errorText);
          } catch (textError) {
            console.error('❌ No se pudo leer el texto de la respuesta:', textError);
          }
        }
        
        throw fetchError;
      }
      
    } catch (error) {
      console.error('❌ Error completo en create:', error);
      console.error('📊 Tipo de error:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('📊 Mensaje:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('No se puede conectar con el servidor. Verifica que el backend esté corriendo y que CORS esté configurado correctamente.');
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error('La solicitud tardó demasiado. El servidor puede estar procesando las imágenes en Pinata/Blockchain. Intenta nuevamente en unos momentos.');
      }
      
      throw error;
    }
  }

  /**
   * Busca plantas por nombre (común o científico)
   * 
   * ENDPOINT: GET /api/plantas/search?q={query}
   * 
   * Útil para autocomplete y búsqueda en tiempo real
   * Busca coincidencias parciales en nombre común y científico
   * 
   * @param {string} query - Término de búsqueda
   * @returns {Promise<Planta[]>} Array de plantas que coinciden con la búsqueda
   * @returns {Promise<[]>} Array vacío si hay error (no lanza excepción)
   * 
   * @example
   * const plantas = await RecoleccionService.searchPlantas('Mara');
   * // Retorna plantas con "Mara" en nombre común o científico
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
   * Lista recolecciones con filtros y paginación
   * 
   * ENDPOINT: GET /api/recolecciones?page=1&limit=20&tipo_material=SEMILLA...
   * 
   * Comunica con el backend para obtener lista paginada de recolecciones
   * Soporta múltiples filtros: tipo de material, estado, vivero, fechas, etc.
   * 
   * @param {RecoleccionFilters} filters - Objeto con filtros opcionales
   * @param {number} filters.page - Número de página (default: 1)
   * @param {number} filters.limit - Items por página (default: 20)
   * @param {string} filters.tipo_material - Filtro por tipo: SEMILLA, ESTACA, etc.
   * @param {string} filters.estado - Filtro por estado: ALMACENADO, EN_PROCESO, etc.
   * @param {number} filters.vivero_id - Filtro por vivero
   * @param {number} filters.usuario_id - Filtro por usuario
   * @param {string} filters.fecha_inicio - Fecha inicio (YYYY-MM-DD)
   * @param {string} filters.fecha_fin - Fecha fin (YYYY-MM-DD)
   * 
   * @returns {Promise<{success, data, pagination}>} Resultado con array de recolecciones y metadatos de paginación
   * @throws {Error} Si hay error de red o el backend no responde
   * 
   * @example
   * // Listar todas las recolecciones (página 1)
   * const result = await RecoleccionService.list();
   * 
   * @example
   * // Listar solo semillas de la página 2
   * const result = await RecoleccionService.list({
   *   page: 2,
   *   limit: 20,
   *   tipo_material: 'SEMILLA'
   * });
   * console.log(`Total: ${result.pagination.total}`);
   * console.log(`Páginas: ${result.pagination.totalPages}`);
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
      
      const authId = localStorage.getItem('auth_id');
      const query = params.toString();
      const url = `${API_URL}/api/recolecciones${query ? `?${query}` : ''}`;
      
      console.log('📋 Listando recolecciones...');
      console.log('🔗 URL:', url);
      console.log('🔑 Auth ID:', authId);
      console.log('📦 Filtros:', filters);
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Verificar content-type ANTES de intentar parsear
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);
      
      if (!response.ok) {
        // Si no es exitoso, intentar leer el error
        if (contentType?.includes('application/json')) {
          const errorJson = await response.json();
          throw new Error(errorJson.message || `Error ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error('❌ Error response (HTML/texto):', errorText.substring(0, 500));
          throw new Error(`Error ${response.status}: El servidor devolvió un error. Verifica la consola del backend.`);
        }
      }
      
      // Respuesta exitosa, verificar que sea JSON
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Respuesta no es JSON:', text.substring(0, 500));
        console.error('🔍 Posibles causas:');
        console.error('   1. El backend no está corriendo en:', API_URL);
        console.error('   2. La URL del endpoint es incorrecta');
        console.error('   3. El backend tiene un error y devuelve HTML en lugar de JSON');
        console.error('   4. Falta configurar VITE_API_URL en las variables de entorno');
        
        // Devolver array vacío en lugar de error para mejorar UX
        return {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          }
        };
      }
      
      const result = await response.json();
      console.log('✅ Recolecciones cargadas:', result.data?.length || 0);
      
      // Si el resultado no tiene la estructura esperada, normalizarlo
      if (!result.data) {
        return {
          success: true,
          data: Array.isArray(result) ? result : [],
          pagination: {
            page: 1,
            limit: 20,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          }
        };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error al listar recolecciones:', error);
      
      // Si es un error de red, proporcionar más información
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`No se puede conectar con el backend en ${API_URL}. Verifica que esté corriendo.`);
      }
      
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de una recolección por ID
   * 
   * ENDPOINT: GET /api/recolecciones/{id}
   * 
   * Retorna el objeto completo con todas sus relaciones:
   * - Datos de la planta
   * - Información del usuario recolector
   * - Ubicación geográfica
   * - Vivero de almacenamiento
   * - Método de recolección
   * - Fotos con URLs de IPFS
   * - Datos de blockchain (token_id, transaction_hash, blockchain_url)
   * 
   * @param {number} id - ID único de la recolección
   * @returns {Promise<{success: boolean, data: Recoleccion}>} Recolección completa
   * @throws {Error} Si no se encuentra la recolección o hay error de red
   * 
   * @example
   * const result = await RecoleccionService.getById(123);
   * console.log('Recolección:', result.data.planta.especie);
   * console.log('Token NFT:', result.data.token_id);
   */
  static async getById(id: number): Promise<{ success: boolean; data: Recoleccion }> {
    try {
      const response = await fetch(`${API_URL}/api/recolecciones/${id}`, {
        headers: this.getAuthHeaders(),
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

  // ==========================================================================
  // MÉTODOS PÚBLICOS - RECURSOS AUXILIARES
  // ==========================================================================

  /**
   * Lista todos los viveros disponibles
   * 
   * ENDPOINT: GET /api/viveros
   * 
   * Los viveros son los almacenes donde se guardan las recolecciones
   * Usado en LocationForm para que el usuario seleccione dónde almacenar
   * 
   * @returns {Promise<{success: boolean, data: Vivero[]}>} Array de viveros
   * @throws {Error} Si hay error de red o el backend no responde
   * 
   * @example
   * const result = await RecoleccionService.getViveros();
   * result.data.forEach(vivero => {
   *   console.log(`${vivero.codigo}: ${vivero.nombre}`);
   * });
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
   * Lista países disponibles para el selector de ubicación administrativa.
   *
   * ENDPOINT: GET /api/ubicaciones/paises
   */
  static async getPaises(): Promise<{ success: boolean; data: PaisCatalogo[] }> {
    try {
      const response = await fetch(`${API_URL}/api/ubicaciones/paises`);

      if (!response.ok) {
        throw new Error('Error al obtener países');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Error al obtener países:', error);
      throw error;
    }
  }

  /**
   * Lista divisiones administrativas hijas por país + parent.
   *
   * ENDPOINT: GET /api/ubicaciones/divisiones?pais_id={id}[&parent_id={id}]
   */
  static async getDivisiones(
    paisId: number,
    parentId?: number,
  ): Promise<{ success: boolean; data: DivisionCatalogo[] }> {
    try {
      const params = new URLSearchParams({ pais_id: String(paisId) });
      if (parentId !== undefined) {
        params.append('parent_id', String(parentId));
      }

      const response = await fetch(
        `${API_URL}/api/ubicaciones/divisiones?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error('Error al obtener divisiones administrativas');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Error al obtener divisiones administrativas:', error);
      throw error;
    }
  }

  /**
   * Crea (o reutiliza si ya existe) una división flexible bajo un parent.
   *
   * ENDPOINT: POST /api/ubicaciones/divisiones/flexible
   */
  static async ensureFlexibleDivision(payload: {
    pais_id: number;
    parent_id: number;
    nombre: string;
  }): Promise<{ success: boolean; data: DivisionCatalogo; created: boolean }> {
    try {
      const response = await fetch(`${API_URL}/api/ubicaciones/divisiones/flexible`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al crear división flexible');
      }

      return response.json();
    } catch (error) {
      console.error('❌ Error al crear división flexible:', error);
      throw error;
    }
  }

  /**
   * Lista todos los métodos de recolección disponibles
   * 
   * ENDPOINT: GET /api/metodos-recoleccion
   * 
   * Métodos como: "Recolección manual", "Post-cosecha", "Muestreo", etc.
   * Usado en NewCollectionForm para que el usuario seleccione el método usado
   * 
   * @returns {Promise<{success: boolean, data: MetodoRecoleccion[]}>} Array de métodos
   * @throws {Error} Si hay error de red o el backend no responde
   * 
   * @example
   * const result = await RecoleccionService.getMetodos();
   * result.data.forEach(metodo => {
   *   console.log(`${metodo.nombre}: ${metodo.descripcion}`);
   * });
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

  // ==========================================================================
  // MÉTODOS PÚBLICOS - PLANTAS
  // ==========================================================================

  /**
   * Lista todas las plantas/especies disponibles en la base de datos
   * 
   * ENDPOINT: GET /api/plantas
   * 
   * Retorna el catálogo completo de especies registradas
   * Usado en NewCollectionForm para que el usuario seleccione la especie recolectada
   * Incluye nombre común, científico, variedad, tipo y fuente
   * 
   * @returns {Promise<Planta[]>} Array de plantas
   * @returns {Promise<[]>} Array vacío si hay error (no lanza excepción)
   * 
   * @example
   * const plantas = await RecoleccionService.getPlantas();
   * console.log(`Total de especies: ${plantas.length}`);
   * plantas.forEach(planta => {
   *   console.log(`${planta.especie} (${planta.nombre_cientifico})`);
   * });
   */
  static async getPlantas(): Promise<Planta[]> {
    try {
      const response = await fetch(`${API_URL}/api/plantas`);
      
      if (!response.ok) {
        throw new Error('Error al obtener plantas');
      }
      
      const result = await response.json();
      const plantas = result.data || result;
      
      console.log('📡 Respuesta del backend /api/plantas:');
      console.log('- Total recibido:', plantas.length);
      console.log('- Estructura completa:', result);
      console.log('- Primeras 3 plantas:', plantas.slice(0, 3));
      
      return plantas;
    } catch (error) {
      console.error('❌ Error al obtener plantas:', error);
      return [];
    }
  }

  /**
   * Crea una nueva planta/especie en la base de datos
   * 
   * ENDPOINT: POST /api/plantas
   * 
   * Usado cuando el usuario marca "Nuevo hallazgo" y registra una especie
   * que no existe en el catálogo. El backend valida y guarda la nueva planta.
   * 
   * @param {CreatePlantaDto} data - DTO con datos de la nueva planta
   * @param {string} data.especie - Nombre común de la planta
   * @param {string} data.nombre_cientifico - Nombre científico en latín
   * @param {string} data.tipo_planta - Tipo: "Árbol", "Arbusto", etc.
   * @param {string} data.nombres_comunes - Otros nombres comunes separados por coma
   * @param {string} data.imagen_url - URL de imagen de la planta (opcional)
   * 
   * @returns {Promise<{success: boolean, data: Planta}>} Planta creada con ID asignado
   * @throws {Error} Si hay error de validación o de red
   * 
   * @example
   * const dto = {
   *   especie: 'Cedro',
   *   nombre_cientifico: 'Cedrela odorata',
   *   tipo_planta: 'Árbol',
   *   nombres_comunes: 'Cedro rojo, Cedar',
   *   imagen_url: 'https://example.com/cedro.jpg'
   * };
   * const result = await RecoleccionService.createPlanta(dto);
   * console.log('Nueva planta ID:', result.data.id);
   */
  static async createPlanta(data: CreatePlantaDto): Promise<{ success: boolean; data: Planta }> {
    try {
      console.log('📤 Enviando nueva planta al backend...', data);
      
      const response = await fetch(`${API_URL}/api/plantas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear planta');
      }
      
      const result = await response.json();
      console.log('✅ Planta creada exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error al crear planta:', error);
      throw error;
    }
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - UTILIDADES
  // ==========================================================================

  /**
   * Convierte una imagen en formato base64 a objeto File
   * 
   * Útil para convertir imágenes capturadas desde el navegador (FileReader.readAsDataURL)
   * en objetos File que se pueden enviar en FormData al backend
   * 
   * Proceso:
   * 1. Separa el header base64 del contenido
   * 2. Extrae el tipo MIME (image/jpeg, image/png, etc.)
   * 3. Decodifica base64 a bytes
   * 4. Crea Uint8Array con los bytes
   * 5. Construye objeto File con nombre y tipo MIME
   * 
   * @param {string} base64 - String base64 (ej: "data:image/jpeg;base64,/9j/4AAQ...")
   * @param {string} filename - Nombre para el archivo (ej: "foto_lugar_1.jpg")
   * @returns {File} Objeto File listo para enviar en FormData
   * 
   * @example
   * const base64Img = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
   * const file = RecoleccionService.base64ToFile(base64Img, 'lugar_1.jpg');
   * 
   * const formData = new FormData();
   * formData.append('foto', file);
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

  // ==========================================================================
  // MÉTODOS PÚBLICOS - TIPOS DE PLANTA
  // ==========================================================================

  /**
   * Obtiene la lista de tipos de planta disponibles
   * 
   * Endpoint: GET /api/plantas/tipos-planta
   * 
   * Retorna todos los tipos de planta registrados en el sistema
   * (Árbol, Arbusto, Hierba, Palma, Enredadera, etc.)
   * 
   * @returns {Promise<TipoPlanta[]>} Array de tipos de planta
   * 
   * @example
   * const tipos = await RecoleccionService.getTiposPlantas();
   * console.log('Tipos disponibles:', tipos);
   */
  static async getTiposPlantas(): Promise<TipoPlanta[]> {
    try {
      console.log('📡 Obteniendo tipos de planta...');
      
      const response = await fetch(`${API_URL}/api/plantas/tipos-planta`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener tipos de planta');
      }
      
      const result = await response.json();
      console.log('✅ Tipos de planta obtenidos:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error al obtener tipos de planta:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo tipo de planta
   * 
   * Endpoint: POST /api/plantas/tipos-planta
   * 
   * Permite agregar un nuevo tipo de planta al catálogo cuando
   * el usuario necesita un tipo que no existe en el sistema
   * 
   * @param {string} nombre - Nombre del nuevo tipo (ej: "Liana", "Cactus")
   * @returns {Promise<{ success: boolean; data: TipoPlanta }>} Tipo creado
   * 
   * @throws {Error} 409 - Si ya existe un tipo con ese nombre
   * @throws {Error} 400 - Si hay error de validación
   * 
   * @example
   * try {
   *   const result = await RecoleccionService.createTipoPlanta('Liana');
   *   console.log('Nuevo tipo ID:', result.data.id);
   * } catch (error) {
   *   if (error.response.status === 409) {
   *     console.log('El tipo ya existe');
   *   }
   * }
   */
  static async createTipoPlanta(nombre: string): Promise<{ success: boolean; data: TipoPlanta }> {
    try {
      console.log('📤 Creando nuevo tipo de planta:', nombre);
      
      const response = await fetch(`${API_URL}/api/plantas/tipos-planta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        const error = new Error(result.message || 'Error al crear tipo de planta') as Error & {
          response?: { status: number; data: unknown }
        };
        error.response = { status: response.status, data: result };
        throw error;
      }
      
      console.log('✅ Tipo de planta creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error al crear tipo de planta:', error);
      throw error;
    }
  }

  /**
   * Busca plantas por especie
   * 
   * Endpoint: GET /api/plantas?q={especie}
   * 
   * Permite validar si ya existe una planta con una especie específica
   * antes de crear una nueva, evitando duplicados
   * 
   * @param {string} especie - Nombre de la especie a buscar
   * @returns {Promise<Planta[]>} Array de plantas que coinciden
   * 
   * @example
   * const existentes = await RecoleccionService.buscarPlantasPorEspecie('Caoba');
   * if (existentes.length > 0) {
   *   console.log('Ya existe esta especie');
   * }
   */
  static async buscarPlantasPorEspecie(especie: string): Promise<Planta[]> {
    try {
      console.log('🔍 Buscando plantas por especie:', especie);
      
      const response = await fetch(`${API_URL}/api/plantas?q=${encodeURIComponent(especie)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al buscar plantas');
      }
      
      const result = await response.json();
      console.log('✅ Plantas encontradas:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Error al buscar plantas:', error);
      throw error;
    }
  }
}
