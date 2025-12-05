export interface CollectionFormData {
  // Step 1: Datos generales
  date: string;
  type: "Semilla" | "Esqueje";
  species: string;
  method: string;
  quantity: string;
  unit: "Kg" | "Unidades" | "gr";
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
}

export const initialFormData: CollectionFormData = {
  date: new Date().toISOString().slice(0, 10),
  type: "Semilla",
  species: "",
  method: "",
  quantity: "0",
  unit: "Kg",
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
  almacenamiento: "Vivero Mallasa",
};
