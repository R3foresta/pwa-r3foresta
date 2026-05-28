import imageCompression from 'browser-image-compression'

// Objetivo <= 1 MB y dimension maxima 1920 px.
export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82,
}

// Fail-safe: si la compresion falla, conserva el archivo original.
export async function compressImageFile(file: File): Promise<File> {
  try {
    const compressed = (await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)) as Blob
    if (compressed instanceof File) return compressed
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    })
  } catch {
    console.warn('[compressImageFile] Compresión fallida, usando original:', file.name)
    return file
  }
}
