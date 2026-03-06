export type MaterialType = 'seed' | 'cutting' | 'plantlet' | 'graft';

// Actualizamos para que coincida con lo que el script de Pablo normaliza
export type Unit = 'kg' | 'units' | 'G' | 'UNIDAD';

// Nueva interfaz para reflejar los cambios de Jhamil
export interface Recoleccion {
  id: number;
  codigo_trazabilidad: string;      // Nuevo en DB
  fecha: string;
  nombre_cientifico?: string;
  nombre_comercial?: string;
  cantidad: number;
  unidad: string;
  tipo_material: string;
  estado: string;
  especie_nueva: boolean;
  observaciones?: string;
  usuario_id: number;
  ubicacion_id: number;
  vivero_id?: number;
  metodo_id: number;
  planta_id?: number;
  created_at: string;
  blockchain_url?: string;
  token_id?: string;
  transaction_hash?: string;

  // --- NUEVOS CAMPOS DE PABLO Y JHAMIL (Indispensables para el Fix) ---
  estado_registro: 'BORRADOR' | 'VALIDADO'; // Tipo USER-DEFINED en SQL
  unidad_canonica: 'G' | 'UNIDAD';          // Restricción CHECK en SQL
  cantidad_inicial_canonica: number;        // NOT NULL en SQL
  saldo_disponible?: number;                // Viene de la vista vw_recoleccion_estado
  
  // Relaciones (para que no marquen error en el render)
  fotos: Array<{ url: string }>;
  planta?: {
    especie: string;
    nombre_cientifico: string;
  };
  vivero?: {
    nombre: string;
  };
  ubicacion: any; 

  // NUEVO: campo para que coincida con el Backend
  evidencias?: Array<{
    ruta_archivo: string;
  }>;

}