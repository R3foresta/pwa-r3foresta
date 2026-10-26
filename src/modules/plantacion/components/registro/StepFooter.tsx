type Props = {
  label: string
  onClick: () => void
  disabled?: boolean
  hint?: string | null
  tone?: 'brand' | 'success'
}

/**
 * Acción del registro inicial, cuya navegación inferior está oculta.
 * Se mantiene junto al borde inferior respetando el área segura del dispositivo.
 */
function StepFooter({ label, onClick, disabled = false, hint, tone = 'brand' }: Props) {
  const toneClass =
    tone === 'success'
      ? 'bg-success-600 hover:bg-success-700'
      : 'bg-brand-500 hover:bg-brand-600'

  return (
    <div className="sticky bottom-0 z-30 -mx-5 bg-gradient-to-t from-brand-50 via-brand-50/95 to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
      {/* CTA de paso themeable (brand|success). `success` no es variante de <Button>
          y el verde de acción se preserva por paridad → se mantiene nativo. (gotcha §6.6) */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full rounded-2xl py-4 text-center text-base font-extrabold text-white shadow-soft transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ${toneClass}`}
      >
        {label}
      </button>
      {hint && (
        <p className="mt-2 text-center text-xs font-medium text-neutral-600">
          {hint}
        </p>
      )}
    </div>
  )
}

export default StepFooter
