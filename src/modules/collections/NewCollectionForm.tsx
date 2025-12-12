import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import { methodOptions, speciesOptions } from "./data";
import type { MaterialType, Unit } from "./types";
import { useCollectionForm } from "./CollectionFormContext";

function NewCollectionForm() {
  const navigate = useNavigate();
  const { formData, updateForm } = useCollectionForm();
  const [date, setDate] = useState(() => formData?.date || new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<MaterialType>(formData?.type || "seed");
  const [species, setSpecies] = useState(formData?.species || "");
  const [customSpecies, setCustomSpecies] = useState("");
  const [showCustomSpecies, setShowCustomSpecies] = useState(false);
  const [method, setMethod] = useState(formData?.method || "");
  const [quantity, setQuantity] = useState(formData?.quantity || "0");
  const [unit, setUnit] = useState<Unit>(formData?.unit || "kg");
  const [notes, setNotes] = useState(formData?.notes || "");
  const [isNewFind, setIsNewFind] = useState(formData?.isNewFind || false);
  const [placePhotos, setPlacePhotos] = useState<string[]>(formData?.placePhotos || []);
  const [totalPhotos, setTotalPhotos] = useState<string[]>(formData?.totalPhotos || []);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalType, setModalType] = useState<'place' | 'total'>('place');
  const [errors, setErrors] = useState({
    date: false,
    quantity: false,
    photos: false,
    method: false,
  });

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
    })
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
              Especie de la semilla
            </p>
            {!showCustomSpecies ? (
              <div className="flex gap-2">
                {species ? (
                  <div className="flex flex-1 items-center justify-between rounded-2xl border border-brand-400 bg-brand-50 px-4 py-3 shadow-soft">
                    <span className="text-base font-semibold text-brand-700">
                      {species}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpecies("")}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-red-500"
                      title="Cambiar especie"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <select
                      value={species}
                      onChange={(event) => setSpecies(event.target.value)}
                      className="w-full bg-transparent py-3 text-base font-semibold text-slate-700 outline-none"
                    >
                      <option value="">Seleccionar especie</option>
                      {speciesOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCustomSpecies(true)}
                  className="flex h-[52px] w-12 items-center justify-center rounded-2xl border border-brand-300 bg-brand-50 text-brand-600 shadow-soft transition hover:bg-brand-100"
                  title="Agregar nueva especie"
                >
                  <Icon name="plus" className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSpecies}
                  onChange={(event) => setCustomSpecies(event.target.value)}
                  placeholder="Nueva especie..."
                  autoFocus
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customSpecies.trim()) {
                      setSpecies(customSpecies.trim());
                      setCustomSpecies("");
                      setShowCustomSpecies(false);
                    }
                  }}
                  disabled={!customSpecies.trim()}
                  className="flex h-[52px] w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Confirmar"
                >
                  <Icon name="check" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomSpecies(false);
                    setCustomSpecies("");
                  }}
                  className="flex h-[52px] w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:bg-slate-50"
                  title="Cancelar"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
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
              onChange={(event) => setIsNewFind(event.target.checked)}
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

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-md rounded-t-3xl bg-white pb-8">
            <div className="rounded-3xl sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <h2 className="text-lg font-extrabold text-brand-700">
                Fotos de {modalTitle}
              </h2>
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
    </div>
  );
}

export default NewCollectionForm;
