import { useEffect } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

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
  /** Mensaje de error mostrado como banner rojo bajo la descripción. */
  errorMessage?: string | null
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
  errorMessage,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'
  const confirmClasses = isDanger
    ? 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700'
    : 'bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
        {iconName && (
          <div
            className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${
              isDanger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
            }`}
          >
            <Icon name={iconName} className="h-5 w-5" />
          </div>
        )}
        <h2
          id="confirm-dialog-title"
          className="text-base font-extrabold text-brand-700"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm font-semibold text-brand-500">{description}</p>
        )}
        {errorMessage && (
          <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-700 ring-1 ring-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex h-11 items-center justify-center rounded-2xl text-sm font-extrabold shadow-soft transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClasses}`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
