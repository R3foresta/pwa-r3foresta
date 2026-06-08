import { compressImageFile, getImageFileValidationError } from '../../../utils/imageCompression'

export function usePhotoUpload() {
  /**
   * Valida MIME y devuelve los aceptados junto al primer error sin cortar
   * la iteracion, para permitir agregar los archivos validos.
   */
  const validateFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    const accepted: File[] = []
    let error: string | undefined

    for (const file of list) {
      const validationError = getImageFileValidationError(file)
      if (validationError) {
        error = error ?? validationError
        continue
      }
      accepted.push(file)
    }

    return { accepted, error }
  }

  /**
   * Comprime cada archivo y devuelve tanto los File finales como su base64,
   * manteniendo el flujo transparente para los consumidores del hook.
   */
  const readFilesForUpload = async (
    files: File[],
  ): Promise<{ compressedFiles: File[]; base64List: string[]; error?: string }> => {
    const compressedFiles: File[] = []
    const base64List: string[] = []
    let error: string | undefined

    for (const file of files) {
      let compressed: File
      try {
        compressed = await compressImageFile(file)
      } catch (processingError) {
        error = error ?? (processingError instanceof Error
          ? processingError.message
          : `No se pudo procesar ${file.name || 'la imagen'}.`)
        continue
      }

      compressedFiles.push(compressed)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })
      base64List.push(base64)
    }

    return { compressedFiles, base64List, error }
  }

  return { validateFiles, readFilesForUpload }
}
