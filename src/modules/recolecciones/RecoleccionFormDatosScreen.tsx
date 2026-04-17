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
import NewPlantModal from "./components/NewPlantModal";
import { useCatalogosRecoleccion } from "./hooks/useCatalogosRecoleccion";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/jpg'];

function RecoleccionFormDatosScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formData, updateForm } = useRecoleccionForm();
  const dateRange = useMemo(() => buildPastRange(MAX_DIAS_RECOLECCION), []);
  const [date, setDate] = useState(() =>
    clampDateToRange(formData?.date, dateRange),
  );
  const [type, setType] = useState<MaterialType>(formData?.type || "seed");
  const [species, setSpecies] = useState(formData?.species || "");
  const {
    plantas,
    tiposPlantas,
    metodos,
    setPlantas,
    selectedPlanta,
    setSelectedPlanta,
    metodoId,
    setMetodoId,
    methodName,
    setMethodName,
    loadingPlantas,
    loadingMetodos,
  } = useCatalogosRecoleccion(formData?.planta_id, formData?.metodo_id);
  const [quantity, setQuantity] = useState(formData?.quantity || "0");
  const [unit, setUnit] = useState<Unit>(formData?.unit || "kg");
  const [notes, setNotes] = useState(formData?.notes || "");
  const [isNewFind, setIsNewFind] = useState(formData?.isNewFind || false);
  const [placePhotos, setPlacePhotos] = useState<string[]>(formData?.placePhotos || []);
  const [totalPhotos, setTotalPhotos] = useState<string[]>(formData?.totalPhotos || []);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showNewPlantForm, setShowNewPlantForm] = useState(false);
  const [newPlantData, setNewPlantData] = useState({
    especie: '',
    nombre_cientifico: '',
    variedad: '',
    tipo_planta_id: 0,
    nombre_comun_principal: '',
    nombres_comunes: '',
    imagen_url: '',
    notas: '',
  });
  const [newPlantImagePreview, setNewPlantImagePreview] = useState<string>('');
  const [submittingNewPlant, setSubmittingNewPlant] = useState(false);
  const [showPlantSuccessModal, setShowPlantSuccessModal] = useState(false);
  const [createdPlantName, setCreatedPlantName] = useState('');
  const [showPlantErrorModal, setShowPlantErrorModal] = useState(false);
  const [plantErrorMessage, setPlantErrorMessage] = useState('');
  const [loadingEditDraft, setLoadingEditDraft] = useState(false);
  const [didHydrateEditDraft, setDidHydrateEditDraft] = useState(false);
  const [newPlantErrors, setNewPlantErrors] = useState({
    especie: false,
    nombre_cientifico: false,
    imagen_url: false,
    tipo_planta_id: false,
    nombre_comun_principal: false,
  });
  
  const [errors, setErrors] = useState({
    date: false,
    dateRange: false,
    quantity: false,
    photos: false,
    method: false,
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
        const tipoMaterial = (draft.tipo_material || '').toUpperCase();
        const isCutting = tipoMaterial === 'ESQUEJE';
        const nextType: MaterialType = isCutting ? 'cutting' : 'seed';
        const nextUnit = normalizeUnit(draft.unidad_canonica);

        const rawPhotos = draft.fotos?.map((photo) => photo.url).filter(Boolean) ?? [];
        const convertedPhotos = await Promise.all(rawPhotos.map((photoUrl) => imageUrlToDataUrl(photoUrl)));
        const fotosBase64 = convertedPhotos.filter((photo): photo is string => Boolean(photo));
        const splitIndex = Math.ceil(fotosBase64.length / 2);
        const nextPlacePhotos = fotosBase64.slice(0, splitIndex);
        const nextTotalPhotos = fotosBase64.slice(splitIndex);

        if (!isMounted) return;

        const plantaNombre =
          draft.nombre_comun_principal ??
          draft.nombre_comercial ??
          draft.planta?.nombre_comun_principal ??
          draft.planta?.especie ??
          '';

        setDate(draft.fecha || formData.date);
        setType(nextType);
        setSpecies(plantaNombre);
        setQuantity(
          String(
            draft.cantidad_inicial_canonica ?? draft.saldo_actual ?? formData.quantity,
          ),
        );
        setUnit(nextUnit);
        setNotes(draft.observaciones || '');
        setIsNewFind(Boolean(draft.especie_nueva));
        setPlacePhotos(nextPlacePhotos);
        setTotalPhotos(nextTotalPhotos);
        setMethodName(draft.metodo?.nombre || '');
        setMetodoId(draft.metodo_id || draft.metodo?.id || 0);

        if (draft.planta) {
          setSelectedPlanta(draft.planta);
          setPlantas((prev) => {
            if (prev.some((planta) => planta.id === draft.planta?.id)) {
              return prev;
            }
            return [...prev, draft.planta!];
          });
        }

        updateForm({
          editId,
          editInitialPhotos: fotosBase64,
          date: draft.fecha || formData.date,
          type: nextType,
          species: plantaNombre,
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
    setMetodoId,
    setMethodName,
    setPlantas,
    setSelectedPlanta,
    updateForm,
  ]);

  const handleCreateNewPlant = async () => {
    // Validar campos obligatorios
    const errors = {
      especie: !newPlantData.especie.trim(),
      nombre_cientifico: !newPlantData.nombre_cientifico.trim(),
      imagen_url: !newPlantData.imagen_url,
      tipo_planta_id: !newPlantData.tipo_planta_id || newPlantData.tipo_planta_id === 0,
      nombre_comun_principal: !newPlantData.nombre_comun_principal.trim(),
    };

    setNewPlantErrors(errors);

    if (Object.values(errors).some(error => error)) {
      console.log('⚠️ Errores de validación:', errors);
      return;
    }

    setSubmittingNewPlant(true);

    try {
      // 1. Validar si ya existe una planta con la misma especie
      console.log('🔍 Validando si existe planta con especie:', newPlantData.especie);
      const plantasExistentes = await RecoleccionesService.buscarPlantasPorEspecie(newPlantData.especie.trim());
      
      if (plantasExistentes.length > 0) {
        // Verificar si alguna tiene la misma especie exacta (case-insensitive)
        const especieDuplicada = plantasExistentes.find(
          p => p.especie.toLowerCase() === newPlantData.especie.trim().toLowerCase()
        );
        
        if (especieDuplicada) {
          setPlantErrorMessage(`Ya existe una planta con el nombre "${especieDuplicada.especie}".\n\nPor favor, verifica si es la planta que buscas o usa un nombre diferente.`);
          setShowPlantErrorModal(true);
          console.log('⚠️ Planta duplicada encontrada:', especieDuplicada);
          setSubmittingNewPlant(false);
          return;
        }
      }

      // 2. Crear la planta con el nuevo sistema de tipo_planta_id
      const plantaData = {
        especie: newPlantData.especie.trim(),
        nombre_cientifico: newPlantData.nombre_cientifico.trim(),
        variedad: newPlantData.variedad?.trim() || undefined,
        tipo_planta_id: newPlantData.tipo_planta_id,
        nombre_comun_principal: newPlantData.nombre_comun_principal.trim(),
        nombres_comunes: newPlantData.nombres_comunes.trim() || undefined,
        imagen_url: newPlantData.imagen_url,
        notas: newPlantData.notas.trim() || undefined,
      };

      console.log('📤 Creando nueva planta:', plantaData);
      const response = await RecoleccionesService.createPlanta(plantaData);
      
      if (response.success && response.data) {
        // Actualizar lista de plantas
        setPlantas(prev => [...prev, response.data]);
        
        // Seleccionar la nueva planta
        const nombreEspecie = response.data.especie || response.data.nombre_cientifico;
        setSpecies(nombreEspecie);
        setSelectedPlanta(response.data);
        setCreatedPlantName(nombreEspecie);
        
        // Cerrar modal de formulario
        setShowNewPlantForm(false);
        
        // Limpiar formulario
        setNewPlantData({
          especie: '',
          nombre_cientifico: '',
          variedad: '',
          tipo_planta_id: 0,
          nombre_comun_principal: '',
          nombres_comunes: '',
          imagen_url: '',
          notas: '',
        });
        setNewPlantImagePreview('');
        setNewPlantErrors({
          especie: false,
          nombre_cientifico: false,
          imagen_url: false,
          tipo_planta_id: false,
          nombre_comun_principal: false,
        });
        
        // Mostrar modal de éxito
        setShowPlantSuccessModal(true);
        
        // Cerrar automáticamente después de 2 segundos
        setTimeout(() => {
          setShowPlantSuccessModal(false);
          setShowSpeciesModal(false);
        }, 2000);
        
        console.log('✅ Planta creada y seleccionada:', response.data);
      }
    } catch (error: unknown) {
      console.error('❌ Error al crear planta:', error);
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      
      // Manejar error de planta duplicada (409)
      if (status === 409) {
        setPlantErrorMessage('Ya existe una planta con ese nombre científico y variedad.\n\nPor favor verifica si la planta ya está registrada o cambia la variedad.');
        setShowPlantErrorModal(true);
      } else if (status === 400) {
        setPlantErrorMessage('Error de validación. Por favor verifica los datos ingresados.');
        setShowPlantErrorModal(true);
      } else {
        setPlantErrorMessage('Error al crear la planta. Por favor, intenta de nuevo.');
        setShowPlantErrorModal(true);
      }
    } finally {
      setSubmittingNewPlant(false);
    }
  };

  const handleNewPlantImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FORMATS.includes(file.type)) {
      alert("Formato no permitido. Solo JPG o PNG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("La imagen de la planta no debe superar los 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setNewPlantImagePreview(base64String);
      setNewPlantData(prev => ({ ...prev, imagen_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleContinue = () => {
    const { errors: validationErrors, isValid } = validateRecoleccionForm(
      {
        ...formData,
        date,
        type,
        quantity,
        placePhotos,
        totalPhotos,
        metodo_id: metodoId,
      },
      { dateRange, stage: 'datos' },
    )

    setErrors({
      date: Boolean(validationErrors.date),
      dateRange: Boolean(validationErrors.dateRange),
      quantity: Boolean(validationErrors.quantity),
      photos: Boolean(validationErrors.fotos),
      method: Boolean(validationErrors.method),
    })

    if (!isValid) return

    // Obtener datos de la planta seleccionada
    let planta_id: number | undefined;
    let nombre_cientifico: string | undefined;
    let nombre_comercial: string | undefined;
    
    if (!isNewFind) {
      if (selectedPlanta) {
        // Usar la planta seleccionada del backend
        planta_id = selectedPlanta.id;
        nombre_cientifico = selectedPlanta.nombre_cientifico;
        nombre_comercial = selectedPlanta.especie;
        console.log('✅ Planta seleccionada:', { planta_id, nombre_cientifico, nombre_comercial });
      } else {
        console.warn('⚠️ No se seleccionó una planta cuando especie_nueva = false');
      }
    }

    updateForm({
      date,
      type,
      species,
      quantity,
      unit,
      notes,
      isNewFind,
      placePhotos,
      totalPhotos,
      metodo_id: metodoId,
      planta_id,
      nombre_cientifico: nombre_cientifico || species,
      nombre_comercial: nombre_comercial || species,
      method: methodName,
    })
    
    console.log('📤 Datos guardados en formulario:', {
      planta_id,
      nombre_cientifico,
      especie_nueva: isNewFind
    });
    
    navigate('/app/collections/new/location')
  }

  const hasMinimumPhotos = placePhotos.length >= 1 && totalPhotos.length >= 1;

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
            {species ? (
              <div className="flex flex-1 items-center justify-between rounded-2xl border border-brand-400 bg-brand-50 px-4 py-3 shadow-soft">
                <span className="text-base font-semibold text-brand-700">{species}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSpecies('')
                    setSelectedPlanta(null)
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-red-500"
                  title="Cambiar especie"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSpeciesModal(true)}
                disabled={loadingPlantas}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-semibold text-slate-500 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
              >
                {loadingPlantas ? 'Cargando especies...' : 'Seleccionar especie'}
              </button>
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
            <p className="text-base font-extrabold text-brand-700">
              Seleccionar método <span className="text-red-500">*</span>
            </p>
            <div className={`flex items-center rounded-2xl border px-4 shadow-soft ${
              errors.method
                ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-200'
                : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200'
            }`}>
              <select
                value={metodoId ? String(metodoId) : ""}
                onChange={(event) => {
                  const selectedId = Number(event.target.value);
                  const selectedMetodo = metodos.find((metodo) => metodo.id === selectedId);
                  setMetodoId(Number.isFinite(selectedId) ? selectedId : undefined);
                  setMethodName(selectedMetodo?.nombre || "");
                  setErrors(prev => ({ ...prev, method: false }));
                }}
                disabled={loadingMetodos}
                className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
              >
                <option value="">{loadingMetodos ? "Cargando métodos..." : "Seleccionar método"}</option>
                {metodos.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nombre}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
            </div>
            {errors.method && (
              <p className="text-xs font-semibold text-red-500">* Debes seleccionar un método de recolección</p>
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
              photos={placePhotos}
              onChange={(next) => {
                setPlacePhotos(next)
                setErrors((prev) => ({ ...prev, photos: false }))
              }}
            />

            <PhotoPicker
              label="Total recolectado"
              badgeLabel="Total"
              photos={totalPhotos}
              onChange={(next) => {
                setTotalPhotos(next)
                setErrors((prev) => ({ ...prev, photos: false }))
              }}
            />

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Icon name="info" className="h-4 w-4 text-brand-500" />
              <span className={hasMinimumPhotos ? "text-brand-600" : ""}>
                Obligatorio: Mínimo 1 de cada tipo ({placePhotos.length} lugar, {totalPhotos.length} total)
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

          <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
            <input
              type="checkbox"
              checked={isNewFind}
              onChange={(event) => {
                const checked = event.target.checked;
                setIsNewFind(checked);
                // Si marca como nuevo hallazgo, limpiar la planta seleccionada
                if (checked) {
                  setSelectedPlanta(null);
                  console.log('⚠️ Nuevo hallazgo marcado, planta_id limpiado');
                }
              }}
              className="mt-1 h-5 w-5 accent-brand-600"
            />
            <div className="space-y-1">
              <p className="text-base font-extrabold text-brand-700">
                ¿Puede ser nuevo hallazgo?
              </p>
              <p className="text-sm font-semibold text-brand-600">
                Activa si sospechas que es un nuevo registro.
              </p>
            </div>
          </label>
          <button
            type="button"
            onClick={handleContinue}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            Continuar
          </button>
        </div>
      </div>

      {showSpeciesModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white pb-8 max-h-[85vh] flex flex-col">
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">Escoger una planta</h2>
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
                  const nombreEspecie = planta.especie || planta.nombre_cientifico
                  setSpecies(nombreEspecie)
                  setSelectedPlanta(planta)
                  setShowSpeciesModal(false)
                }}
                onCreateNew={() => {
                  setShowSpeciesModal(false)
                  setShowNewPlantForm(true)
                }}
              />
            </div>
          </div>
        </div>
      )}

      <NewPlantModal
        open={showNewPlantForm}
        tiposPlantas={tiposPlantas}
        data={newPlantData}
        imagePreview={newPlantImagePreview}
        errors={newPlantErrors}
        submitting={submittingNewPlant}
        onClose={() => {
          setShowNewPlantForm(false);
          setNewPlantData({
            especie: '',
            nombre_cientifico: '',
            variedad: '',
            tipo_planta_id: 0,
            nombre_comun_principal: '',
            nombres_comunes: '',
            imagen_url: '',
            notas: '',
          });
          setNewPlantImagePreview('');
          setNewPlantErrors({
            especie: false,
            nombre_cientifico: false,
            imagen_url: false,
            tipo_planta_id: false,
            nombre_comun_principal: false,
          });
        }}
        onChange={(partial) => {
          setNewPlantData((prev) => ({ ...prev, ...partial }));
          setNewPlantErrors((prev) => {
            const cleared = { ...prev };
            Object.keys(partial).forEach((key) => {
              if (key in cleared) {
                cleared[key as keyof typeof cleared] = false;
              }
            });
            return cleared;
          });
        }}
        onSubmit={handleCreateNewPlant}
        onImageUpload={(e) => {
          handleNewPlantImageUpload(e);
          setNewPlantErrors((prev) => ({ ...prev, imagen_url: false }));
        }}
      />

      {/* Modal de éxito al crear planta */}
      {showPlantSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 rounded-3xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-extrabold text-brand-700">
                  ¡Planta creada exitosamente!
                </h3>
                <p className="text-base font-semibold text-slate-600">
                  {createdPlantName}
                </p>
                <p className="text-sm font-semibold text-brand-500">
                  Se ha agregado al catálogo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error al crear planta */}
      {showPlantErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm mx-4 rounded-3xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-extrabold text-red-700">
                  Esta planta ya existe
                </h3>
                <p className="text-base font-semibold text-slate-600 whitespace-pre-line">
                  {plantErrorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlantErrorModal(false)}
                className="w-full rounded-2xl bg-red-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-red-600 active:scale-[0.99]"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecoleccionFormDatosScreen;
