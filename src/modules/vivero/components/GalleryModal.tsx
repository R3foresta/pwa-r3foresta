import Icon from '../../../components/Icon'
import type { PhotoItem } from '../types/view-models'
import EvidencePhoto from './EvidencePhoto'

export default function GalleryModal({ photos, selectedPhotoId, onSelectPhotoId, onClose, onRenew, renewing, error }: {
  photos: PhotoItem[]
  selectedPhotoId: string
  onSelectPhotoId: (id: string) => void
  onClose: () => void
  onRenew: () => void
  renewing: boolean
  error: string | null
}) {
  const index = photos.findIndex(photo => photo.id === selectedPhotoId)
  const photo = photos[index]
  if (!photo) return null
  return <div role="dialog" aria-modal="true" aria-label="Evidencia del lote" className="fixed inset-0 z-50 flex flex-col bg-black/95 p-5 text-white">
    <header className="flex items-center justify-between pb-4">
      <button type="button" aria-label="Cerrar galería" onClick={onClose}><Icon name="arrow-left" className="h-6 w-6" /></button>
      <p>{photo.etapa?.replaceAll('_', ' ')} · {index + 1} / {photos.length}</p>
    </header>
    <div className="mx-auto w-full max-w-xl flex-1 overflow-auto">
      {error && <p role="alert" className="mb-3 rounded-2xl bg-warning-50 p-3 text-sm text-neutral-800">No se pudo renovar el acceso a las fotos. Vuelve a consultar; la foto seleccionada se conserva.</p>}
      <EvidencePhoto key={`${photo.id}-${photo.url}-${photo.expiraEn}`} photo={photo} onRenew={onRenew} renewing={renewing} />
      <p className="mt-3 text-sm">Responsable: {photo.autor}</p>
    </div>
    <footer className="flex justify-between pt-4">
      <button type="button" disabled={index === 0} onClick={() => onSelectPhotoId(photos[index - 1].id)} className="disabled:opacity-30">Anterior</button>
      <button type="button" disabled={index >= photos.length - 1} onClick={() => onSelectPhotoId(photos[index + 1].id)} className="disabled:opacity-30">Siguiente</button>
    </footer>
  </div>
}
