import { useRef, useState, type ChangeEvent } from 'react'
import Icon from '../../../components/Icon'
import { ProfileService } from '../profile.service'
import { IMAGE_UPLOAD_ACCEPT, getImageFileValidationError } from '../../../utils/imageValidation'
import { compressNonEvidenceImageFile } from '../../../utils/nonEvidenceImageCompression'

interface AvatarUploadProps {
  currentPhotoUrl?: string
  onUploadSuccess: (newUrl: string) => void | Promise<void>
  disabled?: boolean
  onUploadingChange?: (uploading: boolean) => void
}

export function AvatarUpload({ currentPhotoUrl, onUploadSuccess, disabled = false, onUploadingChange }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploading = useRef(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file || uploading.current || disabled) return
    setError('')
    setSuccess(false)
    const validationError = getImageFileValidationError(file)
    if (validationError) {
      setError(validationError)
      input.value = ''
      return
    }
    uploading.current = true
    setIsUploading(true)
    onUploadingChange?.(true)
    try {
      const compressed = await compressNonEvidenceImageFile(file)
      const response = await ProfileService.updateProfilePhoto(compressed)
      await onUploadSuccess(response.foto_perfil_url)
      setSuccess(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      uploading.current = false
      setIsUploading(false)
      onUploadingChange?.(false)
      input.value = ''
    }
  }

  const label = currentPhotoUrl ? 'Cambiar foto' : 'Subir foto de perfil'
  return (
    <div className="flex w-36 shrink-0 flex-col items-center gap-2 text-center">
      <button type="button" disabled={disabled || isUploading} aria-label={label}
        onClick={() => fileInputRef.current?.click()}
        className="relative h-24 w-24 rounded-full border-4 border-brand-100 bg-brand-50 shadow-soft transition hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
        {currentPhotoUrl ? <img src={currentPhotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
          : <Icon name="user" className="mx-auto h-12 w-12 text-brand-300" />}
        <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white">
          {isUploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" /> : <Icon name="camera" className="h-4 w-4" />}
        </span>
      </button>
      <p className="text-xs font-semibold text-brand-600">{isUploading ? 'Guardando foto…' : label}</p>
      {isUploading && <p role="status" className="text-xs text-neutral-500">Procesando y subiendo la imagen…</p>}
      {success && <p role="status" className="text-xs text-success-700">Foto actualizada.</p>}
      {error && <p role="alert" className="break-words rounded-xl bg-danger-50 p-2 text-xs text-danger-700">{error}</p>}
      <input type="file" ref={fileInputRef} className="hidden" accept={IMAGE_UPLOAD_ACCEPT}
        disabled={disabled || isUploading} onChange={event => void handleFileChange(event)} />
    </div>
  )
}
