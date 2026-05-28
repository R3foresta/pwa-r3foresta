import type { Options } from 'browser-image-compression'

/** Opciones de compresion: objetivo <= 1 MB, dimension maxima 1920 px. */
export const IMAGE_COMPRESSION_OPTIONS: Options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
}

/** Comprime una imagen y, si falla, conserva el archivo original como fail-safe. */
export async function compressImageFile(file: File): Promise<File> {
  try {
    const { default: imageCompression } = await import('browser-image-compression')
    return await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)
  } catch {
    console.warn('[compressImageFile] Compresion fallida, usando original:', file.name)
    return file
  }
}
