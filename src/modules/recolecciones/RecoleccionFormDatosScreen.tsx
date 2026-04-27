import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon";
import type { MaterialType, Unit } from "./recoleccionTypes";
import { useRecoleccionForm } from "./RecoleccionFormContext";
import { RecoleccionesService } from "../../services/recolecciones.service";
import { buildPastRange, clampDateToRange } from "../../utils/validations/date";
import { MAX_DIAS_RECOLECCION } from "../../config/recoleccion";
import { validateRecoleccionForm } from "./validators/recoleccionForm";
import TipoMaterialSwitcher from "./components/TipoMaterialSwitcher";
import CantidadInput from "./components/CantidadInput";
import PhotoPicker from "./components/PhotoPicker";
import PlantSelector from "./components/PlantSelector";
//Usamos el nuevo hook especializado
import { usePlantasCatalog } from "./hooks/usePlantasCatalog";


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

  // Cargamos plantas del nuevo hook independiente
  const { plantas, loading: loadingPlantas } = usePlantasCatalog(formData.planta_id);


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

  const imageUrlToDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo convertir imagen a base64'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
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
        // 2. Procesamiento de Fotos (Se mantiene igual)
        const rawPhotos = draft.fotos?.map((photo) => photo.url).filter(Boolean) ?? [];
        const convertedPhotos = await Promise.all(rawPhotos.map((photoUrl) => imageUrlToDataUrl(photoUrl)));
        const fotosBase64 = convertedPhotos.filter((photo): photo is string => Boolean(photo));
        // Dividimos las fotos para los dos pickers (lugar y total)
        const splitIndex = Math.ceil(fotosBase64.length / 2);
        const nextPlacePhotos = fotosBase64.slice(0, splitIndex);
        const nextTotalPhotos = fotosBase64.slice(splitIndex);

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
          editInitialPhotos: fotosBase64,
          date: draft.fecha || formData.date,
          type: nextType,
          method: draft.metodo?.nombre || '',
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



  const handleContinue = () => {
    const { errors: validationErrors, isValid } = validateRecoleccionForm(
      formData, 
      { dateRange, stage: 'datos' }
    );

    setErrors({
      date: Boolean(validationErrors.date),
      dateRange: Boolean(validationErrors.dateRange),
      quantity: Boolean(validationErrors.quantity),
      photos: Boolean(validationErrors.fotos),
      method: Boolean(validationErrors.method),
      planta: Boolean(validationErrors.planta),
    })
    // 3. Si no es válido (ej. no seleccionó planta), detenemos el flujo
    if (!isValid) {
      console.warn('⚠️ Formulario inválido:', validationErrors);
      return;
    }
    
    navigate('/app/collections/new/location')
  }

  const hasMinimumPhotos = (formData.totalPhotos?.length || 0) >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-32">
        <header className="sticky top-0 z-40 bg-white/150 backdrop-blur-md flex items-center justify-center pb-4 pt-6 shadow-sm border-b border-slate-200/50">
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
              <span className="text-slate-500">Datos generales</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5">
          {loadingEditDraft && (
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-soft ring-1 ring-black/5">
              Cargando borrador para edición...
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">Fecha <span className="text-red-500">*</span></p>
            <input
              type="date"
              value={date}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(event) => {
                setDate(event.target.value);
                setErrors(prev => ({ ...prev, date: false, dateRange: false }));
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                errors.date || errors.dateRange
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
              }`}
            />
            {errors.date && (
              <p className="text-xs font-semibold text-red-500">* La fecha es obligatoria</p>
            )}
            {errors.dateRange && (
              <p className="text-xs font-semibold text-red-500">* La fecha debe estar entre {dateRange.min} y {dateRange.max}</p>
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
            <p className="text-base font-extrabold text-brand-700">Especie de la semilla:</p>
            {formData.planta_id ? (
              <div className="flex flex-1 items-center justify-between rounded-2xl border border-brand-400 bg-brand-50 px-4 py-3 shadow-soft">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-brand-700">
                    {/* Buscamos el nombre en la lista cargada por usePlantasCatalog */}
                    {plantas.find(p => p.id === formData.planta_id)?.nombre_comun_principal || 'Cargando especie...'}
                  </span>
                  <span className="text-xs italic text-brand-400">
                    ID: {formData.planta_id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm({ planta_id: undefined })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-red-500"
                  title="Cambiar especie"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSpeciesModal(true)}
                  disabled={loadingPlantas}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold shadow-soft transition hover:bg-brand-50 disabled:opacity-50 ${
                    errors.planta ? 'border-red-400 text-red-400' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300'
                  }`}
                >
                  {loadingPlantas ? 'Sincronizando catálogo...' : 'Seleccionar del catálogo botánico'}
                </button>
                <p className="text-[10px] text-brand-400 ml-1 italic leading-tight">
                  ¿No encuentras la especie? Regístrala primero en la sección de Gestión Botánica.
                </p>
              </div>
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
            onErrorClear={() => setErrors((prev) => ({ ...prev, quantity: false }))}
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
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50'
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

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Identidad Botánica (Catálogo):</p>
            {formData.planta_id ? (
              <div className="flex flex-1 items-center justify-between rounded-2xl border border-brand-400 bg-brand-50 px-4 py-3 shadow-soft">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-brand-700">
                    {/* Buscamos el nombre real en el catálogo que cargó el hook */}
                    {plantas.find(p => p.id === formData.planta_id)?.nombre_comun_principal || 'Cargando especie...'}
                  </span>
                  <span className="text-xs italic text-brand-400">ID: {formData.planta_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm({ planta_id: undefined })}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-red-500"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSpeciesModal(true)}
                  disabled={loadingPlantas}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold shadow-soft transition disabled:opacity-50 ${
                    errors.planta ? 'border-red-400 text-red-400 bg-red-50' : 'border-slate-200 bg-white text-slate-500 hover:bg-brand-50'
                  }`}
                >
                  {loadingPlantas ? 'Sincronizando catálogo...' : 'Seleccionar especie del catálogo'}
                </button>
                <p className="text-[10px] text-brand-400 ml-1 italic">
                  ¿No encuentras la especie? Regístrala primero en la sección de Plantas.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-brand-700">
                Evidencia fotográfica <span className="text-red-500">*</span>
              </p>
              <Icon name="arrow-left" className="h-4 w-4 rotate-180 text-slate-400" />
            </div>

            {isEditMode && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                Las imágenes subidas anteriormente no se pueden modificar ni reemplazar en edición.
                Solo puedes agregar imágenes nuevas.
              </div>
            )}

            <PhotoPicker
              label="Lugar"
              badgeLabel="Lugar"
              photos={formData.placePhotos || []} //  Usa formData
              onChange={(next) => {
                updateForm({ placePhotos: next }); // Actualiza el contexto directamente
                setErrors((prev) => ({ ...prev, photos: false }));
              }}
            />

            <PhotoPicker
              label="Total recolectado"
              badgeLabel="Total"
              photos={formData.totalPhotos || []} // Usa formData
              onChange={(next) => {
                updateForm({ totalPhotos: next }); // Actualiza el contexto directamente
                setErrors((prev) => ({ ...prev, photos: false }));
              }}
            />

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Icon name="info" className="h-4 w-4 text-brand-500" />
              <span className={hasMinimumPhotos ? "text-brand-600" : ""}>
                {/* 🔄 FASE 4: Leemos del contexto global */}
                Obligatorio: Mínimo 1 de cada tipo ({(formData.placePhotos?.length || 0)} lugar, {(formData.totalPhotos?.length || 0)} total)
              </span>
            </div>
            {errors.photos && (
              <p className="text-xs font-semibold text-red-500">* Debes agregar al menos 1 foto de Lugar y 1 de Total recolectado</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Notas</p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Acá escribes las notas mientras vas haciendo la recolección, hasta 4000"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
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
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">Catálogo Botánico</h2>
              <button
                type="button"
                onClick={() => setShowSpeciesModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
              <PlantSelector
                plantas={plantas}
                loading={loadingPlantas}
                onSelect={(planta) => {
                  // Guardamos el ID directamente en el contexto global
                  updateForm({ planta_id: planta.id });
                  setShowSpeciesModal(false);
                  // Limpiamos el error visual si existía
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

      {/* ❌ ELIMINACIÓN DE MODALES DE CREACIÓN
        Se han borrado los bloques:
        - showPlantSuccessModal (Éxito al crear planta)
        - showPlantErrorModal (Error al crear planta)
        
        Razón: El formulario de recolección ya no crea plantas 'en caliente'.
      */}

    </div>
  );
}

export default RecoleccionFormDatosScreen;
