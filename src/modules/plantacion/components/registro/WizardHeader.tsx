import Icon from '../../../../components/Icon'

type Props = {
  paso: number
  totalPasos: number
  title: string
  onBack: () => void
  subcampaniaNombre: string
  subcampaniaDetalle?: string
}

/**
 * Hero header del wizard de registro de plantación: eyebrow con el paso
 * actual, título por paso, contexto de la subcampaña y barra de progreso
 * segmentada. Presentacional puro.
 */
function WizardHeader({
  paso,
  totalPasos,
  title,
  onBack,
  subcampaniaNombre,
  subcampaniaDetalle,
}: Props) {
  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-soft">
      <Icon
        name="trees"
        className="pointer-events-none absolute -bottom-8 -right-6 h-40 w-40 text-white/10"
      />

      <div className="relative px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
          >
            <Icon name="arrow-left" className="h-5 w-5" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold tracking-wide ring-1 ring-white/25">
            <Icon name="planting" className="h-3.5 w-3.5" />
            Paso {paso} de {totalPasos}
          </span>
        </div>

        <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/80">
          Plantación inicial
        </p>
        <h1 className="mt-0.5 text-[26px] font-extrabold leading-[1.1] tracking-tight">
          {title}
        </h1>

        <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
          <p className="truncate text-sm font-extrabold leading-tight">
            {subcampaniaNombre}
          </p>
          {subcampaniaDetalle && (
            <p className="truncate text-[11px] font-bold text-white/75">
              {subcampaniaDetalle}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: totalPasos }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i + 1 < paso
                  ? 'bg-emerald-300'
                  : i + 1 === paso
                    ? 'bg-white'
                    : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </header>
  )
}

export default WizardHeader
