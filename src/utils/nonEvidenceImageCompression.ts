import type { Options } from 'browser-image-compression'
import {
  getBaseName,
  getFileExtension,
  getImageFileValidationError,
  getImageMimeType,
} from './imageValidation'

const NORMALIZED_IMAGE_TYPE = 'image/jpeg'
const NORMALIZED_IMAGE_EXTENSION = 'jpg'
const BACKEND_SAFE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const BACKEND_SAFE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])

/** Opciones de compresion: objetivo <= 1 MB, dimension maxima 1920 px. */
export const NON_EVIDENCE_IMAGE_COMPRESSION_OPTIONS: Options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: false,
  initialQuality: 0.82,
}

function withJpegFileName(fileName: string): string {
  return `${getBaseName(fileName)}.${NORMALIZED_IMAGE_EXTENSION}`
}

function isBackendSafeOriginal(file: File): boolean {
  const mime = getImageMimeType(file)
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

/**
 * Comprime y normaliza imagenes no auditables, como avatar o catalogo.
 * No usar para evidencia de Recoleccion, Vivero o Plantacion.
 */
export async function compressNonEvidenceImageFile(file: File): Promise<File> {
  const validationError = getImageFileValidationError(file)
  if (validationError) {
    throw new Error(validationError)
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression')
    const compressed = await imageCompression(file, {
      ...NON_EVIDENCE_IMAGE_COMPRESSION_OPTIONS,
      fileType: NORMALIZED_IMAGE_TYPE,
    })
    return normalizeJpegFile(compressed, file)
  } catch (error) {
    if (isBackendSafeOriginal(file)) {
      console.warn(
        '[compressNonEvidenceImageFile] Compresion fallida, usando original compatible:',
        file.name,
      )
      return normalizeSafeOriginalFile(file)
    }

    console.warn('[compressNonEvidenceImageFile] Normalizacion fallida:', file.name, error)
    throw new Error(
      `No se pudo procesar ${file.name || 'la imagen'}. Si es una foto de iPhone, prueba exportarla como JPG o usar el modo Más compatible.`,
    )
  }
}
