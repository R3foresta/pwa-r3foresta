import Icon from '../../../../components/Icon'

export type Photo = { file: File; previewUrl: string }

type Props = {
  photos: Photo[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  max?: number
  required?: boolean
  showError?: boolean
  errorMessage?: string
  disabled?: boolean
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
}: Props) {
  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    onAdd(files)
    event.target.value = ''
  }

  const empty = photos.length === 0

  return (
    <div className="space-y-2">
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

      {empty ? (
        <label
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center text-brand-700 transition ${
            showError
              ? 'border-red-300 bg-red-50'
              : 'border-brand-200 bg-brand-50/60 hover:border-brand-300 hover:bg-brand-50'
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Icon name="photo" className="h-7 w-7" />
          <span className="text-sm font-extrabold">Añadir fotos</span>
          <span className="text-[11px] font-semibold text-brand-500">
            JPG o PNG · hasta {max} archivos
          </span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFiles}
            disabled={disabled}
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
                disabled={disabled}
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
                disabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Icon name="plus" className="h-6 w-6" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Añadir
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFiles}
                disabled={disabled}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {showError && errorMessage && (
        <p className="text-xs font-semibold text-red-500">{errorMessage}</p>
      )}
    </div>
  )
}

export default FotosUploader
