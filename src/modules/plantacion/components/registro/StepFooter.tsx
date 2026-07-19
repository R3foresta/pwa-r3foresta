type Props = {
  label: string
  onClick: () => void
  disabled?: boolean
  hint?: string | null
  tone?: 'brand' | 'success'
}

/**
 * CTA sticky del paso actual. Queda visible por encima del contenido al
 * hacer scroll (desplazado para no chocar con el BottomNav fijo).
 */
function StepFooter({ label, onClick, disabled = false, hint, tone = 'brand' }: Props) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700'
      : 'bg-brand-500 hover:bg-brand-600'

  return (
    <div className="sticky bottom-24 z-30 -mx-5 bg-gradient-to-t from-[#eef1eb] via-[#eef1eb]/95 to-transparent px-5 pb-1 pt-5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full rounded-2xl py-4 text-center text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ${toneClass}`}
      >
        {label}
      </button>
      {hint && (
        <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}

export default StepFooter
