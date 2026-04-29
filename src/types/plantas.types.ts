// src/types/plantas.types.ts

export interface TipoPlantaCatalogo {
  id: number;
  nombre: string;
  created_at?: string; // 👈 El '?' lo hace opcional y resuelve tu error
}

export interface PlantaCatalogo {
  id: number;
  especie: string;
  nombre_cientifico: string;
  variedad: string;
  nombre_comun_principal: string;
  nombres_comunes?: string | null;
  imagen_url?: string | null;
  notas?: string | null;
  tipo_planta_id: number;
  tipo_planta?: string; 
  created_at?: string; // 👈 También opcional aquí
}

export interface CreatePlantaDto {
  especie: string;
  nombre_cientifico: string;
  variedad: string;
  tipo_planta_id: number;
  nombre_comun_principal: string;
  nombres_comunes?: string;
  imagen_url?: string | null;
  notas?: string;
}