import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import { useViveros } from "../../hooks/useViveros";
import { useCollectionForm } from "./CollectionFormContext";

function LocationForm() {
  const navigate = useNavigate();
  const { formData, updateForm } = useCollectionForm();
  const { viveros, loading: viveroLoading, error: viveroError } = useViveros();
  const [direccion, setDireccion] = useState(formData?.direccion || "");
  const [latitud, setLatitud] = useState(formData?.latitud || "");
  const [longitud, setLongitud] = useState(formData?.longitud || "");
  const [pais, setPais] = useState(formData?.pais || "Bolivia");
  const [depto, setDepto] = useState(formData?.depto || "La Paz");
  const [provincia, setProvincia] = useState(formData?.provincia || "Bolivia");
  const [comunidad, setComunidad] = useState(formData?.comunidad || "La Paz");
  const [selectedViveroId, setSelectedViveroId] = useState<number | null>(
    formData?.vivero_id ?? null
  );
  const hasSyncedVivero = useRef(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [errors, setErrors] = useState({
    direccion: false,
    coordinates: false,
    vivero: false,
  });

  const getLocation = () => {
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu navegador');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        
        setLatitud(lat);
        setLongitud(lng);
        setErrors((prev) => ({ ...prev, direccion: false, coordinates: false }));

        // Obtener dirección usando Nominatim (OpenStreetMap)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
          );
          const data = await response.json();
          
          if (data.address) {
            // Construir solo la dirección de calle/camino
            const addressParts = [];
            if (data.address.road) addressParts.push(data.address.road);
            if (data.address.house_number) addressParts.push(data.address.house_number);
            if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);
            if (data.address.suburb) addressParts.push(data.address.suburb);
            
            const streetAddress = addressParts.length > 0 
              ? addressParts.join(', ') 
              : data.display_name.split(',')[0];
            
            setDireccion(streetAddress);
          }
        } catch (error) {
          console.error('Error al obtener la dirección:', error);
        }
        
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Error al obtener ubicación:', error);
        alert('No se pudo obtener tu ubicación. Verifica los permisos.');
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Obtener ubicación automáticamente al cargar el componente
  useEffect(() => {
    // Solo obtener ubicación si los campos están vacíos
    if (!direccion && !latitud && !longitud) {
      // Usar setTimeout para evitar llamadas síncronas de setState en el effect
      const timer = setTimeout(() => {
        getLocation();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, []); // Se ejecuta solo una vez al montar el componente

  useEffect(() => {
    if (hasSyncedVivero.current || viveros.length === 0) {
      return;
    }

    if (selectedViveroId !== null) {
      hasSyncedVivero.current = true;
      return;
    }

    if (formData?.almacenamiento) {
      const match = viveros.find((vivero) => vivero.nombre === formData.almacenamiento);
      if (match) {
        setSelectedViveroId(match.id);
      }
    }

    hasSyncedVivero.current = true;
  }, [formData?.almacenamiento, selectedViveroId, viveros]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-40 bg-white/10 backdrop-blur-md flex items-center justify-center pb-4 pt-6 shadow-sm border-b border-slate-200/50">
          <button
            type="button"
            aria-label="Volver"
            onClick={() => navigate('/app/collections/new')}
            className="absolute left-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-700">
              Recoleccion
            </h1>
            <p className="text-sm font-semibold text-brand-500">
              Paso 2 de 3 ·{" "}
              <span className="text-slate-500">Ubicación y almacén</span>
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 px-5 pb-7">
          <div>
            <h2 className="text-lg font-extrabold text-brand-700 mb-3">
              Registrar ubicación
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Dirección <span className="text-red-500">*</span></p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={direccion}
                    onChange={(event) => {
                      setDireccion(event.target.value);
                      if (event.target.value.trim()) {
                        setErrors(prev => ({ ...prev, direccion: false }));
                      }
                    }}
                    placeholder="Municipio Yanacachi, Provincia Sud Yun..."
                    className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.direccion
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={loadingLocation}
                    className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 shadow-soft transition hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingLocation ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Icon name="pin" className="h-4 w-4" />
                        <span>Map</span>
                      </span>
                    )}
                  </button>
                </div>
                {errors.direccion && (
                  <p className="text-xs font-semibold text-red-500">
                    * La dirección es obligatoria. Usa el botón "Map" para obtenerla automáticamente o ingrésala manualmente.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Latitud <span className="text-red-500">*</span></p>
                  <input
                    type="text"
                    value={latitud}
                    onChange={(event) => {
                      setLatitud(event.target.value);
                      if (event.target.value.trim() && longitud.trim()) {
                        setErrors(prev => ({ ...prev, coordinates: false }));
                      }
                    }}
                    placeholder="-16.500000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Longitud <span className="text-red-500">*</span></p>
                  <input
                    type="text"
                    value={longitud}
                    onChange={(event) => {
                      setLongitud(event.target.value);
                      if (event.target.value.trim() && latitud.trim()) {
                        setErrors(prev => ({ ...prev, coordinates: false }));
                      }
                    }}
                    placeholder="-68.150000"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:ring-2 ${
                      errors.coordinates
                        ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-200'
                        : 'border-slate-200 bg-white focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  />
                </div>
              </div>
              {errors.coordinates && (
                <p className="text-xs font-semibold text-red-500">
                  * Las coordenadas (latitud y longitud) son obligatorias. Usa el botón "Map" para obtenerlas automáticamente o ingrésalas manualmente.
                </p>
              )}

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">País:</p>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <select
                      value={pais}
                      onChange={(event) => setPais(event.target.value)}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="Bolivia">Bolivia</option>
                      <option value="Perú">Perú</option>
                      <option value="Chile">Chile</option>
                    </select>
                    <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Depto:</p>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <select
                      value={depto}
                      onChange={(event) => setDepto(event.target.value)}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="La Paz">La Paz</option>
                      <option value="Santa Cruz">Santa Cruz</option>
                      <option value="Cochabamba">Cochabamba</option>
                    </select>
                    <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Provincia:</p>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <select
                      value={provincia}
                      onChange={(event) => setProvincia(event.target.value)}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="Bolivia">Bolivia</option>
                      <option value="Murillo">Murillo</option>
                      <option value="Omasuyos">Omasuyos</option>
                    </select>
                    <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Comunidad:</p>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                    <select
                      value={comunidad}
                      onChange={(event) => setComunidad(event.target.value)}
                      className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                    >
                      <option value="La Paz">La Paz</option>
                      <option value="El Alto">El Alto</option>
                      <option value="Achocalla">Achocalla</option>
                    </select>
                    <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-700">Alamacenamiento:</p>
                {viveroLoading ? (
                  <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 shadow-soft">
                    Cargando viveros...
                  </div>
                ) : (
                  <>
                    <div className={`flex items-center rounded-2xl border px-4 shadow-soft focus-within:ring-2 ${
                      errors.vivero
                        ? 'border-red-400 bg-red-50 focus-within:border-red-400 focus-within:ring-red-200'
                        : 'border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-brand-200'
                    }`}>
                      <select
                        value={selectedViveroId ?? ""}
                        onChange={(event) => {
                          const nextId = event.target.value
                            ? Number(event.target.value)
                            : null;
                          setSelectedViveroId(nextId);
                          if (nextId !== null) {
                            setErrors((prev) => ({ ...prev, vivero: false }));
                          }
                        }}
                        className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                      >
                        <option value="">Selecciona un vivero</option>
                        {viveros.map((vivero) => (
                          <option key={vivero.id} value={vivero.id}>
                            {vivero.nombre} ({vivero.codigo})
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                    </div>
                    {viveroError && (
                      <p className="text-xs font-semibold text-red-500">{viveroError}</p>
                    )}
                    {errors.vivero && (
                      <p className="text-xs font-semibold text-red-500">
                        * El vivero (almacenamiento) es obligatorio. Selecciona uno para continuar.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const newErrors = {
                direccion: !direccion.trim(),
                coordinates: !latitud.trim() || !longitud.trim(),
                vivero: selectedViveroId === null,
              };
              
              setErrors(newErrors);
              
              if (Object.values(newErrors).some(error => error)) {
                return;
              }

              const selectedVivero = viveros.find((vivero) => vivero.id === selectedViveroId);
              const almacenamientoValue = selectedVivero?.nombre ?? formData.almacenamiento;
              const viveroIdValue = selectedVivero?.id ?? formData.vivero_id;

              updateForm({
                direccion,
                latitud,
                longitud,
                pais,
                depto,
                provincia,
                comunidad,
                almacenamiento: almacenamientoValue,
                vivero_id: viveroIdValue,
              });
              navigate('/app/collections/new/summary');
            }}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationForm;
