// src/modules/recolecciones/recoleccionTypes.ts

// Mantenemos la versión de Pablo que incluye mayúsculas para el backend
export type MaterialType = 'seed' | 'cutting' | 'SEMILLA' | 'ESQUEJE';
export type Unit = 'kg' | 'units';

export interface Recoleccion {
  id: number;
  codigo_trazabilidad?: string;
  cantidad: number;
  unidad: string;
  unidad_canonica?: string; 
  fecha: string;
  tipo_material: string;
  estado: string;
  estado_registro: 'BORRADOR' | 'PENDIENTE_VALIDACION' | 'VALIDADO' | 'RECHAZADO';
  saldo_disponible?: number;
  nombre_comercial?: string;
  nombre_cientifico?: string;
  ubicacion?: any;
  planta?: {
    id: number;
    especie: string;
    nombre_cientifico: string;
  };
  // 👈 IMPORTANTE: Aseguramos que usuario tenga 'apellido' para tu fix
  usuario?: {
    id: number;
    nombre: string;
    apellido: string;
    username: string;
    correo: string;
  };
  vivero?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  fotos?: Array<{ url: string }>;
  evidencias?: Array<{ ruta_archivo: string }>;
}