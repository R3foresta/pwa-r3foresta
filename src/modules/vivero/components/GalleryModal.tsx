import { useState } from 'react'
import Icon from '../../../components/Icon'
import type { PhotoItem } from '../types/view-models'
import EvidencePhoto from './EvidencePhoto'

export default function GalleryModal({ photos, onClose, onRenew }: { photos: PhotoItem[]; onClose: () => void; onRenew: () => void }) {
  const [index, setIndex] = useState(0)
  const photo = photos[Math.min(index, photos.length - 1)]
  if (!photo) return null
  return <div role="dialog" aria-modal="true" aria-label="Evidencia del lote" className="fixed inset-0 z-50 flex flex-col bg-black/95 p-5 text-white">
    <header className="flex items-center justify-between pb-4">
      <button type="button" aria-label="Cerrar galería" onClick={onClose}><Icon name="arrow-left" className="h-6 w-6" /></button>
      <p>{photo.etapa?.replaceAll('_', ' ')} · {index + 1} / {photos.length}</p>
    </header>
    <div className="mx-auto w-full max-w-xl flex-1 overflow-auto">
      <EvidencePhoto key={`${photo.id}-${photo.url}-${photo.expiraEn}`} photo={photo} onRenew={onRenew} />
      <p className="mt-3 text-sm">Responsable: {photo.autor}</p>
    </div>
    <footer className="flex justify-between pt-4">
      <button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="disabled:opacity-30">Anterior</button>
      <button type="button" disabled={index >= photos.length - 1} onClick={() => setIndex(value => value + 1)} className="disabled:opacity-30">Siguiente</button>
    </footer>
  </div>
}
