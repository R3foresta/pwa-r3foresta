import type { Options } from 'browser-image-compression'

export const IMAGE_UPLOAD_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.heic,.heif'

const NORMALIZED_IMAGE_TYPE = 'image/jpeg'
const NORMALIZED_IMAGE_EXTENSION = 'jpg'
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
const BACKEND_SAFE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const BACKEND_SAFE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])

/** Opciones de compresion: objetivo <= 1 MB, dimension maxima 1920 px. */
export const IMAGE_COMPRESSION_OPTIONS: Options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: false,
  initialQuality: 0.82,
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getBaseName(fileName: string): string {
  const cleanName = fileName.split(/[\\/]/).pop()?.trim() || 'imagen'
  const baseName = cleanName.replace(/\.[^.]+$/, '').trim()
  return baseName || 'imagen'
}

function withJpegFileName(fileName: string): string {
  return `${getBaseName(fileName)}.${NORMALIZED_IMAGE_EXTENSION}`
}

function getMimeType(file: File): string {
  return file.type.toLowerCase()
}

function isBackendSafeOriginal(file: File): boolean {
  const mime = getMimeType(file)
  if (BACKEND_SAFE_IMAGE_MIME_TYPES.has(mime)) return true
  return !mime && BACKEND_SAFE_IMAGE_EXTENSIONS.has(getFileExtension(file.name))
}

function normalizeJpegFile(file: Blob, original: File): File {
  return new File([file], withJpegFileName(original.name), {
    type: NORMALIZED_IMAGE_TYPE,
    lastModified: original.lastModified,
  })
}

function normalizeSafeOriginalFile(file: File): File {
  const extension = getFileExtension(file.name)
  const type = extension === 'png' ? 'image/png' : 'image/jpeg'
  const fileName = `${getBaseName(file.name)}.${extension === 'png' ? 'png' : 'jpg'}`
  return new File([file], fileName, {
    type,
    lastModified: file.lastModified,
  })
}

export function getImageFileValidationError(file: File): string | null {
  const mime = getMimeType(file)
  const extension = getFileExtension(file.name)

  if (SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return null
  if (!mime && SUPPORTED_IMAGE_EXTENSIONS.has(extension)) return null

  return `Formato inválido: ${file.name || 'imagen'} (usa JPG, PNG, WEBP, HEIC o HEIF).`
}

/**
 * Normaliza imagenes de galeria/camara a JPEG antes de subirlas.
 * iPhone y algunos Android pueden entregar HEIC/HEIF/WEBP; backend sigue
 * recibiendo un formato estable y compatible.
 */
export async function compressImageFile(file: File): Promise<File> {
  const validationError = getImageFileValidationError(file)
  if (validationError) {
    throw new Error(validationError)
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression')
    const compressed = await imageCompression(file, {
      ...IMAGE_COMPRESSION_OPTIONS,
      fileType: NORMALIZED_IMAGE_TYPE,
    })
    return normalizeJpegFile(compressed, file)
  } catch (error) {
    if (isBackendSafeOriginal(file)) {
      console.warn('[compressImageFile] Compresion fallida, usando original compatible:', file.name)
      return normalizeSafeOriginalFile(file)
    }

    console.warn('[compressImageFile] Normalizacion fallida:', file.name, error)
    throw new Error(
      `No se pudo procesar ${file.name || 'la imagen'}. Si es una foto de iPhone, prueba exportarla como JPG o usar el modo Más compatible.`,
    )
  }
}
