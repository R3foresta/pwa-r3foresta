import imageCompression from 'browser-image-compression'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

/** Opciones de compresión: objetivo ≤ 1 MB, ancho máximo 1920 px */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
  initialQuality: 0.82,
}

/**
 * Comprime un archivo de imagen antes de procesarlo.
 * Si la compresión falla (p.ej. formato inesperado) devuelve el archivo original.
 */
async function compressFile(file: File): Promise<File> {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS)
  } catch {
    console.warn('[usePhotoUpload] Compresión fallida, usando original:', file.name)
    return file
  }
}

export function usePhotoUpload() {
  /**
   * Valida una lista de archivos (peso y MIME). Devuelve los aceptados y, si corresponde,
   * el primer mensaje de error encontrado (no corta la iteración para permitir agregar los válidos).
   */
  const validateFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    const accepted: File[] = []
    let error: string | undefined

    for (const file of list) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        error = error ?? `Formato inválido: ${file.name} (solo JPG/PNG)`
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        error = error ?? `Imagen demasiado grande: ${file.name} (máx 5MB)`
        continue
      }
      accepted.push(file)
    }

    return { accepted, error }
  }

  /**
   * Comprime cada archivo y lo convierte a base64.
   * La compresión es transparente para los consumidores de este hook.
   */
  const readFilesAsBase64 = async (files: File[]): Promise<string[]> => {
    const results: string[] = []
    for (const file of files) {
      const compressed = await compressFile(file)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })
      results.push(base64)
    }
    return results
  }

  return { validateFiles, readFilesAsBase64 }
}
