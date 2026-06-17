export const IMAGE_UPLOAD_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.heic,.heif'

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function getBaseName(fileName: string): string {
  const cleanName = fileName.split(/[\\/]/).pop()?.trim() || 'imagen'
  const baseName = cleanName.replace(/\.[^.]+$/, '').trim()
  return baseName || 'imagen'
}

export function getImageMimeType(file: File): string {
  return file.type.toLowerCase()
}

export function getImageFileValidationError(file: File): string | null {
  const mime = getImageMimeType(file)
  const extension = getFileExtension(file.name)

  if (SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return null
  if (!mime && SUPPORTED_IMAGE_EXTENSIONS.has(extension)) return null

  return `Formato inválido: ${file.name || 'imagen'} (usa JPG, PNG, WEBP, HEIC o HEIF).`
}
