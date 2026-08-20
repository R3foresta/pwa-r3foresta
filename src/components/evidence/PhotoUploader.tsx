import { useState } from 'react'
import Icon from '../Icon'
import {
  IMAGE_UPLOAD_ACCEPT,
  getImageFileValidationError,
} from '../../utils/imageValidation'

/**
 * Foto seleccionada o foto existente que solo se muestra como preview.
 * Los flujos que suben evidencia deben comprobar que `file` exista antes de
 * construir el request al backend.
 */
export type PhotoAsset = {
  file?: File
  previewUrl: string
}

/** Tipo conveniente para flujos que siempre trabajan con archivos nuevos. */
export type Photo = PhotoAsset & { file: File }

export type PhotoUploaderProps = {
  photos: readonly PhotoAsset[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  label?: string
  /** Texto opcional mostrado debajo de cada preview. */
  photoLabel?: string
  max?: number
  required?: boolean
  showError?: boolean
  errorMessage?: string
  disabled?: boolean
  /** Omite el encabezado cuando la sección contenedora ya tiene título y contador. */
  headerless?: boolean
}

function PhotoUploader({
  photos,
  onAdd,
  onRemove,
  label = 'Evidencia fotográfica',
  photoLabel,
  max = 5,
  required = false,
  showError = false,
  errorMessage,
  disabled = false,
  headerless = false,
}: PhotoUploaderProps) {
  const [fileError, setFileError] = useState<string | null>(null)

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return

    const availableSlots = Math.max(0, max - photos.length)
    if (availableSlots === 0) {
      setFileError(`Ya alcanzaste el máximo de ${max} fotos.`)
      input.value = ''
      return
    }

    const candidates: File[] = []
    let invalidCount = 0

    for (const file of files) {
      if (getImageFileValidationError(file)) {
        invalidCount += 1
        continue
      }
      candidates.push(file)
    }

    const accepted = candidates.slice(0, availableSlots)
    const errors: string[] = []
    if (invalidCount > 0) {
      errors.push(
        `${invalidCount === 1 ? '1 archivo no es una imagen soportada' : `${invalidCount} archivos no son imágenes soportadas`}.`,
      )
    }
    if (candidates.length > availableSlots) {
      errors.push(
        accepted.length > 0
          ? `Solo se agregaron ${accepted.length} de ${candidates.length} fotos por el límite de ${max}.`
          : `No se agregaron fotos porque se alcanzó el límite de ${max}.`,
      )
    }

    setFileError(errors.length > 0 ? errors.join(' ') : null)
    if (accepted.length > 0) onAdd(accepted)
    input.value = ''
  }

  const empty = photos.length === 0
  const fileInput = (
    <input
      type="file"
      multiple
      accept={IMAGE_UPLOAD_ACCEPT}
      onChange={handleFiles}
      disabled={disabled}
      className="hidden"
    />
  )

  return (
    <div className="space-y-2">
      {!headerless && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-brand-700">
            {label}
            {required && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-danger-500">
                Obligatorio
              </span>
            )}
          </p>
          {photos.length > 0 && (
            <span className="rounded-full bg-success-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success-700">
              {photos.length}/{max}
            </span>
          )}
        </div>
      )}

      {empty ? (
        <label
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center text-brand-700 transition ${
            showError
              ? 'border-danger-300 bg-danger-50'
              : 'border-brand-200 bg-brand-50/60 hover:border-brand-300 hover:bg-brand-50'
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Icon name="photo" className="h-7 w-7" />
          <span className="text-sm font-extrabold">Añadir fotos</span>
          <span className="text-[11px] font-semibold text-brand-500">
            JPG, PNG, WEBP, HEIC o HEIF · hasta {max} archivos
          </span>
          {fileInput}
        </label>
      ) : (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {photos.map((photo, index) => (
            <div key={`${photo.previewUrl}-${index}`} className="shrink-0 space-y-1">
              <div className="relative h-24 w-24 snap-start overflow-hidden rounded-2xl ring-1 ring-black/5">
                <img
                  src={photo.previewUrl}
                  alt={photo.file?.name ?? `${photoLabel ?? label} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white shadow-md ring-2 ring-white transition hover:bg-danger-600 disabled:opacity-50"
                  aria-label="Quitar foto"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
              {photoLabel && (
                <p className="text-center text-[11px] font-semibold text-neutral-500">
                  {photoLabel} {index + 1}
                </p>
              )}
            </div>
          ))}
          {photos.length < max && (
            <label
              className={`flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 text-brand-600 transition hover:border-brand-300 hover:bg-brand-50 ${
                disabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Icon name="plus" className="h-6 w-6" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Añadir</span>
              {fileInput}
            </label>
          )}
        </div>
      )}

      {fileError && <p className="text-xs font-semibold text-danger-500">{fileError}</p>}
      {showError && errorMessage && (
        <p className="text-xs font-semibold text-danger-500">{errorMessage}</p>
      )}
    </div>
  )
}

export default PhotoUploader
