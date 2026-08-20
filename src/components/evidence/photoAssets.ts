import type { PhotoAsset } from './PhotoUploader'

export function createPhotoAsset(file: File): PhotoAsset {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
  }
}
