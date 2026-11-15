import type { ViveroLotEventView, PhotoItem } from '../types/view-models'
import EvidencePhoto from './EvidencePhoto'

export default function EvidenciaTab({ events, onSelectPhoto, onRenew }: {
  events: ViveroLotEventView[]
  onSelectPhoto: (photo: PhotoItem) => void
  onRenew: () => void
}) {
  const photos: PhotoItem[] = events.flatMap(event => (event.fotos ?? []).map(photo => ({ ...photo, autor: event.responsableNombre, etapa: event.kind })))
  if (!photos.length) return <p className="rounded-3xl bg-white p-6 text-sm text-neutral-600">La consulta no devolvió fotos para este lote.</p>
  return <div className="grid grid-cols-2 gap-3 pb-8">{photos.map(photo => <div key={photo.id}>
    <p className="mb-1 text-xs font-bold text-brand-800">{photo.etapa?.replaceAll('_', ' ')}</p>
    <EvidencePhoto key={`${photo.url}-${photo.expiraEn}`} photo={photo} onOpen={() => onSelectPhoto(photo)} onRenew={onRenew} />
    <p className="mt-1 text-xs text-neutral-500">{photo.autor}</p>
  </div>)}</div>
}
