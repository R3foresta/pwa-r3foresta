import { compressImageFile } from '../../../utils/imageCompression'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

export function usePhotoUpload() {
  // Valida peso y MIME, devolviendo aceptados y el primer error sin cortar validos.
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

  // Comprime antes de convertir a base64 para mantener transparente el flujo del hook.
  const readFilesAsBase64 = async (files: File[]): Promise<string[]> => {
    const results: string[] = []
    for (const file of files) {
      const compressed = await compressImageFile(file)
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
