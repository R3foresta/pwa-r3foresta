import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon";
import type { MaterialType, Unit } from "./recoleccionTypes";
import { useRecoleccionForm } from "./useRecoleccionForm";
import { RecoleccionesService } from "../../services/recolecciones.service";
import { buildPastRange, clampDateToRange } from "../../utils/validations/date";
import { MAX_DIAS_RECOLECCION } from "../../config/recoleccion";
import { MAX_FOTOS_POR_TIPO, validateRecoleccionForm } from "./validators/recoleccionForm";
import TipoMaterialSwitcher from "./components/TipoMaterialSwitcher";
import CantidadInput from "./components/CantidadInput";
import PhotoUploader from "../../components/evidence/PhotoUploader";
import { createPhotoAsset } from "../../components/evidence/photoAssets";
import PlantSelector from "../plantas/components/PlantSelector";
import { usePlantasCatalog } from "../plantas/hooks/usePlantasCatalog";
import { useCatalogosRecoleccion } from "./hooks/useCatalogosRecoleccion";


function RecoleccionFormDatosScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formData, updateForm } = useRecoleccionForm();
  const dateRange = useMemo(() => buildPastRange(MAX_DIAS_RECOLECCION), []);
  const [date, setDate] = useState(() =>
    clampDateToRange(formData?.date, dateRange),
  );
  // Estados locales para manejo de UI fluida
  const [quantity, setQuantity] = useState(formData?.quantity || "0");
  const [unit, setUnit] = useState<Unit>(formData?.unit || "kg");
  const [notes, setNotes] = useState(formData?.notes || "");

  const [type, setType] = useState<MaterialType>(formData?.type || "seed");

  const { plantas, loading: loadingPlantas } = usePlantasCatalog();
  const { metodos, loadingMetodos } = useCatalogosRecoleccion(formData.metodo_id);

  const [loadingEditDraft, setLoadingEditDraft] = useState(false);
  const [didHydrateEditDraft, setDidHydrateEditDraft] = useState(false);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  
  const [errors, setErrors] = useState({
    date: false,
    dateRange: false,
    quantity: false,
    photos: false,
    method: false,
    planta: false,
  });

  const editIdParam = searchParams.get('editId');
  const editId = editIdParam ? Number(editIdParam) : NaN;
  const isEditMode = Number.isFinite(editId) && editId > 0;
  const selectedPlant = useMemo(
    () => plantas.find((planta) => planta.id === formData.planta_id),
    [formData.planta_id, plantas],
  );
  const selectedPlantLabel =
    selectedPlant?.nombre_comun_principal ||
    selectedPlant?.especie ||
    formData.nombre_comercial ||
    formData.species ||
    "Especie seleccionada";
  const selectedPlantScientificName =
    selectedPlant?.nombre_cientifico || formData.nombre_cientifico || "";
  const selectedMethod = useMemo(
    () => metodos.find((metodo) => metodo.id === formData.metodo_id),
    [formData.metodo_id, metodos],
  );

  const normalizeUnit = (value: string | null | undefined): Unit => {
    const unitValue = (value || '').toLowerCase();
    if (unitValue === 'unidad' || unitValue === 'unidades' || unitValue === 'units') {
      return 'units';
    }
    if (unitValue === 'g' || unitValue === 'gr') {
      return 'g';
    }
    return 'kg';
  };

  useEffect(() => {
    if (!isEditMode || didHydrateEditDraft) {
      return;
    }

    let isMounted = true;

    const hydrateFromDraft = async () => {
      try {
        setLoadingEditDraft(true);
        const response = await RecoleccionesService.getById(editId);
        if (!isMounted) return;

        const draft = response.data;
        // 1. Mapeo de Tipos y Unidades
        const tipoMaterial = (draft.tipo_material || '').toUpperCase();
        const isCutting = tipoMaterial === 'ESQUEJE';
        const nextType: MaterialType = isCutting ? 'cutting' : 'seed';
        const nextUnit = normalizeUnit(draft.unidad_canonica);
        // 2. Fotos existentes: solo se usan como preview, no se vuelven a subir.
        const existingPhotos = draft.fotos
          ?.map((photo) => photo.url)
          .filter((url): url is string => Boolean(url))
          .map((previewUrl) => ({ previewUrl })) ?? [];
        // Dividimos las fotos para los dos pickers (lugar y total)
        const splitIndex = Math.ceil(existingPhotos.length / 2);
        const nextPlacePhotos = existingPhotos.slice(0, splitIndex);
        const nextTotalPhotos = existingPhotos.slice(splitIndex);

        if (!isMounted) return;
        // 3. Sincronizar Estados Locales Operativos

        setDate(draft.fecha || formData.date);
        setType(nextType);
        setQuantity(
          String(
            draft.cantidad_inicial_canonica ?? draft.saldo_actual ?? formData.quantity,
          ),
        );
        setUnit(nextUnit);
        setNotes(draft.observaciones || '');
        

        updateForm({
          editId,
          date: draft.fecha || formData.date,
          type: nextType,
          method: draft.metodo?.nombre || '',
          species:
            draft.nombre_comercial ||
            draft.planta?.nombre_comun_principal ||
            draft.planta?.especie ||
            '',
          quantity: String(draft.cantidad_inicial_canonica ?? draft.saldo_actual ?? formData.quantity),
          unit: nextUnit,
          notes: draft.observaciones || '',
          isNewFind: Boolean(draft.especie_nueva),
          placePhotos: nextPlacePhotos,
          totalPhotos: nextTotalPhotos,
          metodo_id: draft.metodo_id || draft.metodo?.id || undefined,
          planta_id: draft.planta_id || draft.planta?.id || undefined,
          nombre_cientifico: draft.nombre_cientifico || draft.planta?.nombre_cientifico || undefined,
          nombre_comercial: draft.nombre_comercial || draft.planta?.especie || undefined,
          ubicacionNombre: draft.ubicacion?.nombre || '',
          referencia: draft.ubicacion?.referencia || '',
          latitud: String(draft.ubicacion?.coordenadas?.lat ?? ''),
          longitud: String(draft.ubicacion?.coordenadas?.lon ?? ''),
          paisId: draft.ubicacion?.pais?.id ? String(draft.ubicacion.pais.id) : '',
          paisNombre: draft.ubicacion?.pais?.nombre || '',
          divisionId: draft.ubicacion?.division?.id ? String(draft.ubicacion.division.id) : '',
          divisionRuta: draft.ubicacion?.division?.ruta?.map((item) => item.nombre) || [],
          precisionM:
            draft.ubicacion?.coordenadas?.precision_m !== null &&
            draft.ubicacion?.coordenadas?.precision_m !== undefined
              ? String(draft.ubicacion.coordenadas.precision_m)
              : '',
          fuenteUbicacion: draft.ubicacion?.coordenadas?.fuente || 'GPS_MOVIL',
          almacenamiento: draft.vivero?.nombre || '',
          vivero_id: draft.vivero_id || draft.vivero?.id || undefined,
        });
      } catch (errorHydrate) {
        console.error('❌ Error cargando borrador para edición:', errorHydrate);
      } finally {
        if (isMounted) {
          setLoadingEditDraft(false);
          setDidHydrateEditDraft(true);
        }
      }
    };

    void hydrateFromDraft();

    return () => {
      isMounted = false;
    };
  }, [
    didHydrateEditDraft,
    editId,
    formData.date,
    formData.quantity,
    isEditMode,
    updateForm,
  ]);

  const validateQuantity = (value: string, requiresInteger: boolean): boolean => {
    const numericValue = Number(value)

    if (!value || numericValue <= 0) return false

    if (requiresInteger && !Number.isInteger(numericValue)) return false

    return true
  }


  const handleContinue = () => {
  const requiresInteger = type === 'cutting' || unit === 'units'

  if (!validateQuantity(quantity, requiresInteger)) {
    setErrors((prev) => ({
      ...prev,
      quantity: true,
    }))
    return
  }

  const nextFormData = {
    ...formData,
    date,
    type,
    quantity,
    unit,
    notes,
    method: selectedMethod?.nombre || formData.method,
  }

  const { errors: validationErrors, isValid } = validateRecoleccionForm(
    nextFormData,
    { dateRange, stage: 'datos' }
  )

  setErrors({
    date: Boolean(validationErrors.date),
    dateRange: Boolean(validationErrors.dateRange),
    quantity: Boolean(validationErrors.quantity),
    photos: Boolean(validationErrors.fotos),
    method: Boolean(validationErrors.method),
    planta: Boolean(validationErrors.planta),
  })

  if (!isValid) {
    console.warn('⚠️ Formulario inválido:', validationErrors)
    return
  }

  updateForm(nextFormData)

  navigate('/app/collections/new/location')
}

  const hasMinimumPhotos =
    (formData.placePhotos?.length || 0) >= 1 && (formData.totalPhotos?.length || 0) >= 1;

  const addPhotos = (field: 'placePhotos' | 'totalPhotos', files: File[]) => {
    const currentPhotos = formData[field] ?? [];
    const availableSlots = Math.max(0, MAX_FOTOS_POR_TIPO - currentPhotos.length);
    const nextPhotos = files
      .slice(0, availableSlots)
      .map(createPhotoAsset);

    if (nextPhotos.length === 0) return;

    if (field === 'placePhotos') {
      updateForm({ placePhotos: [...currentPhotos, ...nextPhotos] });
    } else {
      updateForm({ totalPhotos: [...currentPhotos, ...nextPhotos] });
    }
    setErrors((prev) => ({ ...prev, photos: false }));
  };

  const removePhoto = (field: 'placePhotos' | 'totalPhotos', index: number) => {
    const currentPhotos = formData[field] ?? [];
    const nextPhotos = currentPhotos.filter((_, photoIndex) => photoIndex !== index);

    if (field === 'placePhotos') {
      updateForm({ placePhotos: nextPhotos });
    } else {
      updateForm({ totalPhotos: nextPhotos });
    }
    setErrors((prev) => ({ ...prev, photos: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="sticky top-0 z-40 bg-white/150 backdrop-blur-md flex items-center justify-center pb-4 pt-6 shadow-sm border-b border-neutral-200/50">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections')}
            className="absolute left-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-700">
              {isEditMode ? 'Editar recolección' : 'Nueva recolección'}
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Paso 1 de 3 ·{" "}
              <span className="text-neutral-500">Datos generales</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5">
          {loadingEditDraft && (
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-600 shadow-soft ring-1 ring-black/5">
              Cargando borrador para edición...
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">Fecha <span className="text-danger-500">*</span></p>
            <input
              type="date"
              value={date}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(event) => {
                setDate(event.target.value);
                setErrors(prev => ({ ...prev, date: false, dateRange: false }));
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-neutral-700 shadow-soft outline-none transition focus:ring-2 ${
                errors.date || errors.dateRange
                  ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                  : 'border-neutral-200 bg-white focus:border-brand-400 focus:ring-brand-200'
              }`}
            />
            {errors.date && (
              <p className="text-xs font-semibold text-danger-500">* La fecha es obligatoria</p>
            )}
            {errors.dateRange && (
              <p className="text-xs font-semibold text-danger-500">* La fecha debe estar entre {dateRange.min} y {dateRange.max}</p>
            )}
          </div>

          <TipoMaterialSwitcher
            value={type}
            onChange={(newType) => {
              setType(newType)
              setUnit(newType === 'cutting' ? 'units' : 'kg')
              setErrors((prev) => ({ ...prev, tipoMaterial: false }))
            }}
          />

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Especie recolectada</p>
            {formData.planta_id ? (
              <div className="rounded-2xl border border-brand-200 bg-white px-4 py-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">
                      Catálogo botánico
                    </p>
                    <p className="truncate text-base font-extrabold text-brand-700">
                      {selectedPlantLabel}
                    </p>
                    {selectedPlantScientificName ? (
                      <p className="text-sm font-semibold italic text-neutral-500">
                        {selectedPlantScientificName}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-neutral-500">
                        Especie seleccionada correctamente.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateForm({
                        planta_id: undefined,
                        species: "",
                        nombre_cientifico: undefined,
                        nombre_comercial: undefined,
                      })
                    }
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSpeciesModal(true)}
                  disabled={loadingPlantas}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold shadow-soft transition hover:bg-brand-50 disabled:opacity-50 ${
                    errors.planta
                      ? "border-danger-400 bg-danger-50 text-danger-500"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-brand-300"
                  }`}
                >
                  {loadingPlantas ? "Sincronizando catálogo..." : "Seleccionar del catálogo botánico"}
                </button>
                <p className="ml-1 text-[10px] italic leading-tight text-brand-400">
                  ¿No encuentras la especie? Regístrala primero en Gestión de Plantas.
                </p>
              </div>
            )}
            {errors.planta && (
              <p className="text-xs font-semibold text-danger-500">
                * Debes seleccionar una especie del catálogo para continuar
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">
              Método de recolección <span className="text-danger-500">*</span>
            </p>
            <select
              value={formData.metodo_id ? String(formData.metodo_id) : ""}
              onChange={(event) => {
                const nextMetodoId = event.target.value ? Number(event.target.value) : undefined;
                const metodo = metodos.find((item) => item.id === nextMetodoId);
                updateForm({
                  metodo_id: nextMetodoId,
                  method: metodo?.nombre || "",
                });
                setErrors((prev) => ({ ...prev, method: false }));
              }}
              disabled={loadingMetodos}
              className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold shadow-soft outline-none transition focus:ring-2 ${
                errors.method
                  ? "border-danger-400 bg-danger-50 text-danger-500 focus:border-danger-400 focus:ring-danger-200"
                  : "border-neutral-200 bg-white text-neutral-700 focus:border-brand-400 focus:ring-brand-200"
              }`}
            >
              <option value="">
                {loadingMetodos ? "Cargando métodos disponibles..." : "Selecciona un método"}
              </option>
              {metodos.map((metodo) => (
                <option key={metodo.id} value={metodo.id}>
                  {metodo.nombre}
                </option>
              ))}
            </select>
            {selectedMethod?.descripcion && (
              <p className="text-xs font-semibold text-neutral-500">{selectedMethod.descripcion}</p>
            )}
            {errors.method && (
              <p className="text-xs font-semibold text-danger-500">
                * Selecciona un método de recolección
              </p>
            )}
          </div>

          <CantidadInput
            value={quantity}
            tipoMaterial={type}
            unidad={unit}
            error={errors.quantity}
            onChange={(val) => {
              setQuantity(val);
              setErrors((prev) => ({ ...prev, quantity: false }));
            }}
          />
          {type === 'seed' ? (
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Kg', value: 'kg' as Unit },
                { label: 'Gr', value: 'g' as Unit },
                { label: 'Unidades', value: 'units' as Unit },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUnit(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    unit === option.value
                      ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-bold text-white shadow-sm">
              Unidades
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-brand-700">
                Evidencia fotográfica <span className="text-danger-500">*</span>
              </p>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-neutral-400" />
            </div>

            {isEditMode && (
              <div className="rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs font-semibold text-warning-800">
                Las imágenes subidas anteriormente no se pueden modificar ni reemplazar en edición.
                Solo puedes agregar imágenes nuevas.
              </div>
            )}

            <PhotoUploader
              label="Lugar"
              photoLabel="Lugar"
              photos={formData.placePhotos || []} //  Usa formData
              max={MAX_FOTOS_POR_TIPO}
              onAdd={(files) => addPhotos('placePhotos', files)}
              onRemove={(index) => removePhoto('placePhotos', index)}
            />

            <PhotoUploader
              label="Total recolectado"
              photoLabel="Total"
              photos={formData.totalPhotos || []} // Usa formData
              max={MAX_FOTOS_POR_TIPO}
              onAdd={(files) => addPhotos('totalPhotos', files)}
              onRemove={(index) => removePhoto('totalPhotos', index)}
            />

            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
              <Icon name="info" className="h-4 w-4 text-brand-500" />
              <span className={hasMinimumPhotos ? "text-brand-600" : ""}>
                {/* 🔄 FASE 4: Leemos del contexto global */}
                Obligatorio: Mínimo 1 de cada tipo ({(formData.placePhotos?.length || 0)} lugar, {(formData.totalPhotos?.length || 0)} total)
              </span>
            </div>
            {errors.photos && (
              <p className="text-xs font-semibold text-danger-500">* Debes agregar al menos 1 foto de Lugar y 1 de Total recolectado</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Notas</p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Acá escribes las notas mientras vas haciendo la recolección, hasta 4000"
              className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base font-semibold text-neutral-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Modal de Selección de Especie (Catálogo) */}
      {showSpeciesModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white pb-8 max-h-[85vh] flex flex-col">
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">Catálogo Botánico</h2>
              <button
                type="button"
                onClick={() => setShowSpeciesModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-neutral-200 active:scale-95"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
              <PlantSelector
                plantas={plantas}
                loading={loadingPlantas}
                onSelect={(planta) => {
                  updateForm({
                    planta_id: planta.id,
                    species: planta.nombre_comun_principal || planta.especie || "",
                    nombre_cientifico: planta.nombre_cientifico || undefined,
                    nombre_comercial: planta.nombre_comun_principal || planta.especie || undefined,
                  });
                  setShowSpeciesModal(false);
                  setErrors(prev => ({ ...prev, planta: false }));
                }}
              />
            {/* Nota informativa dentro del modal */}
              <div className="mt-4 rounded-xl bg-brand-50 p-4 border border-brand-100 text-center">
                <p className="text-xs font-semibold text-brand-600 italic">
                  ¿No encuentras la especie? Regístrala primero en la pantalla de "Gestión de Plantas" para mantener la integridad del catálogo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecoleccionFormDatosScreen;
