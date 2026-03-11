// ============================================================================
// CollectionCard.tsx
// ============================================================================
// Componente de tarjeta para mostrar un resumen visual de una recolección
// Se usa en la lista principal de recolecciones (CollectionsScreen)
// ============================================================================

import Icon from "../../components/Icon";
import type { Recoleccion } from "./recoleccionTypes"; //  Apunta al archivo que sí tiene los cambios
import { getUbicacionDisplay } from "../../utils/ubicacion";

/**
 * Componente tarjeta de recolección
 * Muestra información resumida de una recolección con estilo visual atractivo
 * 
 * @param {Recoleccion} recoleccion - Objeto completo de la recolección
 */
function CollectionCard({ recoleccion }: { recoleccion: Recoleccion }) {
  /**
   * Retorna clases de Tailwind CSS según el tipo de material
   * Define colores distintivos para cada tipo: Semilla, Esqueje, Plántula, Injerto
   * 
   * @param {string} type - Tipo de material ('SEMILLA', 'ESTACA', 'PLANTULA', 'INJERTO')
   * @returns {string} Clases CSS de Tailwind para fondo, texto y borde
   */
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'SEMILLA':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
      case 'ESTACA':
        return 'bg-orange-50 text-orange-700 ring-orange-100';
      case 'PLANTULA':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'INJERTO':
        return 'bg-purple-50 text-purple-700 ring-purple-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  /**
   * Retorna clases CSS según el estado de la recolección
   * Estados posibles: ALMACENADO (verde), EN_PROCESO (amarillo), 
   * UTILIZADO (azul), DESCARTADO (rojo)
   * 
   * @param {string} status - Estado actual de la recolección
   * @returns {string} Clases CSS para colorear el badge de estado
   */
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'ALMACENADO':
        return 'bg-green-50 text-green-700 ring-green-100';
      case 'EN_PROCESO':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-100';
      case 'UTILIZADO':
        return 'bg-blue-50 text-blue-700 ring-blue-100';
      case 'DESCARTADO':
        return 'bg-red-50 text-red-700 ring-red-100';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-100';
    }
  };

  /**
   * Traduce el tipo de material de código interno a texto legible en español
   * Convierte: SEMILLA → Semilla, ESTACA → Esqueje, etc.
   * 
   * @param {string} tipo - Código del tipo de material
   * @returns {string} Etiqueta en español para mostrar al usuario
   */
  const getTipoMaterialLabel = (tipo: string) => {
    switch (tipo) {
      case 'SEMILLA': return 'Semilla';
      case 'ESTACA': return 'Esqueje';
      case 'PLANTULA': return 'Plántula';
      case 'INJERTO': return 'Injerto';
      default: return tipo;
    }
  };

  /**
   * Traduce el estado de la recolección a texto legible
   * Convierte códigos internos a etiquetas en español
   * 
   * @param {string} estado - Código del estado
   * @returns {string} Etiqueta del estado en español
   */
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'ALMACENADO': return 'Almacenado';
      case 'EN_PROCESO': return 'En Proceso';
      case 'UTILIZADO': return 'Utilizado';
      case 'DESCARTADO': return 'Descartado';
      default: return estado;
    }
  };

  /**
   * Formatea una fecha ISO a formato boliviano legible: DD/MM/YYYY
   * 
   * @param {string} fecha - Fecha en formato ISO (YYYY-MM-DD)
   * @returns {string} Fecha formateada (ej: "15/01/2025")
   */
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // ============================================================================
  // Preparación de datos para mostrar
  // ============================================================================
  
  // Obtiene el nombre común de la planta (prioriza: especie > nombre_comercial > fallback)
  const nombrePlanta = recoleccion.planta?.especie || recoleccion.nombre_comercial || 'Sin especie';
  
  // Obtiene el nombre científico de la planta en latín
  const nombreCientifico = recoleccion.planta?.nombre_cientifico || recoleccion.nombre_cientifico;
  
  // Obtiene la URL de la primera foto para mostrar como imagen principal
  const mainPhoto = recoleccion.evidencias?.[0]?.ruta_archivo || recoleccion.fotos?.[0]?.url;

  // ============================================================================
  // Renderizado del componente
  // ============================================================================



  const getRegistroStyles = (estado: string) => {
    return estado === 'VALIDADO' 
      ? 'bg-blue-600 text-white ring-blue-700' 
      : 'bg-slate-200 text-slate-600 ring-slate-300';
  };

  return (
    // Contenedor principal de la tarjeta con sombra y hover effect
    <article className="relative rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5 transition hover:shadow-md">
      {/* Layout principal: información a la izquierda, foto a la derecha */}
      <div className="flex items-start justify-between gap-3">
        {/* Sección izquierda: Información textual */}
        <div className="flex-1 space-y-1">
          {/* Código de Trazabilidad - NUEVO (Sistema Jhamil) */}
          <div className="mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
              {recoleccion.codigo_trazabilidad || `ID: ${recoleccion.id}`}
            </span>
          </div>

          {/* Nombre común de la planta */}
          <h3 className="text-lg font-extrabold tracking-tight text-slate-800 leading-tight">
            {nombrePlanta}
          </h3>
          
          {/* Nombre científico (en latín) */}
          {nombreCientifico && (
            <p className="text-sm font-medium italic text-slate-600">
              {nombreCientifico}
            </p>
          )}
          
          {/* Lista de detalles con iconos */}
          <div className="mt-2 space-y-1.5">
            {/* Stock y Saldo Disponible - ACTUALIZADO (Lógica Pablo) */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="package" className="h-4 w-4 text-brand-500" />
              <span>
                Stock: <span className="text-slate-900">{recoleccion.saldo_disponible ?? recoleccion.cantidad}</span> {recoleccion.unidad_canonica || recoleccion.unidad}
              </span>
            </div>
            
            {/* Ubicación */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="pin" className="h-4 w-4 text-brand-500" />
              <span className="truncate max-w-[150px]">
                {getUbicacionDisplay(recoleccion.ubicacion)}
              </span>
            </div>
            
            {/* Fecha de recolección */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              <Icon name="date" className="h-4 w-4 text-brand-500" />
              <span>{formatFecha(recoleccion.fecha)}</span>
            </div>
            
            {/* Vivero de almacenamiento */}
            {recoleccion.vivero && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Icon name="pin" className="h-4 w-4 text-brand-500" />
                <span>{recoleccion.vivero.nombre}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Sección derecha: Foto de la recolección */}
        <div className="flex-shrink-0">
          <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">
            {mainPhoto ? (
              // Muestra la primera foto si existe
              <img
                src={mainPhoto}
                alt={nombrePlanta}
                className="h-full w-full object-cover"
              />
            ) : (
              // Ícono placeholder si no hay foto
              <div className="flex h-full w-full items-center justify-center">
                <Icon name="photo" className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sección inferior: Badges informativos */}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Badge: Tipo de material (Semilla, Esqueje, etc.) con color específico */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getTypeStyles(recoleccion.tipo_material)}`}
        >
          {getTipoMaterialLabel(recoleccion.tipo_material)}
        </span>
        
        {/* Badge: Estado actual (Almacenado, En proceso, etc.) con color según estado */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusStyles(recoleccion.estado)}`}
        >
          {getEstadoLabel(recoleccion.estado)}
        </span>
        
        {/* 1. Badge: Contador de fotos (Suma de evidencias nuevas y fotos legacy) */}
        {((recoleccion.evidencias?.length || 0) + (recoleccion.fotos?.length || 0)) > 1 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            📸 {(recoleccion.evidencias?.length || 0) + (recoleccion.fotos?.length || 0)}
          </span>
        )}
        
        {/* 2. Badge especial: Nuevo hallazgo (Basado en la propiedad booleana real) */}
        {recoleccion.planta === null && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
            ✨ Nuevo hallazgo
          </span>
        )}

        {/* Badge de Validación de Pablo/Jhamil */}
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${getRegistroStyles(recoleccion.estado_registro)}`}
        >
          {recoleccion.estado_registro || 'PENDIENTE'}
        </span>
      </div>
    </article>
  );
}

export default CollectionCard;
