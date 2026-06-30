import Icon from '../../../components/Icon'

type Props = {
  phase: 'saving' | 'success'
  nombre: string
  onContinue: () => void
}

function SubcampaniaSuccessOverlay({ phase, nombre, onContinue }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-brand-700/95 px-8 text-center backdrop-blur-sm">
      {phase === 'saving' ? (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
            <svg
              className="h-10 w-10 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-80"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-white/70">
            Guardando subcampaña
          </p>
          <p className="mt-2 text-xl font-extrabold text-white">Guardando...</p>
        </>
      ) : (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/20 ring-2 ring-emerald-300/40">
            <Icon name="check" className="h-10 w-10 text-emerald-300" />
          </div>
          <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-white/70">
            Subcampaña en borrador
          </p>
          <p className="mt-2 text-xl font-extrabold text-white">
            Subcampaña guardada correctamente
          </p>
          <p className="mt-1.5 text-sm font-semibold text-white/80">{nombre}</p>
          <p className="mt-4 max-w-xs text-sm font-semibold leading-relaxed text-white/75">
            La subcampaña fue guardada como borrador. Podrás completarla y activarla cuando tenga las asignaciones necesarias.
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-extrabold text-brand-800 shadow-soft transition hover:bg-brand-50 active:scale-[0.98]"
          >
            <Icon name="leaf" className="h-4 w-4" />
            Ir al detalle
          </button>
        </>
      )}
    </div>
  )
}

export default SubcampaniaSuccessOverlay
