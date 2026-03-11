// src/modules/recolecciones/recoleccionTypes.ts

export type MaterialType = 'seed' | 'cutting' | 'SEMILLA' | 'ESQUEJE';
export type Unit = 'kg' | 'units';

/**
 * Interfaz unificada de Recolección
 * Incluye campos del nuevo esquema de Pablo y trazabilidad de Jhamil
 */
export interface Recoleccion {
  id: number;
  codigo_trazabilidad?: string;
  cantidad: number;
  unidad: string;
  unidad_canonica?: string;
  fecha: string;
  tipo_material: string; 
  estado: string;
  estado_registro: 'BORRADOR' | 'VALIDADO';
  saldo_disponible?: number;
  nombre_comercial?: string;
  nombre_cientifico?: string;
  ubicacion?: any;
  planta?: {
    id: number;
    especie: string;
    nombre_cientifico: string;
  };
  // 👈 Esta es la propiedad que falta y causa el error ts(2339)
  vivero?: {
    id: number;
    codigo: string;
    nombre: string;
  };
  evidencias?: Array<{
    ruta_archivo: string;
  }>;
  fotos?: Array<{
    url: string;
  }>;
}