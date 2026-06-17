import { getImageFileValidationError } from '../../../utils/imageValidation'

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

  return { validateFiles }
}
