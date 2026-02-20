import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import SuccessModal from "./SuccessModal";
import { useCollectionForm } from "./CollectionFormContext";
import { useAuth } from "../../contexts/AuthContext";
import { RecoleccionService } from "../../services/recoleccion.service";
import type { CreateRecoleccionDto } from "../../services/recoleccion.service";

function SummaryForm() {
  const navigate = useNavigate();
  const { formData, resetForm } = useCollectionForm();
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceabilityCode] = useState(() => 
    `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  );
  const typeLabel = formData.type === 'seed' ? 'Semilla' : 'Esqueje';
  const unitLabel = formData.unit === 'kg' ? 'kg' : 'unidades';
  const summaryText = `${formData.quantity} ${unitLabel} de ${formData.species || typeLabel}`;
  
  const finalize = () => {
    resetForm();
    navigate('/app/collections');
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fotos: File[] = [];

      formData.placePhotos.forEach((base64, index) => {
        const file = RecoleccionService.base64ToFile(base64, `lugar_${index + 1}.jpg`);
        fotos.push(file);
      });

      formData.totalPhotos.forEach((base64, index) => {
        const file = RecoleccionService.base64ToFile(base64, `total_${index + 1}.jpg`);
        fotos.push(file);
      });

      let tipo_material: 'SEMILLA' | 'ESTACA' | 'PLANTULA' | 'INJERTO';
      if (formData.type === 'seed') {
        tipo_material = 'SEMILLA';
      } else if (formData.type === 'cutting') {
        tipo_material = 'ESTACA';
      } else {
        tipo_material = 'SEMILLA';
      }

      const metodoId = formData.metodo_id;
      if (!metodoId) {
        throw new Error('Debes seleccionar un método de recolección válido.');
      }

      const paisId = formData.paisId ? Number(formData.paisId) : undefined;
      const divisionId = formData.divisionId ? Number(formData.divisionId) : undefined;
      const precisionM = formData.precisionM ? Number(formData.precisionM) : undefined;

      const dto: CreateRecoleccionDto = {
        fecha: formData.date,
        cantidad: parseFloat(formData.quantity) || 0,
        unidad: formData.unit === 'kg' ? 'kg' : 'unidades',
        tipo_material,
        estado: 'ALMACENADO',
        especie_nueva: Boolean(formData.isNewFind),
        observaciones: formData.notes || undefined,
        ubicacion: {
          nombre: formData.ubicacionNombre || undefined,
          referencia: formData.referencia || undefined,
          latitud: parseFloat(formData.latitud) || 0,
          longitud: parseFloat(formData.longitud) || 0,
          pais_id: Number.isFinite(paisId) ? paisId : undefined,
          division_id: Number.isFinite(divisionId) ? divisionId : undefined,
          precision_m: Number.isFinite(precisionM) ? precisionM : undefined,
          fuente: 'GPS_MOVIL',
        },
        metodo_id: metodoId,
        vivero_id: formData.vivero_id ? parseInt(String(formData.vivero_id)) : undefined,
        fotos: fotos.length > 0 ? fotos : undefined,
      };

      if (!formData.isNewFind && formData.planta_id) {
        dto.planta_id = parseInt(String(formData.planta_id));
        dto.nombre_cientifico = formData.nombre_cientifico;
        dto.nombre_comercial = formData.species;
      } else if (!formData.isNewFind) {
        throw new Error('Debes seleccionar una especie existente o marcarla como nuevo hallazgo.');
      }

      if (formData.isNewFind && formData.species) {
        dto.nueva_planta = {
          especie: formData.species,
          nombre_cientifico: formData.nombre_cientifico || formData.species,
          variedad: 'Común',
          fuente: 'NATIVA',
        };
      }

      const response = await RecoleccionService.create(dto);

      if (response.success) {
        setShowSuccess(true);
      } else {
        throw new Error('Error al crear recolección');
      }
      
    } catch (err) {
      console.error('❌ Error al enviar recolección:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear recolección');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <div className="flex rounded-b-3xl bg-[#0f8351] mb-3 px-5 pb-8 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections/new/location')}
            className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Resumen
            </h1>
            <p className="text-sm font-medium text-white/90">
              Material recolectado
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4 px-5 pb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Paso 3 de 3:
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-slate-500 underline"
            >
              Revisar datos
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-800">Revisar y confirmar</h2>
            
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <p className="text-center text-sm font-medium text-slate-600">
                Por favor revise toda la información antes de confirmar
              </p>
            </div>

            {/* Fecha y Recolector */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="date" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Fecha y Recolector
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Fecha:</span>
                  <span className="font-bold text-slate-800">{formData.date}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Recolector:</span>
                  <span className="font-bold text-slate-800">{user?.username || user?.email || 'Usuario'}</span>
                </div>
              </div>
            </div>

            {/* Material Recolectado */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="package" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Material Recolectado
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Tipo:</span>
                  <span className="font-bold text-slate-800">{typeLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Especie:</span>
                  <span className="font-bold text-slate-800">{formData.species || 'No especificada'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Cantidad:</span>
                  <span className="font-bold text-slate-800">{formData.quantity} {unitLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Método:</span>
                  <span className="font-bold text-slate-800">{formData.method || 'No especificado'}</span>
                </div>
              </div>
            </div>

            {/* Evidencia Fotográfica */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="photo" className="h-5 w-5 text-brand-500" />
                  <h3 className="text-base font-extrabold text-brand-700">
                    Evidencia Fotográfica
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="info" className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold text-green-600">✓</span>
                </div>
              </div>
              <p className="mb-3 text-xs font-semibold text-slate-600">
                Lugar: {formData.placePhotos.length} foto(s) | Total: {formData.totalPhotos.length} foto(s)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {formData.placePhotos.slice(0, 2).map((photo, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img 
                      src={photo}
                      alt={`Lugar ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {formData.totalPhotos.slice(0, 2).map((photo, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                    <img 
                      src={photo}
                      alt={`Total ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Ubicación */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="pin" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Ubicación
                </h3>
              </div>
              <div className="space-y-2">
                {formData.ubicacionNombre && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">Nombre:</span>
                    <span className="ml-4 text-right font-bold text-slate-800">{formData.ubicacionNombre}</span>
                  </div>
                )}
                {formData.referencia && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">Referencia:</span>
                    <span className="ml-4 text-right font-bold text-slate-800">{formData.referencia}</span>
                  </div>
                )}
                {(formData.latitud && formData.longitud) && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">Coordenadas:</span>
                    <span className="font-bold text-slate-800">{formData.latitud}, {formData.longitud}</span>
                  </div>
                )}
                {formData.paisNombre && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">País:</span>
                    <span className="font-bold text-slate-800">{formData.paisNombre}</span>
                  </div>
                )}
                {formData.divisionRuta.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">Ruta administrativa:</span>
                    <span className="ml-4 text-right font-bold text-slate-800">
                      {formData.divisionRuta.join(' > ')}
                    </span>
                  </div>
                )}
                {formData.precisionM && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-600">Precisión GPS:</span>
                    <span className="font-bold text-slate-800">{formData.precisionM} m</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Fuente:</span>
                  <span className="font-bold text-slate-800">GPS_MOVIL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Almacenamiento:</span>
                  <span className="font-bold text-slate-800">{formData.almacenamiento}</span>
                </div>
              </div>
            </div>

            {/* Código de Trazabilidad */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="qr" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Código de Trazabilidad
                </h3>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-800">
                  {traceabilityCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(traceabilityCode);
                    alert('Código copiado al portapapeles');
                  }}
                  className="text-xs font-semibold text-slate-400 underline hover:text-slate-600"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Notas */}
            {formData.notes && (
              <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Icon name="info" className="h-5 w-5 text-brand-500" />
                  <h3 className="text-base font-extrabold text-brand-700">
                    Notas
                  </h3>
                </div>
                <p className="text-sm text-slate-700">
                  {formData.notes}
                </p>
              </div>
            )}

            {formData.isNewFind && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 shadow-soft">
                <div className="flex items-center gap-2">
                  <Icon name="info" className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-semibold text-amber-800">
                    Marcado como posible nuevo hallazgo
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <Icon name="info" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-extrabold text-red-900 mb-1">Error al crear recolección</h3>
                    <p className="text-xs font-semibold text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Guardando recolección...</span>
                </>
              ) : (
                'Registrar Recolección'
              )}
            </button>
          </div>
        </div>
      </div>

      {showSuccess && (
        <SuccessModal
          onViewBlockchain={() => {
            // Aquí iría la lógica para ver el registro en blockchain
            setShowSuccess(false);
            finalize();
          }}
          onBackToMenu={() => {
            setShowSuccess(false);
            finalize();
          }}
          summaryText={summaryText}
        />
      )}
    </div>
  );
}

export default SummaryForm;
