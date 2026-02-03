// ============================================================================
// formTypes.ts
// ============================================================================
// Tipos e interfaces para el formulario de creación de recolección
// Define la estructura del estado compartido entre los 3 pasos del formulario
// ============================================================================

import type { MaterialType, Unit } from "./types";

/**
 * Interfaz completa del estado del formulario de recolección
 * Agrupa datos de los 3 pasos: Datos generales, Ubicación y Resumen
 */
export interface CollectionFormData {
  // ============================================================================
  // PASO 1: Datos generales de la recolección
  // ============================================================================
  date: string;                    // Fecha de recolección (YYYY-MM-DD)
  type: MaterialType;              // Tipo: 'seed' (semilla) o 'cutting' (esqueje)
  species: string;                 // Nombre de la especie seleccionada
  method: string;                  // Método de recolección (nombre del método)
  quantity: string;                // Cantidad como string (para input numérico)
  unit: Unit;                      // Unidad: 'kg' o 'units'
  notes: string;                   // Observaciones/notas adicionales
  isNewFind: boolean;              // ¿Es un nuevo hallazgo/especie nueva?
  placePhotos: string[];           // Fotos del lugar (base64)
  totalPhotos: string[];           // Fotos del total recolectado (base64)

  // ============================================================================
  // PASO 2: Ubicación geográfica y almacenamiento
  // ============================================================================
  direccion: string;               // Dirección textual obtenida por geocodificación
  latitud: string;                 // Latitud (como string para input)
  longitud: string;                // Longitud (como string para input)
  pais: string;                    // País seleccionado
  depto: string;                   // Departamento
  provincia: string;               // Provincia
  comunidad: string;               // Comunidad
  almacenamiento: string;          // Nombre del vivero seleccionado
  
  // ============================================================================
  // Campos adicionales para comunicación con el backend
  // Se llenan durante el proceso y se envían al crear la recolección
  // ============================================================================
  metodo_id?: number;              // ID del método de recolección seleccionado
  vivero_id?: number;              // ID del vivero de almacenamiento
  planta_id?: number;              // ID de la planta (si no es especie nueva)
  nombre_cientifico?: string;      // Nombre científico de la planta
  nombre_comercial?: string;       // Nombre común/comercial de la planta
}

/**
 * Valores iniciales del formulario
 * Se usa al crear un nuevo formulario y al resetear después de enviar
 */
export const initialFormData: CollectionFormData = {
  date: new Date().toISOString().slice(0, 10),
  type: "seed",
  species: "",
  method: "",
  quantity: "0",
  unit: "kg",
  notes: "",
  isNewFind: false,
  placePhotos: [],
  totalPhotos: [],
  direccion: "",
  latitud: "",
  longitud: "",
  pais: "Bolivia",
  depto: "La Paz",
  provincia: "Bolivia",
  comunidad: "La Paz",
  almacenamiento: "",
};
