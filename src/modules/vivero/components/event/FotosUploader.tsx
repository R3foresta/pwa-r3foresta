import { useState } from 'react'
import Icon from '../../../../components/Icon'
import { compressImageFile } from '../../../../utils/imageCompression'

export type Photo = { file: File; previewUrl: string }

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png'])

type Props = {
  photos: Photo[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  max?: number
  required?: boolean
  showError?: boolean
  errorMessage?: string
  disabled?: boolean
  /** Skip the component's own label/count header. Use when wrapping in another card (e.g. SectionCard) that already provides the title and badge. */
  headerless?: boolean
}

function FotosUploader({
  photos,
  onAdd,
  onRemove,
  max = 5,
  required = false,
  showError = false,
  errorMessage,
  disabled = false,
  headerless = false,
}: Props) {
  const [fileError, setFileError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return

    const availableSlots = Math.max(0, max - photos.length)
    if (availableSlots === 0) {
      setFileError(`Ya alcanzaste el máximo de ${max} fotos.`)
      input.value = ''
      return
    }

    const invalidType = files.filter((file) => !ALLOWED_MIME_TYPES.has(file.type))
    const candidates = files
      .filter((file) => ALLOWED_MIME_TYPES.has(file.type))
      .slice(0, availableSlots)

    const errors: string[] = []
    if (invalidType.length > 0) {
      errors.push(
        `${invalidType.length === 1 ? '1 archivo no es JPG o PNG' : `${invalidType.length} archivos no son JPG o PNG`}.`,
      )
    }
    if (files.length > availableSlots) {
      errors.push(
        candidates.length > 0
          ? `Solo se procesaron ${candidates.length} de ${files.length} fotos por el límite de ${max}.`
          : `No se agregaron fotos porque se alcanzó el límite de ${max}.`,
      )
    }

    setCompressing(true)
    try {
      const compressed = await Promise.all(candidates.map((file) => compressImageFile(file)))
      setFileError(errors.length > 0 ? errors.join(' ') : null)
      if (compressed.length > 0) onAdd(compressed)
    } finally {
      setCompressing(false)
      input.value = ''
    }
  }

  const empty = photos.length === 0
  const isDisabled = disabled || compressing

  return (
    <div className="space-y-2">
      {!headerless && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-brand-700">
            Evidencia fotográfica
            {required && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
                Obligatorio
              </span>
            )}
          </p>
          {photos.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {photos.length}/{max}
            </span>
          )}
        </div>
      )}

      {empty ? (
        <label
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center text-brand-700 transition ${
            showError
              ? 'border-red-300 bg-red-50'
              : 'border-brand-200 bg-brand-50/60 hover:border-brand-300 hover:bg-brand-50'
          } ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Icon name="photo" className="h-7 w-7" />
          <span className="text-sm font-extrabold">
            {compressing ? 'Procesando fotos...' : 'Añadir fotos'}
          </span>
          <span className="text-[11px] font-semibold text-brand-500">
            JPG o PNG · hasta {max} archivos · se comprimen al subir
          </span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png"
            onChange={(event) => {
              void handleFiles(event)
            }}
            disabled={isDisabled}
            className="hidden"
          />
        </label>
      ) : (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {photos.map((photo, index) => (
            <div
              key={photo.previewUrl}
              className="relative h-24 w-24 shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-black/5"
            >
              <img
                src={photo.previewUrl}
                alt={photo.file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={isDisabled}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition hover:bg-red-600 disabled:opacity-50"
                aria-label="Quitar foto"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photos.length < max && (
            <label
              className={`flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 text-brand-600 transition hover:border-brand-300 hover:bg-brand-50 ${
                isDisabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Icon name="plus" className="h-6 w-6" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {compressing ? '...' : 'Añadir'}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                onChange={(event) => {
                  void handleFiles(event)
                }}
                disabled={isDisabled}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {fileError && (
        <p className="text-xs font-semibold text-red-500">{fileError}</p>
      )}
      {showError && errorMessage && (
        <p className="text-xs font-semibold text-red-500">{errorMessage}</p>
      )}
    </div>
  )
}

export default FotosUploader
