import { useState } from 'react'
import Icon from '../../../components/Icon'
import { usePhotoUpload } from '../hooks/usePhotoUpload'

type Props = {
  label: string
  photos: string[]
  badgeLabel?: string
  maxPhotos?: number
  onChange: (next: string[]) => void
  onFilesAccepted?: (files: File[]) => void
  onRemove?: (index: number) => void
}

function PhotoPicker({ label, photos, badgeLabel, maxPhotos = 5, onChange, onFilesAccepted, onRemove }: Props) {
  const { validateFiles, readFilesForUpload } = usePhotoUpload()
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const { accepted, error: validationError } = validateFiles(files)
    if (validationError) setError(validationError)
    if (!accepted.length) return

    const remainingSlots = Math.max(0, maxPhotos - photos.length)
    const acceptedTrimmed = accepted.slice(0, remainingSlots)

    if (!acceptedTrimmed.length) {
      setError('Límite de fotos alcanzado')
      return
    }

    const { compressedFiles, base64List } = await readFilesForUpload(acceptedTrimmed)
    const next = [...photos, ...base64List].slice(0, maxPhotos)
    onChange(next)
    onFilesAccepted?.(compressedFiles)
    setError(null)
    event.target.value = ''
  }

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index))
    onRemove?.(index)
  }

  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-black/5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-base font-extrabold text-brand-700">{label}</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-4 text-sm font-semibold text-brand-700 shadow-soft transition hover:border-brand-300">
        <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={handleFiles} />
        <Icon name="photo" className="h-5 w-5" />
        <span>Subir fotos</span>
      </label>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={`${photo}-${index}`} className="space-y-1">
              <div className="relative h-24 overflow-hidden rounded-2xl bg-slate-100">
                <img src={photo} alt={`${label} ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
              <p className="text-center text-[11px] font-semibold text-slate-500">
                {badgeLabel ? `${badgeLabel} ${index + 1}` : `Foto ${index + 1}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PhotoPicker
