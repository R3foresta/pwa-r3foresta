import type { ViveroLotEventView } from '../types/view-models'

interface EvidenciaTabProps {
  events: ViveroLotEventView[]
  onSelectPhoto: (photo: { url: string; titulo: string; fecha: string; autor: string }) => void
}

export default function EvidenciaTab({ events, onSelectPhoto }: EvidenciaTabProps) {
  // Extraemos y aplanamos todas las fotos asociadas a los eventos operativos del lote
  const allPhotos = events.reduce((acc, event) => {
    if (event.fotos && event.fotos.length > 0) {
      event.fotos.forEach(f => {
        acc.push({
          id: f.id,
          url: f.url,
          titulo: f.titulo,
          fecha: f.fecha,
          autor: event.responsableNombre
        })
      })
    }
    return acc
  }, [] as Array<{ id: number; url: string; titulo: string; fecha: string; autor: string }>)

  if (allPhotos.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-3xl border border-slate-100">
        <p className="text-xs font-semibold text-slate-400">Este lote no registra evidencias fotográficas hasta la fecha.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Galería de evidencias</p>
        <p className="text-[10.5px] font-bold text-slate-400 font-mono">{allPhotos.length} fotos</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {allPhotos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelectPhoto(photo)}
            className="flex flex-col text-left overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all group"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
              <img 
                src={photo.url} 
                alt={photo.titulo} 
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-2.5 min-w-0">
              <h4 className="text-[11px] font-black text-brand-800 truncate leading-tight">{photo.titulo}</h4>
              <p className="text-[9.5px] font-semibold text-slate-400 truncate mt-0.5">{photo.fecha}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}