import type { RecoleccionFormData, RecoleccionPhoto } from '../recoleccionFormTypes'

export function revokePhotoPreviewUrl(photo: RecoleccionPhoto) {
  if (photo.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(photo.previewUrl)
  }
}

export function revokePhotoPreviewUrls(photos: readonly RecoleccionPhoto[]) {
  photos.forEach(revokePhotoPreviewUrl)
}

export function revokeRemovedPhotoPreviewUrls(
  currentPhotos: readonly RecoleccionPhoto[],
  nextPhotos: readonly RecoleccionPhoto[],
) {
  const nextPreviewUrls = new Set(nextPhotos.map((photo) => photo.previewUrl))
  currentPhotos.forEach((photo) => {
    if (!nextPreviewUrls.has(photo.previewUrl)) {
      revokePhotoPreviewUrl(photo)
    }
  })
}

export function revokeRecoleccionFormPhotoPreviewUrls(
  formData: Pick<RecoleccionFormData, 'placePhotos' | 'totalPhotos'>,
) {
  revokePhotoPreviewUrls(formData.placePhotos)
  revokePhotoPreviewUrls(formData.totalPhotos)
}
