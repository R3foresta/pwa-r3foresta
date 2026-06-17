import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import {
  IMAGE_UPLOAD_ACCEPT,
  getImageFileValidationError,
} from '../../utils/imageValidation'
import {
  compressNonEvidenceImageFile,
} from '../../utils/nonEvidenceImageCompression'

type Props = {
  /** URL existente de la imagen (modo edición). */
  initialUrl?: string | null
  disabled?: boolean
  onChange: (file: File | null) => void
  onError?: (message: string | null) => void
}

function ImageUploader({
  initialUrl,
  disabled = false,
  onChange,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)

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

  const handleFile = async (file: File | null) => {
    if (!file) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
      onChange(null)
      reportError(null)
      return
    }

    const validationError = getImageFileValidationError(file)
    if (validationError) {
      reportError(validationError)
      return
    }

    setCompressing(true)
    reportError(null)
    try {
      const compressed = await compressNonEvidenceImageFile(file)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      const url = URL.createObjectURL(compressed)
      setObjectUrl(url)
      onChange(compressed)
    } catch {
      reportError('No se pudo procesar la imagen. Intenta de nuevo.')
    } finally {
      setCompressing(false)
    }
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
            disabled={disabled || compressing}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {preview ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {preview && (
            <button
              type="button"
              disabled={disabled || compressing}
              onClick={() => {
                if (inputRef.current) inputRef.current.value = ''
                void handleFile(null)
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
          accept={IMAGE_UPLOAD_ACCEPT}
          onChange={(event) => { void handleFile(event.currentTarget.files?.[0] ?? null) }}
          disabled={disabled || compressing}
          className="hidden"
        />
      </div>

      {localError && (
        <p className="text-center text-xs font-semibold text-red-600">{localError}</p>
      )}
      <p className="text-center text-[11px] font-medium text-brand-400">
        PNG, JPG, WEBP o HEIC · se convierte al subir
      </p>
    </div>
  )
}

export default ImageUploader
