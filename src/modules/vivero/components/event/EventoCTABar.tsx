import Icon from '../../../../components/Icon'

type Variant = 'emerald' | 'red' | 'brand'

type Props = {
  label: string
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
  hint?: string
  variant?: Variant
  formId?: string
  onClick?: () => void
}

const VARIANT_CLASS: Record<Variant, string> = {
  emerald: 'bg-success-600 hover:bg-success-700',
  red: 'bg-danger-600 hover:bg-danger-700',
  brand: 'bg-brand-700 hover:bg-brand-600',
}

function EventoCTABar({
  label,
  loading = false,
  loadingLabel,
  disabled = false,
  hint,
  variant = 'emerald',
  formId,
  onClick,
}: Props) {
  const isDisabled = disabled || loading
  const colorClass = isDisabled
    ? 'cursor-not-allowed bg-brand-200 text-white/90'
    : VARIANT_CLASS[variant]
  const finalLabel = loading && loadingLabel ? loadingLabel : label

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[112px] z-40 px-5">
      <div className="pointer-events-auto mx-auto w-full max-w-md space-y-2 rounded-3xl bg-white/95 px-4 py-3 shadow-soft ring-1 ring-black/5 backdrop-blur">
        <button
          type={formId ? 'submit' : 'button'}
          form={formId}
          onClick={onClick}
          aria-disabled={isDisabled}
          disabled={isDisabled}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-extrabold text-white shadow-soft transition ${colorClass}`}
        >
          {loading ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
          ) : (
            <Icon name="check" className="h-4 w-4" />
          )}
          <span>{finalLabel}</span>
        </button>
        {!loading && hint && (
          <p className="text-center text-[11px] font-semibold text-brand-500">{hint}</p>
        )}
      </div>
    </div>
  )
}

export default EventoCTABar
