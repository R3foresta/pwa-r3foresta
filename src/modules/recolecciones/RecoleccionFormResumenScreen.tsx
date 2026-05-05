import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import RecoleccionSuccessModal from "./RecoleccionSuccessModal";
import { useRecoleccionForm } from "./RecoleccionFormContext";
import { useAuth } from "../../contexts/AuthContext";
import { RecoleccionesService, type TipoMaterialCanonico } from "../../services/recolecciones.service";
import { mapFormToCreateDto, validateRecoleccionForm } from "./validators/recoleccionForm";
import { buildPastRange } from "../../utils/validations/date";
import { mapToCantidadYUnidadCanonica } from "../../utils/recoleccionUnidad";
import { MAX_DIAS_RECOLECCION } from "../../config/recoleccion";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_NEW_FILES = 5;

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function RecoleccionFormResumenScreen() {
  const navigate = useNavigate();
  const { formData, resetForm } = useRecoleccionForm();
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<'borrador' | 'validacion' | null>(null);
  const [loadingType, setLoadingType] = useState<'borrador' | 'validacion' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDraftFiles, setNewDraftFiles] = useState<File[]>([]);
  const [newDraftPreviewUrls, setNewDraftPreviewUrls] = useState<string[]>([]);
  const dateRange = useMemo(() => buildPastRange(MAX_DIAS_RECOLECCION), []);
  const typeLabel = formData.type === 'seed' ? 'Semilla' : 'Esqueje';
  const unitLabel = formData.unit === 'kg' ? 'kg' : formData.unit === 'g' ? 'g' : 'unidades';
  const commercialName = formData.nombre_comercial || formData.species || 'Especie seleccionada';
  const scientificName = formData.nombre_cientifico || 'No disponible';
  const summaryText = `${formData.quantity} ${unitLabel} de ${commercialName}`;
  const isEditMode = Boolean(formData.editId);
  const datosRoute = isEditMode && formData.editId
    ? `/app/collections/new?editId=${formData.editId}`
    : '/app/collections/new';
  const ubicacionRoute = isEditMode && formData.editId
    ? `/app/collections/new/location?editId=${formData.editId}`
    : '/app/collections/new/location';
  const successTitle =
    successMode === 'validacion'
      ? 'Recolección enviada a validación'
      : 'Borrador guardado';
  const successDescription =
    successMode === 'validacion'
      ? 'El registro quedó pendiente de revisión.'
      : 'Puedes volver luego para completarlo o enviarlo a validación.';

  useEffect(() => {
    const urls = newDraftFiles.map((file) => URL.createObjectURL(file));
    setNewDraftPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newDraftFiles]);

  const handleSelectNewDraftFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const mergedFiles = [...newDraftFiles, ...selectedFiles];

    if (mergedFiles.length > MAX_NEW_FILES) {
      setError('Solo puedes agregar hasta 5 fotos nuevas por edición.');
      event.target.value = '';
      return;
    }

    const invalidType = mergedFiles.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (invalidType) {
      setError(`Formato inválido (${invalidType.name}). Solo JPG/JPEG/PNG.`);
      event.target.value = '';
      return;
    }

    const invalidSize = mergedFiles.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (invalidSize) {
      setError(`La imagen ${invalidSize.name} supera el máximo de 5MB.`);
      event.target.value = '';
      return;
    }

    setError(null);
    setNewDraftFiles(mergedFiles);
    event.target.value = '';
  };

  const removeNewDraftFile = (indexToRemove: number) => {
    setNewDraftFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const finalize = () => {
    resetForm();
    navigate('/app/collections');
  };

  const startNewCollection = () => {
    resetForm();
    navigate('/app/collections/new');
  };

  const handleGuardar = async (enviarAValidacion: boolean) => {
    setLoadingType(enviarAValidacion ? 'validacion' : 'borrador');
    setError(null);

    try {
      const validation = validateRecoleccionForm(formData, { dateRange, stage: 'resumen' });
      if (!validation.isValid) {
        throw new Error(Object.values(validation.errors).filter(Boolean)[0] || 'Datos incompletos');
      }

      const tipo_material: TipoMaterialCanonico = formData.type === 'cutting' ? 'ESQUEJE' : 'SEMILLA';
      const { cantidad_inicial_canonica, unidad_canonica } = mapToCantidadYUnidadCanonica(
        Number(formData.quantity),
        formData.unit,
      );

      if (isEditMode && formData.editId) {
        const draftPayload = {
          fecha: formData.date,
          cantidad_inicial_canonica,
          unidad_canonica,
          tipo_material,
          observaciones: formData.notes || undefined,
          vivero_id: formData.vivero_id,
          metodo_id: formData.metodo_id,
          planta_id: formData.planta_id,
          ubicacion: {
            nombre: formData.ubicacionNombre || undefined,
            referencia: formData.referencia || undefined,
            latitud: Number(formData.latitud),
            longitud: Number(formData.longitud),
            pais_id: formData.paisId ? Number(formData.paisId) : undefined,
            division_id: formData.divisionId ? Number(formData.divisionId) : undefined,
            precision_m: formData.precisionM ? Number(formData.precisionM) : undefined,
            fuente: formData.fuenteUbicacion,
          },
        };

        const currentPhotos = [...(formData.placePhotos || []), ...(formData.totalPhotos || [])];
        const initialPhotos = new Set(formData.editInitialPhotos || []);
        const pickerNewPhotos = currentPhotos.filter((photo) => !initialPhotos.has(photo));
        const pickerNewFiles = pickerNewPhotos.map((photo, index) => {
          const extension = photo.startsWith('data:image/png') ? 'png' : 'jpg';
          return base64ToFile(photo, `edicion_picker_${Date.now()}_${index + 1}.${extension}`);
        });

        const allNewFiles = [...pickerNewFiles, ...newDraftFiles];

        if (allNewFiles.length > 0) {
          const batches = chunkArray(allNewFiles, MAX_NEW_FILES);
          await RecoleccionesService.updateDraft(formData.editId, draftPayload, batches[0]);

          for (const batch of batches.slice(1)) {
            await RecoleccionesService.updateDraft(formData.editId, {}, batch);
          }
        } else {
          await RecoleccionesService.updateDraft(formData.editId, draftPayload);
        }

        if (enviarAValidacion) {
          await RecoleccionesService.submit(formData.editId);
        }
      } else {
        const dtoV2 = mapFormToCreateDto(formData);
        const created = await RecoleccionesService.create(dtoV2);
        if (!created.success || !created.data?.id) {
          throw new Error('No se pudo crear la recolección.');
        }

        if (enviarAValidacion) {
          await RecoleccionesService.submit(created.data.id);
        }
      }

      setNewDraftFiles([]);
      setSuccessMode(enviarAValidacion ? 'validacion' : 'borrador');
      setShowSuccess(true);
    } catch (err) {
      console.error('❌ Error al guardar recolección:', err);
      setSuccessMode(null);
      setError(err instanceof Error ? err.message : 'Error desconocido al crear recolección');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <div className="flex rounded-b-3xl bg-[#0f8351] mb-3 px-5 pb-8 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate(ubicacionRoute)}
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
              onClick={() => navigate(datosRoute)}
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
                  <span className="font-bold text-slate-800">{user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.nombre || user?.username || user?.email || 'Usuario'}</span>
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
                  <span className="font-semibold text-slate-600">Nombre comercial:</span>
                  <span className="ml-4 text-right font-bold text-slate-800">{commercialName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Nombre científico:</span>
                  <span className="ml-4 text-right font-bold italic text-slate-800">{scientificName}</span>
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

              {isEditMode && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"> 
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      multiple
                      className="hidden"
                      onChange={handleSelectNewDraftFiles}
                    />
                    Agregar fotos nuevas
                  </label>

                  {newDraftPreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {newDraftPreviewUrls.map((previewUrl, index) => (
                        <div key={`${previewUrl}-${index}`} className="space-y-1">
                          <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                            <img
                              src={previewUrl}
                              alt={`Nueva evidencia ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNewDraftFile(index)}
                            className="w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] font-semibold text-slate-500">
                    Máximo 5 fotos nuevas. Formatos JPG/JPEG/PNG. Tamaño máximo 5MB por foto.
                  </p>
                </div>
              )}
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

            {/* Trazabilidad */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="qr" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Trazabilidad
                </h3>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">
                  El código de trazabilidad oficial se asignará automáticamente después de guardar la recolección.
                </p>
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
                    <h3 className="text-sm font-extrabold text-red-900 mb-1">No se pudo completar la acción</h3>
                    <p className="text-xs font-semibold text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
              <p className="text-sm font-semibold text-brand-700">
                Puedes guardar este registro como borrador o enviarlo directamente a validación cuando esté listo.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleGuardar(true)}
                disabled={loadingType !== null}
                className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loadingType === 'validacion' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enviando a validación...</span>
                  </>
                ) : (
                  'Enviar a Validación'
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleGuardar(false)}
                disabled={loadingType !== null}
                className="w-full rounded-2xl border-2 border-brand-500 bg-white py-4 text-center text-lg font-extrabold text-brand-600 shadow-soft transition hover:bg-brand-50 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loadingType === 'borrador' ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando borrador...</span>
                  </>
                ) : (
                  'Guardar Borrador'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <RecoleccionSuccessModal
          title={successTitle}
          description={successDescription}
          summaryText={summaryText}
          primaryLabel="Volver al listado"
          secondaryLabel="Registrar otra recolección"
          onPrimaryAction={() => {
            setShowSuccess(false);
            finalize();
          }}
          onSecondaryAction={() => {
            setShowSuccess(false);
            startNewCollection();
          }}
        />
      )}
    </div>
  );
}

export default RecoleccionFormResumenScreen;
