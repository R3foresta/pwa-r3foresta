import type { ViveroLotEventView, PhotoItem } from '../types/view-models'

interface EvidenciaTabProps {
  events: ViveroLotEventView[]
  onSelectPhoto: (photo: PhotoItem | null) => void
}

export default function EvidenciaTab({ events, onSelectPhoto }: EvidenciaTabProps) {
  const allPhotos = events.reduce((acc, event) => {
    if (event.fotos && event.fotos.length > 0) {
      event.fotos.forEach((f) => {
        acc.push({
          url: f.url,
          titulo: f.titulo,
          fecha: f.fecha, 
          autor: event.responsableNombre,
          etapa: event.kind 
        })
      })
    }
    return acc
  }, [] as PhotoItem[])

  if (allPhotos.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-semibold text-brand-500">No hay registros fotográficos disponibles para este lote.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-8">
      {allPhotos.map((photo, index) => (
        <button
          key={`${photo.url}-${index}`}
          type="button"
          onClick={() => onSelectPhoto(photo)}
          className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md relative"
        >
          <div className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
            <p className="text-[8px] font-black uppercase tracking-widest text-white">
              {photo.etapa && (
                <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  {photo.etapa.replaceAll('_', ' ')}
                </span>
              )}
            </p>
          </div>

          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50">
            <img 
              src={photo.url} 
              alt={photo.titulo} 
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
            />
          </div>
          
          <div className="space-y-1 p-3">
            <p className="line-clamp-1 text-xs font-bold text-[#002b15]">{photo.titulo || 'Evidencia técnica'}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{photo.autor}</p>
            <p className="text-[10px] font-semibold text-slate-400">{photo.fecha}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
