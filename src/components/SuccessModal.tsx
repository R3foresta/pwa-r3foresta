import { useEffect, useId, useRef } from 'react'

type Props = {
  onPrimaryAction: () => void
  onSecondaryAction?: () => void
  summaryText?: string
  title?: string
  description?: string
  primaryLabel?: string
  secondaryLabel?: string
  loading?: boolean
  errorMessage?: string | null
}

/** Confirmación visual compartida para operaciones persistidas. */
export default function SuccessModal({
  onPrimaryAction,
  onSecondaryAction,
  summaryText,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  loading = false,
  errorMessage,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    primaryRef.current?.focus()
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      if (buttons.length === 0) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', trapFocus)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex flex-col items-center space-y-6">
        <h2 id={titleId} className="text-center text-2xl font-extrabold text-neutral-800">{title ?? 'Operación completada'}</h2>
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-success-100" aria-hidden="true">
          <svg className="h-20 w-20 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          {description && <p id={descriptionId} className="text-sm font-semibold text-neutral-600">{description}</p>}
          <p className="mt-1 text-lg font-extrabold text-neutral-800">{summaryText ?? 'Registro actualizado'}</p>
        </div>
        {errorMessage && <p role="alert" className="text-center text-sm font-semibold text-danger-700">{errorMessage}</p>}
        <div className="w-full space-y-3">
          <button ref={primaryRef} type="button" onClick={onPrimaryAction} disabled={loading} className="w-full rounded-2xl bg-brand-500 py-4 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50">
            {primaryLabel ?? 'Volver al listado'}
          </button>
          {onSecondaryAction && <button type="button" onClick={onSecondaryAction} disabled={loading} className="w-full rounded-2xl border-2 border-neutral-300 bg-white py-4 text-center text-base font-extrabold text-neutral-700 shadow-soft transition hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-50">
            {secondaryLabel ?? 'Registrar otra'}
          </button>}
        </div>
      </div>
    </div>
  </div>
}
