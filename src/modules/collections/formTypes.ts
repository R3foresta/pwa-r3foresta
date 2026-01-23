import type { MaterialType, Unit } from "./types";

export interface CollectionFormData {
  // Step 1: Datos generales
  date: string;
  type: MaterialType;
  species: string;
  method: string;
  quantity: string;
  unit: Unit;
  notes: string;
  isNewFind: boolean;
  placePhotos: string[];
  totalPhotos: string[];

  // Step 2: Ubicación
  direccion: string;
  latitud: string;
  longitud: string;
  pais: string;
  depto: string;
  provincia: string;
  comunidad: string;
  almacenamiento: string;
  
  // Campos adicionales para backend
  metodo_id?: number;
  vivero_id?: number;
  planta_id?: number;
  nombre_cientifico?: string;
  nombre_comercial?: string;
}

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
