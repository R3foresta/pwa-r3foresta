import type { ViveroLotEventView } from '../types/view-models'

interface EvidenciaTabProps {
  events: ViveroLotEventView[]
  onSelectPhoto: (photo: { url: string; titulo: string; fecha: string; autor: string } | null) => void
}

export default function EvidenciaTab({ events, onSelectPhoto }: EvidenciaTabProps) {
  const allPhotos = events.reduce((acc, event) => {
    if (event.fotos && event.fotos.length > 0) {
      event.fotos.forEach((f) => {
        acc.push({
          url: f.url,
          titulo: f.titulo,
          fecha: f.fecha, 
          autor: event.responsableNombre
        })
      })
    }
    return acc
  }, [] as Array<{ url: string; titulo: string; fecha: string; autor: string }>)

  if (allPhotos.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-semibold text-brand-500">No hay registros fotográficos disponibles para este lote.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {allPhotos.map((photo, index) => (
        <button
          key={`${photo.url}-${index}`}
          type="button"
          onClick={() => onSelectPhoto(photo)}
          className="overflow-hidden rounded-2xl bg-white text-left shadow-soft ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <img src={photo.url} alt={photo.titulo} className="h-28 w-full object-cover" />
          <div className="space-y-1 p-3">
            <p className="line-clamp-1 text-xs font-bold text-brand-700">{photo.titulo}</p>
            <p className="text-[10px] font-semibold text-brand-500">{photo.autor}</p>
            <p className="text-[10px] font-semibold text-brand-400">{photo.fecha}</p>
          </div>
        </button>
      ))}
    </div>
  )
}