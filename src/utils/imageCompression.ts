import imageCompression from 'browser-image-compression'

/** Opciones de compresión: objetivo ≤ 1 MB, dimensión máxima 1920 px */
export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.82,
}

/**
 * Comprime un archivo de imagen.
 * Si la compresión falla por cualquier razón, devuelve el archivo original (fail-safe).
 */
export async function compressImageFile(file: File): Promise<File> {
  try {
    return await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)
  } catch {
    console.warn('[compressImageFile] Compresión fallida, usando original:', file.name)
    return file
  }
}
