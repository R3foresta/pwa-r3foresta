import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024

type Props = {
  /** URL existente de la imagen (modo edición). */
  initialUrl?: string | null
  maxBytes?: number
  disabled?: boolean
  onChange: (file: File | null) => void
  onError?: (message: string | null) => void
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}

function ImageUploader({
  initialUrl,
  maxBytes = DEFAULT_MAX_BYTES,
  disabled = false,
  onChange,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const preview = objectUrl ?? initialUrl ?? null

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  const reportError = (message: string | null) => {
    setLocalError(message)
    onError?.(message)
  }

  const handleFile = (file: File | null) => {
    if (!file) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
      onChange(null)
      reportError(null)
      return
    }

    if (!ACCEPTED_MIME.includes(file.type)) {
      reportError('Formato no soportado. Usa PNG, JPG o WEBP.')
      return
    }

    if (file.size > maxBytes) {
      reportError(`La imagen supera ${formatMB(maxBytes)} MB.`)
      return
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl)
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    onChange(file)
    reportError(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center gap-3">
        <div className="h-36 w-36 overflow-hidden rounded-3xl bg-brand-50 ring-1 ring-brand-100">
          {preview ? (
            <img src={preview} alt="Vista previa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="photo" className="h-10 w-10 text-brand-300" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {preview && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ''
                handleFile(null)
              }}
              className="rounded-xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Quitar
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(',')}
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {localError && (
        <p className="text-center text-xs font-semibold text-red-600">{localError}</p>
      )}
      <p className="text-center text-[11px] font-medium text-brand-400">
        PNG, JPG o WEBP · máximo {formatMB(maxBytes)} MB
      </p>
    </div>
  )
}

export default ImageUploader
