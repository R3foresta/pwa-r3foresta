import type { ViveroLotEventView, PhotoItem } from '../types/view-models'
import EvidencePhoto from './EvidencePhoto'

export default function EvidenciaTab({ events, onSelectPhoto, onRenew, historyComplete = false }: {
  events: ViveroLotEventView[]
  onSelectPhoto: (photo: PhotoItem) => void
  historyComplete?: boolean
  onRenew: () => void
}) {
  const photos: PhotoItem[] = events.flatMap(event => (event.fotos ?? []).map(photo => ({ ...photo, autor: event.responsableNombre, etapa: event.kind })))
  const failed = events.filter(event => event.estadoEvidencias === 'ERROR_CONSULTA')
  const confirmed = historyComplete && events.every(event => event.estadoEvidencias === 'CONSULTADAS')
  const notice = <div className="col-span-2 space-y-1 text-sm text-neutral-600">
    {failed.map(event => <p role="status" key={event.id}>Consulta de evidencias incompleta · {event.label} · evento {event.id}</p>)}
    {!confirmed && !failed.length && <p>El servidor no confirmó si la consulta de fotos está completa.</p>}
    {confirmed && !photos.length && <p>Sin fotos vinculadas en este lote.</p>}
  </div>
  return <div className="grid grid-cols-2 gap-3 pb-8">{notice}{photos.map(photo => <div key={photo.id}>
    <p className="mb-1 text-xs font-bold text-brand-800">{photo.etapa?.replaceAll('_', ' ')}</p>
    <EvidencePhoto key={`${photo.url}-${photo.expiraEn}`} photo={photo} onOpen={() => onSelectPhoto(photo)} onRenew={onRenew} />
    <p className="mt-1 text-xs text-neutral-500">{photo.autor}</p>
  </div>)}</div>
}
