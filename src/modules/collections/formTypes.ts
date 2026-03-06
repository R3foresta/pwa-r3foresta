// ============================================================================
// formTypes.ts
// ============================================================================
// Tipos e interfaces para el formulario de creación de recolección
// Define la estructura del estado compartido entre los 3 pasos del formulario
// ============================================================================

import type { MaterialType, Unit } from "./types";
import type { FuenteUbicacion } from "../../types/ubicacion";

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
  ubicacionNombre: string;         // Nombre corto del punto de recolección
  referencia: string;              // Referencia textual obtenida por geocodificación
  latitud: string;                 // Latitud (como string para input)
  longitud: string;                // Longitud (como string para input)
  paisId: string;                  // ID de país (opcional)
  paisNombre: string;              // Nombre de país seleccionado
  divisionId: string;              // ID de división administrativa (opcional)
  divisionPathIds: number[];       // IDs de la ruta administrativa seleccionada
  divisionRuta: string[];          // Ruta administrativa seleccionada
  comunidadNombre: string;         // Nombre de comunidad/localidad (editable)
  precisionM: string;              // Precisión en metros (opcional)
  fuenteUbicacion: FuenteUbicacion;// Fuente de ubicación
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
  quantity: "",
  unit: "kg",
  notes: "",
  isNewFind: false,
  placePhotos: [],
  totalPhotos: [],
  ubicacionNombre: "",
  referencia: "",
  latitud: "",
  longitud: "",
  paisId: "",
  paisNombre: "",
  divisionId: "",
  divisionPathIds: [],
  divisionRuta: [],
  comunidadNombre: "",
  precisionM: "",
  fuenteUbicacion: "GPS_MOVIL",
  almacenamiento: "",
};
