import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import { methodOptions } from "./data";
import type { MaterialType, Unit } from "./types";
import { useCollectionForm } from "./CollectionFormContext";
import { RecoleccionService } from "../../services/recoleccion.service";
import type { Planta } from "../../services/recoleccion.service";

function NewCollectionForm() {
  const navigate = useNavigate();
  const { formData, updateForm } = useCollectionForm();
  const [date, setDate] = useState(() => formData?.date || new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<MaterialType>(formData?.type || "seed");
  const [species, setSpecies] = useState(formData?.species || "");
  const [method, setMethod] = useState(formData?.method || "");
  const [quantity, setQuantity] = useState(formData?.quantity || "0");
  const [unit, setUnit] = useState<Unit>(formData?.unit || "kg");
  const [notes, setNotes] = useState(formData?.notes || "");
  const [isNewFind, setIsNewFind] = useState(formData?.isNewFind || false);
  const [placePhotos, setPlacePhotos] = useState<string[]>(formData?.placePhotos || []);
  const [totalPhotos, setTotalPhotos] = useState<string[]>(formData?.totalPhotos || []);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalType, setModalType] = useState<'place' | 'total'>('place');
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewPlantForm, setShowNewPlantForm] = useState(false);
  const [newPlantData, setNewPlantData] = useState({
    especie: '',
    nombre_cientifico: '',
    variedad: '',
    tipo_planta: '',
    tipo_planta_otro: '',
    nombre_comun_principal: '',
    nombres_comunes: '',
    imagen_url: '',
    notas: '',
  });
  const [newPlantImagePreview, setNewPlantImagePreview] = useState<string>('');
  const [submittingNewPlant, setSubmittingNewPlant] = useState(false);
  const [showPlantSuccessModal, setShowPlantSuccessModal] = useState(false);
  const [createdPlantName, setCreatedPlantName] = useState('');
  const [newPlantErrors, setNewPlantErrors] = useState({
    especie: false,
    nombre_cientifico: false,
    variedad: false,
    imagen_url: false,
    tipo_planta: false,
    tipo_planta_otro: false,
    nombre_comun_principal: false,
  });
  
  // Plantas desde el backend
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [loadingPlantas, setLoadingPlantas] = useState(false);
  const [selectedPlanta, setSelectedPlanta] = useState<Planta | null>(null);
  
  // Filtrar plantas según el término de búsqueda
  const filteredPlantas = useMemo(() => {
    console.log('🔄 Filtrando plantas. Total:', plantas.length, 'Término:', searchTerm);
    // Filtrar por término de búsqueda
    if (!searchTerm.trim()) {
      console.log('📋 Sin filtro, mostrando todas:', plantas.length);
      return plantas;
    }
    const term = searchTerm.toLowerCase();
    const filtered = plantas.filter(planta => 
      (planta.especie?.toLowerCase().includes(term)) ||
      (planta.nombre_cientifico?.toLowerCase().includes(term))
    );
    console.log('📋 Filtradas:', filtered.length);
    return filtered;
  }, [plantas, searchTerm]);
  
  const [errors, setErrors] = useState({
    date: false,
    quantity: false,
    photos: false,
    method: false,
  });

  // Cargar plantas desde el backend
  useEffect(() => {
    const cargarPlantas = async () => {
      setLoadingPlantas(true);
      try {
        const plantasBackend = await RecoleccionService.getPlantas();
        setPlantas(plantasBackend);
        console.log('✅ Plantas cargadas desde backend:', plantasBackend);
        console.log('📊 Total de plantas:', plantasBackend.length);
        console.log('🔍 Primeras 5 plantas:', plantasBackend.slice(0, 5));
        
        // Si hay una planta guardada previamente, restaurarla
        if (formData?.planta_id) {
          const plantaGuardada = plantasBackend.find(p => p.id === formData.planta_id);
          if (plantaGuardada) {
            setSelectedPlanta(plantaGuardada);
          }
        }
      } catch (error) {
        console.error('❌ Error al cargar plantas:', error);
      } finally {
        setLoadingPlantas(false);
      }
    };
    
    cargarPlantas();
  }, []);

  // Cambiar unidad automáticamente cuando cambia el tipo
  const handleTypeChange = (newType: MaterialType) => {
    setType(newType);
    if (newType === "cutting") {
      setUnit("units");
    } else if (unit === "units") {
      setUnit("kg");
    }
  };

  const changeQuantity = (delta: number) => {
    setQuantity((value) => {
      const numValue = parseFloat(value) || 0;
      const newValue = Math.max(0, numValue + delta);
      return newValue.toString();
    });
  };

  const handleQuantityChange = (value: string) => {
    // Permitir vacío, números y decimales
    if (value === "" || value === "0") {
      setQuantity("0");
      return;
    }
    
    // Remover ceros a la izquierda excepto si es "0." o "0.algo"
    const cleanValue = value.replace(/^0+(?=\d)/, "");
    
    // Validar que sea un número válido con posible decimal
    if (/^\d*\.?\d*$/.test(cleanValue)) {
      setQuantity(cleanValue);
      if (parseFloat(cleanValue) > 0) {
        setErrors(prev => ({ ...prev, quantity: false }));
      }
    }
  };

  const handlePhotoUpload = (type: 'place' | 'total', event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (type === 'place') {
            setPlacePhotos(prev => {
              const newPhotos = [...prev, result];
              // Limpiar error si ahora hay fotos en ambos tipos
              if (newPhotos.length > 0 && totalPhotos.length > 0) {
                setErrors(prevErrors => ({ ...prevErrors, photos: false }));
              }
              return newPhotos;
            });
          } else {
            setTotalPhotos(prev => {
              const newPhotos = [...prev, result];
              // Limpiar error si ahora hay fotos en ambos tipos
              if (newPhotos.length > 0 && placePhotos.length > 0) {
                setErrors(prevErrors => ({ ...prevErrors, photos: false }));
              }
              return newPhotos;
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (type: 'place' | 'total', index: number) => {
    if (type === 'place') {
      setPlacePhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setTotalPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleNewPlantImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setNewPlantImagePreview(base64String);
      setNewPlantData(prev => ({ ...prev, imagen_url: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateNewPlant = async () => {
    // Validar campos obligatorios
    const errors = {
      especie: !newPlantData.especie.trim(),
      nombre_cientifico: !newPlantData.nombre_cientifico.trim(),
      variedad: !newPlantData.variedad.trim(),
      imagen_url: !newPlantData.imagen_url,
      tipo_planta: !newPlantData.tipo_planta,
      tipo_planta_otro: newPlantData.tipo_planta === 'Otro' && !newPlantData.tipo_planta_otro.trim(),
      nombre_comun_principal: !newPlantData.nombre_comun_principal.trim(),
    };

    setNewPlantErrors(errors);

    if (Object.values(errors).some(error => error)) {
      return;
    }

    setSubmittingNewPlant(true);

    try {
      // Determinar el valor final de tipo_planta
      const tipoPlantaFinal = newPlantData.tipo_planta === 'Otro' 
        ? newPlantData.tipo_planta_otro.trim() 
        : newPlantData.tipo_planta;

      const plantaData: any = {
        especie: newPlantData.especie.trim(),
        nombre_cientifico: newPlantData.nombre_cientifico.trim(),
        variedad: newPlantData.variedad.trim(),
        tipo_planta: tipoPlantaFinal,
        nombre_comun_principal: newPlantData.nombre_comun_principal.trim(),
        imagen_url: newPlantData.imagen_url,
        nombres_comunes: newPlantData.nombres_comunes.trim() || undefined,
        notas: newPlantData.notas.trim() || undefined,
      };

      console.log('📤 Creando nueva planta:', plantaData);
      const response = await RecoleccionService.createPlanta(plantaData);
      
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
          tipo_planta: '',
          tipo_planta_otro: '',
          nombre_comun_principal: '',
          nombres_comunes: '',
          imagen_url: '',
          notas: '',
        });
        setNewPlantImagePreview('');
        setNewPlantErrors({
          especie: false,
          nombre_cientifico: false,
          variedad: false,
          imagen_url: false,
          tipo_planta: false,
          tipo_planta_otro: false,
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
    } catch (error: any) {
      console.error('❌ Error al crear planta:', error);
      
      // Manejar error de planta duplicada (409)
      if (error.response?.status === 409) {
        alert(`Ya existe una planta con ese nombre científico y variedad.\n\nPor favor verifica si la planta ya está registrada o cambia la variedad.`);
      } else if (error.response?.status === 400) {
        alert('Error de validación. Por favor revisa los datos ingresados.');
      } else {
        alert('Error al crear la planta. Por favor, intenta de nuevo.');
      }
    } finally {
      setSubmittingNewPlant(false);
    }
  };

  const handleContinue = () => {
    const newErrors = {
      date: !date,
      quantity: parseFloat(quantity) <= 0,
      photos: placePhotos.length === 0 || totalPhotos.length === 0,
      method: !method,
    }

    setErrors(newErrors)

    if (Object.values(newErrors).some(error => error)) {
      return
    }

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
      method,
      quantity,
      unit,
      notes,
      isNewFind,
      placePhotos,
      totalPhotos,
      planta_id,
      nombre_cientifico: nombre_cientifico || species,
      nombre_comercial: nombre_comercial || species,
    })
    
    console.log('📤 Datos guardados en formulario:', {
      planta_id,
      nombre_cientifico,
      especie_nueva: isNewFind
    });
    
    navigate('/app/collections/new/location')
  }

  const hasMinimumPhotos = placePhotos.length >= 1 && totalPhotos.length >= 1;

  const openPhotoModal = (type: 'place' | 'total') => {
    setModalType(type);
    setShowPhotoModal(true);
  };

  const currentPhotos = modalType === 'place' ? placePhotos : totalPhotos;
  const modalTitle = modalType === 'place' ? 'Lugar' : 'Total recolectado';

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
              Nueva recolección
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Paso 1 de 3 ·{" "}
              <span className="text-slate-500">Datos generales</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-700">Fecha <span className="text-red-500">*</span></p>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setErrors(prev => ({ ...prev, date: false }));
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                errors.date
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                  : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
              }`}
            />
            {errors.date && (
              <p className="text-xs font-semibold text-red-500">* La fecha es obligatoria</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-base font-extrabold text-brand-700">
              Seleccionar tipo
            </p>
            <div className="flex gap-3">
              {[
                { label: "Semilla", value: "seed" as MaterialType },
                { label: "Esqueje", value: "cutting" as MaterialType },
              ].map((option) => {
                const isActive = type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeChange(option.value)}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-center text-base font-extrabold shadow-soft transition ${
                      isActive
                        ? "border-brand-500 bg-emerald-50 text-brand-600 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">
              Especie de la semilla:
            </p>
            {species ? (
              <div className="flex flex-1 items-center justify-between rounded-2xl border border-brand-400 bg-brand-50 px-4 py-3 shadow-soft">
                <span className="text-base font-semibold text-brand-700">
                  {species}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSpecies("");
                    setSelectedPlanta(null);
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

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">Cantidad <span className="text-red-500">*</span></p>
            <div className={`flex items-center gap-3 rounded-2xl border px-3 py-3 shadow-soft ${
              errors.quantity
                ? 'border-red-400 bg-red-50'
                : 'border-slate-200 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => changeQuantity(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
              >
                <Icon name="minus" className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  onBlur={() => {
                    // Al perder foco, si está vacío poner 0
                    if (quantity === "" || quantity === ".") {
                      setQuantity("0");
                    }
                  }}
                  className="w-20 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-center text-lg font-extrabold text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
                {type === "seed" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnit("kg")}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        unit === "kg"
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      Kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit("units")}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        unit === "units"
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      Unidades
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-bold text-white shadow-sm">
                    Unidades
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => changeQuantity(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
              >
                <Icon name="plus" className="h-5 w-5" />
              </button>
            </div>
            {errors.quantity && (
              <p className="text-xs font-semibold text-red-500">* La cantidad debe ser mayor a 0</p>
            )}
          </div>

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
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value);
                  setErrors(prev => ({ ...prev, method: false }));
                }}
                className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
              >
                <option value="">Seleccionar método</option>
                {methodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
              <Icon
                name="arrow-left"
                className="h-4 w-4 rotate-180 text-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => openPhotoModal('place')}
                className="relative z-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 overflow-hidden"
              >
                {placePhotos.length > 0 ? (
                  <div className="relative h-14 w-14">
                    {placePhotos.slice(0, 3).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Lugar ${index + 1}`}
                        className="absolute h-14 w-14 rounded-xl object-cover shadow-md"
                        style={{
                          top: `${index * 3}px`,
                          left: `${index * 3}px`,
                          opacity: 1 - (index * 0.15),
                          zIndex: 3 - index
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name="photo" className="h-6 w-6" />
                  </span>
                )}
                {placePhotos.length > 0 && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-md">
                    {placePhotos.length}
                  </span>
                )}
                <span className={placePhotos.length > 0 ? "text-brand-600 font-extrabold" : ""}>Lugar</span>
              </button>

              <button
                type="button"
                onClick={() => openPhotoModal('total')}
                className="relative z-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 overflow-hidden"
              >
                {totalPhotos.length > 0 ? (
                  <div className="relative h-14 w-14">
                    {totalPhotos.slice(0, 3).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Total ${index + 1}`}
                        className="absolute h-14 w-14 rounded-xl object-cover shadow-md"
                        style={{
                          top: `${index * 3}px`,
                          left: `${index * 3}px`,
                          opacity: 1 - (index * 0.15),
                          zIndex: 3 - index
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name="photo" className="h-6 w-6" />
                  </span>
                )}
                {totalPhotos.length > 0 && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-md">
                    {totalPhotos.length}
                  </span>
                )}
                <span className={totalPhotos.length > 0 ? "text-brand-600 font-extrabold" : ""}>Total recolectado</span>
              </button>
            </div>
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
              <h2 className="text-lg font-extrabold text-brand-700">
                Escoger una planta
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowSpeciesModal(false);
                  setSearchTerm("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
              <div className="relative">
                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSpeciesModal(false);
                  setSearchTerm("");
                  // Resetear el formulario de nueva planta antes de abrirlo
                  setNewPlantData({
                    especie: '',
                    nombre_cientifico: '',
                    variedad: '',
                    tipo_planta: '',
                    tipo_planta_otro: '',
                    nombre_comun_principal: '',
                    nombres_comunes: '',
                    imagen_url: '',
                    notas: '',
                  });
                  setNewPlantImagePreview('');
                  setNewPlantErrors({
                    especie: false,
                    nombre_cientifico: false,
                    variedad: false,
                    imagen_url: false,
                    tipo_planta: false,
                    tipo_planta_otro: false,
                    nombre_comun_principal: false,
                  });
                  setShowNewPlantForm(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 py-4 text-brand-600 transition hover:bg-brand-50 active:scale-[0.99]"
              >
                <Icon name="plus" className="h-5 w-5" />
                <span className="text-base font-extrabold">Añadir planta</span>
              </button>
              
              <div className="space-y-3">
                {filteredPlantas.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      No se encontraron plantas
                    </p>
                  </div>
                ) : (
                  filteredPlantas.map((planta) => (
                    <button
                      key={planta.id}
                      type="button"
                      onClick={() => {
                        const nombreEspecie = planta.especie || planta.nombre_cientifico;
                        setSpecies(nombreEspecie);
                        setSelectedPlanta(planta);
                        setShowSpeciesModal(false);
                        setSearchTerm("");
                        console.log('🌱 Planta seleccionada:', {
                          id: planta.id,
                          especie: planta.especie,
                          nombre_cientifico: planta.nombre_cientifico
                        });
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99]"
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {planta.imagen_url ? (
                          <img
                            src={planta.imagen_url}
                            alt={planta.especie || planta.nombre_cientifico}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon name="photo" className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-base font-extrabold text-brand-700">
                          {planta.especie || 'Sin nombre común'}
                        </p>
                        <p className="text-sm font-semibold text-slate-500">
                          {planta.nombre_cientifico}
                        </p>
                      </div>
                      {planta.tipo_planta && (
                        <div className="rounded-xl border border-brand-500 bg-brand-50 text-brand-600 px-3 py-1.5 text-xs font-bold">
                          {planta.tipo_planta}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="px-5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowSpeciesModal(false);
                  setSearchTerm("");
                }}
                className="w-full rounded-2xl bg-brand-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewPlantForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white pb-8 max-h-[90vh] flex flex-col">
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">
                Añadir nueva planta
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowNewPlantForm(false);
                  setNewPlantData({
                    especie: '',
                    nombre_cientifico: '',
                    variedad: '',
                    tipo_planta: '',
                    tipo_planta_otro: '',
                    nombre_comun_principal: '',
                    nombres_comunes: '',
                    imagen_url: '',
                    notas: '',
                  });
                  setNewPlantImagePreview('');
                  setNewPlantErrors({
                    especie: false,
                    nombre_cientifico: false,
                    variedad: false,
                    imagen_url: false,
                    tipo_planta: false,
                    tipo_planta_otro: false,
                    nombre_comun_principal: false,
                  });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                disabled={submittingNewPlant}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
              {/* Imagen de la planta */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Imagen de la planta <span className="text-red-500">*</span>
                </p>
                <label className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 cursor-pointer transition hover:border-brand-300 hover:bg-brand-50 ${
                  newPlantErrors.imagen_url
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-white'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleNewPlantImageUpload(e);
                      setNewPlantErrors(prev => ({ ...prev, imagen_url: false }));
                    }}
                    className="hidden"
                    disabled={submittingNewPlant}
                  />
                  {newPlantImagePreview ? (
                    <img
                      src={newPlantImagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-xl object-cover shadow-md"
                    />
                  ) : (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50">
                        <Icon name="photo" className="h-10 w-10 text-brand-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500 text-center">
                        Toca para agregar imagen
                      </p>
                    </>
                  )}
                </label>
                {newPlantErrors.imagen_url && (
                  <p className="text-xs font-semibold text-red-500">* La imagen de la planta es obligatoria</p>
                )}
              </div>

              {/* Especie */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Especie <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={newPlantData.especie}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, especie: e.target.value }));
                    setNewPlantErrors(prev => ({ ...prev, especie: false }));
                  }}
                  placeholder="Ej: Caoba, Roble, Pino"
                  className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                    newPlantErrors.especie
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Grupo biológico al que pertenece la planta
                </p>
                {newPlantErrors.especie && (
                  <p className="text-xs font-semibold text-red-500">* La especie es obligatoria</p>
                )}
              </div>

              {/* Nombre científico */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Nombre científico <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={newPlantData.nombre_cientifico}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, nombre_cientifico: e.target.value }));
                    setNewPlantErrors(prev => ({ ...prev, nombre_cientifico: false }));
                  }}
                  placeholder="Ej: Swietenia macrophylla"
                  className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                    newPlantErrors.nombre_cientifico
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Nombre único en nomenclatura binomial
                </p>
                {newPlantErrors.nombre_cientifico && (
                  <p className="text-xs font-semibold text-red-500">* El nombre científico es obligatorio</p>
                )}
              </div>

              {/* Variedad */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Variedad <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={newPlantData.variedad}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, variedad: e.target.value }));
                    setNewPlantErrors(prev => ({ ...prev, variedad: false }));
                  }}
                  placeholder="Ej: Hondureña, Común, Nativa"
                  className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                    newPlantErrors.variedad
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Variedad específica de la planta
                </p>
                {newPlantErrors.variedad && (
                  <p className="text-xs font-semibold text-red-500">* La variedad es obligatoria</p>
                )}
              </div>

              {/* Tipo de planta */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Tipo de planta <span className="text-red-500">*</span>
                </p>
                <div className={`flex items-center rounded-2xl border px-4 shadow-soft ${
                  newPlantErrors.tipo_planta
                    ? 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200'
                }`}>
                  <select
                    value={newPlantData.tipo_planta}
                    onChange={(e) => {
                      setNewPlantData(prev => ({ ...prev, tipo_planta: e.target.value, tipo_planta_otro: '' }));
                      setNewPlantErrors(prev => ({ ...prev, tipo_planta: false, tipo_planta_otro: false }));
                    }}
                    className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
                    disabled={submittingNewPlant}
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="Árbol">Árbol</option>
                    <option value="Arbusto">Arbusto</option>
                    <option value="Hierba">Hierba</option>
                    <option value="Palma">Palma</option>
                    <option value="Enredadera">Enredadera</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Clasificación morfológica de la planta
                </p>
                {newPlantErrors.tipo_planta && (
                  <p className="text-xs font-semibold text-red-500">* Debes seleccionar el tipo de planta</p>
                )}
              </div>

              {/* Especificar tipo (si es Otro) */}
              {newPlantData.tipo_planta === 'Otro' && (
                <div className="space-y-2">
                  <p className="text-base font-extrabold text-brand-700">
                    Especificar tipo <span className="text-red-500">*</span>
                  </p>
                  <input
                    type="text"
                    value={newPlantData.tipo_planta_otro}
                    onChange={(e) => {
                      setNewPlantData(prev => ({ ...prev, tipo_planta_otro: e.target.value }));
                      setNewPlantErrors(prev => ({ ...prev, tipo_planta_otro: false }));
                    }}
                    placeholder="Especifica el tipo de planta"
                    className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      newPlantErrors.tipo_planta_otro
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                    disabled={submittingNewPlant}
                  />
                  {newPlantErrors.tipo_planta_otro && (
                    <p className="text-xs font-semibold text-red-500">* Debes especificar el tipo de planta</p>
                  )}
                </div>
              )}

              {/* Nombre más común */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Nombre más común <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={newPlantData.nombre_comun_principal}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, nombre_comun_principal: e.target.value }));
                    setNewPlantErrors(prev => ({ ...prev, nombre_comun_principal: false }));
                  }}
                  placeholder="Ej: Caoba"
                  className={`w-full rounded-2xl border px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                    newPlantErrors.nombre_comun_principal
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                  }`}
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  El nombre común más reconocido en la región
                </p>
                {newPlantErrors.nombre_comun_principal && (
                  <p className="text-xs font-semibold text-red-500">* El nombre más común es obligatorio</p>
                )}
              </div>

              {/* Nombres comunes */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Nombres comunes <span className="text-slate-400 font-semibold">(Opcional)</span>
                </p>
                <textarea
                  value={newPlantData.nombres_comunes}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, nombres_comunes: e.target.value }));
                  }}
                  placeholder="Ej: Caoba, Aguano, Zopilote"
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 focus:border-brand-400 focus:ring-brand-200"
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Otros nombres comunes · Separa múltiples nombres con comas
                </p>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <p className="text-base font-extrabold text-brand-700">
                  Notas <span className="text-slate-400 font-semibold">(Opcional)</span>
                </p>
                <textarea
                  value={newPlantData.notas}
                  onChange={(e) => {
                    setNewPlantData(prev => ({ ...prev, notas: e.target.value }));
                  }}
                  placeholder="Ej: Especie de crecimiento lento, requiere suelos bien drenados"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 focus:border-brand-400 focus:ring-brand-200"
                  disabled={submittingNewPlant}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Información adicional sobre manejo, recolección o características especiales
                </p>
              </div>
            </div>

            <div className="px-5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCreateNewPlant}
                disabled={submittingNewPlant}
                className="w-full rounded-2xl bg-brand-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingNewPlant ? 'Creando planta...' : 'Crear planta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white pb-8">
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">
                Fotos de {modalTitle}
              </h2>
              {currentPhotos.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="px-5 py-4">
              {currentPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-1">
                  <label className="mb-4 flex h-32 w-32 cursor-pointer items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-400 hover:bg-brand-50 active:scale-95">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handlePhotoUpload(modalType, e);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <Icon name="photo" className="h-12 w-12 text-slate-400" />
                  </label>
                  <p className="text-center text-sm font-semibold text-slate-500">
                    No hay fotos aún
                  </p>
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Toca el ícono de imagen para agregar
                  </p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  <label className="relative flex h-40 w-40 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-brand-400 hover:bg-brand-50 active:scale-95">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handlePhotoUpload(modalType, e);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <Icon name="plus" className="h-8 w-8 text-slate-400" />
                  </label>
                  {currentPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0"
                    >
                      <img
                        src={photo}
                        alt={`${modalTitle} ${index + 1}`}
                        className="h-40 w-40 rounded-2xl object-cover shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(modalType, index)}
                        className="absolute -right-2 -top-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                  
                </div>
              )}
            </div>

            <div className="px-5">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                disabled={currentPhotos.length === 0}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                <span>Continuar</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}

export default NewCollectionForm;
