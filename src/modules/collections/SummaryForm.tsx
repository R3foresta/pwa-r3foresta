import { useState } from "react";
import Icon from "../../components/Icon";
import SuccessModal from "./SuccessModal";

type Props = {
  onBack: () => void;
  onConfirm: () => void;
};

function SummaryForm({ onBack, onConfirm }: Props) {
  const [showSuccess, setShowSuccess] = useState(false);
  // Aquí irían los datos del formulario que se pasarían como props
  // Por ahora uso datos de ejemplo
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <div className="flex rounded-b-3xl bg-[#0f8351] mb-3 px-5 pb-8 pt-10 text-white shadow-soft">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
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
                  <span className="font-bold text-slate-800">2025-04-15</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Recolector:</span>
                  <span className="font-bold text-slate-800">Juan Pérez</span>
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
                  <span className="font-bold text-slate-800">Semillas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Especie:</span>
                  <span className="font-bold text-slate-800">Pino ocarpa</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Cantidad:</span>
                  <span className="font-bold text-slate-800">2.5 kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Método:</span>
                  <span className="font-bold text-slate-800">Colecta manual</span>
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
              <p className="mb-3 text-xs font-semibold text-slate-600">Obligatorio: 2/2 fotos</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <img 
                    src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400" 
                    alt="Lugar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                  <img 
                    src="https://images.unsplash.com/photo-1569163139394-de4798aa62b0?w=400" 
                    alt="Mapa"
                    className="h-full w-full object-cover"
                  />
                </div>
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
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">País:</span>
                  <span className="font-bold text-slate-800">Bolivia</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Depto:</span>
                  <span className="font-bold text-slate-800">La Paz</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Provincia:</span>
                  <span className="font-bold text-slate-800">Nor Yungas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Comunidad:</span>
                  <span className="font-bold text-slate-800">Comunidad San Juan</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Coordenadas:</span>
                  <span className="font-bold text-slate-800">-16.489689, -68.119293</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Elevación:</span>
                  <span className="font-bold text-slate-800">3640m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Almacenamiento:</span>
                  <span className="font-bold text-slate-800">Vivero Mallasa</span>
                </div>
              </div>
            </div>

            {/* Código de Trazabilidad */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="scan" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Código de Trazabilidad
                </h3>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-800">REC-2025-014</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-400 underline"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Notas */}
            <div className="rounded-2xl bg-white px-4 py-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="info" className="h-5 w-5 text-brand-500" />
                <h3 className="text-base font-extrabold text-brand-700">
                  Notas
                </h3>
              </div>
              <p className="text-sm text-slate-700">
                Árboles sanos con buena producción. Colecta en horas matutinas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccess(true)}
              className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
            >
              Subir registro a Blockchain
            </button>
          </div>
        </div>
      </div>

      {showSuccess && (
        <SuccessModal
          onViewBlockchain={() => {
            // Aquí iría la lógica para ver el registro en blockchain
            setShowSuccess(false);
            onConfirm();
          }}
          onBackToMenu={() => {
            setShowSuccess(false);
            onConfirm();
          }}
        />
      )}
    </div>
  );
}

export default SummaryForm;
