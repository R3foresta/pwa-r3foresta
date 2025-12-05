import { useState } from "react";
import Icon from "../../components/Icon";

type Props = {
  onBack: () => void;
  onContinue: () => void;
};

function LocationForm({ onBack, onContinue }: Props) {
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");
  const [pais, setPais] = useState("Bolivia");
  const [depto, setDepto] = useState("La Paz");
  const [provincia, setProvincia] = useState("Bolivia");
  const [comunidad, setComunidad] = useState("La Paz");
  const [almacenamiento, setAlmacenamiento] = useState("Vivero Mallasa");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f7f3] to-[#eef1eb] text-brand-700">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex items-center justify-center pb-4 pt-6 shadow-sm border-b border-slate-200/50">
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
                <p className="text-sm font-semibold text-brand-700">Dirección</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={direccion}
                    onChange={(event) => setDireccion(event.target.value)}
                    placeholder="Municipio Yanacachi, Provincia Sud Yun..."
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  />
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-soft transition hover:bg-slate-50"
                  >
                    Map
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Latitud:</p>
                  <input
                    type="text"
                    value={latitud}
                    onChange={(event) => setLatitud(event.target.value)}
                    placeholder="-16.433"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-brand-700">Longitud:</p>
                  <input
                    type="text"
                    value={longitud}
                    onChange={(event) => setLongitud(event.target.value)}
                    placeholder="-67.136"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>

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
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
                  <select
                    value={almacenamiento}
                    onChange={(event) => setAlmacenamiento(event.target.value)}
                    className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="Vivero Mallasa">Vivero Mallasa</option>
                    <option value="Vivero Central">Vivero Central</option>
                    <option value="Vivero Norte">Vivero Norte</option>
                  </select>
                  <Icon name="chevron-down" className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mb-8 w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
          >
            Subir registro a Blockchain
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationForm;
