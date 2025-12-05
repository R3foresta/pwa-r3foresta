import { useState } from "react";
import Icon from "../../components/Icon";
import { methodOptions, speciesOptions } from "./data";
import type { CollectionType } from "./types";

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

function NewCollectionForm({ onBack, onContinue }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<CollectionType>("Semilla");
  const [species, setSpecies] = useState("");
  const [customSpecies, setCustomSpecies] = useState("");
  const [showCustomSpecies, setShowCustomSpecies] = useState(false);
  const [method, setMethod] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState<"Kg" | "Unidades" | "gr">("Kg");
  const [notes, setNotes] = useState("");
  const [isNewFind, setIsNewFind] = useState(false);

  // Cambiar unidad automáticamente cuando cambia el tipo
  const handleTypeChange = (newType: CollectionType) => {
    setType(newType);
    if (newType === "Esqueje") {
      setUnit("Unidades");
    } else {
      // Si cambia a Semilla y está en Unidades, cambiar a Kg
      if (unit === "Unidades") {
        setUnit("Kg");
      }
    }
  };
  const [placePhotos, setPlacePhotos] = useState<string[]>([]);
  const [totalPhotos, setTotalPhotos] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalType, setModalType] = useState<'place' | 'total'>('place');

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
            setPlacePhotos(prev => [...prev, result]);
          } else {
            setTotalPhotos(prev => [...prev, result]);
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
    if (placePhotos.length === 0 || totalPhotos.length === 0) {
      alert('Debes subir al menos una foto de Lugar y una de Total recolectado para continuar');
      return;
    }
    onContinue();
  };

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
            onClick={onBack}
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
            <p className="text-sm font-semibold text-brand-700">Fecha</p>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="space-y-3">
            <p className="text-base font-extrabold text-brand-700">
              Seleccionar tipo
            </p>
            <div className="flex gap-3">
              {[
                { label: "Semilla", value: "Semilla" as CollectionType },
                { label: "Esqueje", value: "Esqueje" as CollectionType },
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
            <p className="text-base font-extrabold text-brand-700">Cantidad</p>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-soft">
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
                {type === "Semilla" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnit("Kg")}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        unit === "Kg"
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      Kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnit("gr")}
                      className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        unit === "gr"
                          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      gr
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
          </div>

          <div className="space-y-2">
            <p className="text-base font-extrabold text-brand-700">
              Seleccionar método
            </p>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-brand-700">
                Evidencia fotográfica
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
                className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 overflow-hidden"
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
                className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-semibold text-slate-600 shadow-soft transition hover:border-brand-300 hover:bg-brand-50 overflow-hidden"
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
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasMinimumPhotos}
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
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-700"
              >
                ×
              </button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
              {currentPhotos.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-slate-500">
                  No hay fotos aún
                </p>
              ) : (
                currentPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                  >
                    <img
                      src={photo}
                      alt={`${modalTitle} ${index + 1}`}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">
                        Foto {index + 1}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(modalType, index)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white transition hover:bg-red-600"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5">
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600">
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
                <Icon name="photo" className="h-5 w-5" />
                <span>Agregar foto</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewCollectionForm;
