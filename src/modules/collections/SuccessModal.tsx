type Props = {
  onViewBlockchain: () => void;
  onBackToMenu: () => void;
  summaryText?: string;
};

function SuccessModal({ onViewBlockchain, onBackToMenu, summaryText }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          {/* Título */}
          <h2 className="text-center text-2xl font-extrabold text-slate-800">
            Registro Exitoso
          </h2>

          {/* Icono de éxito */}
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-20 w-20 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Mensaje */}
          <div className="text-center">
            <p className="text-base font-semibold text-slate-700">
              Se recolecto:
            </p>
            <p className="mt-1 text-lg font-extrabold text-slate-800">
              {summaryText ?? 'Registro listo para subir'}
            </p>
          </div>

          {/* Botones */}
          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={onViewBlockchain}
              className="w-full rounded-2xl bg-brand-500 py-4 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
            >
              Ver registro en cadena de bloques
            </button>
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-full rounded-2xl border-2 border-slate-300 bg-white py-4 text-center text-base font-extrabold text-slate-700 shadow-soft transition hover:bg-slate-50 active:scale-[0.99]"
            >
              Volver al menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;
