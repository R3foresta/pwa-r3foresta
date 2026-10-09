import { useEffect, useId, useRef, type ReactNode } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'
import { Button } from './ui'

type Variant = 'default' | 'danger'

type Props = {
  open: boolean
  title: string
  description?: string
  /** Texto del botón primario. */
  confirmLabel: string
  /** Texto del botón secundario. Si se omite, no se muestra el botón. */
  cancelLabel?: string
  variant?: Variant
  /** Ícono decorativo opcional en la cabecera del dialog. */
  iconName?: IconName
  loading?: boolean
  /** Bloquea la confirmación sin impedir cancelar ni mostrar estado de envío. */
  confirmDisabled?: boolean
  /** Mensaje de error mostrado como banner rojo bajo la descripción. */
  errorMessage?: string | null
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'default',
  iconName,
  loading = false,
  confirmDisabled = false,
  errorMessage,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>('[data-confirm-cancel]:not(:disabled)')
    ;(initialFocus ?? dialogRef.current)?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault()
        onCancel()
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.closest('[hidden], [aria-hidden="true"]'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialog.focus()
      } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center"
    >
      <div className="max-h-[calc(100dvh-3rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        {iconName && (
          <div
            className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${
              isDanger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600'
            }`}
          >
            <Icon name={iconName} className="h-5 w-5" />
          </div>
        )}
        <h2
          id={titleId}
          className="text-base font-extrabold text-brand-700"
        >
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-1 text-sm font-semibold text-brand-500">{description}</p>
        )}
        {children}
        {errorMessage && (
          <div className="mt-3 rounded-2xl bg-danger-50 px-3 py-2 text-[12.5px] font-semibold text-danger-700 ring-1 ring-danger-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </Button>
          {cancelLabel && (
            <Button data-confirm-cancel variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
