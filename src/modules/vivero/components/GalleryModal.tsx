import Icon from '../../../components/Icon'
import type { PhotoItem } from '../types/view-models'

interface GalleryModalProps {
  photo: PhotoItem | null
  onClose: () => void
}

export default function GalleryModal({ photo, onClose }: GalleryModalProps) {
  if (!photo) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 pt-12 pb-4 text-white">
        <button 
          type="button"
          onClick={onClose} 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" 
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 truncate">
            {photo.etapa ? `EVIDENCIA DE ${photo.etapa.replace('_', ' ')}` : 'EVIDENCIA DE TRAZABILIDAD'}
          </p>
          <p className="text-xs font-extrabold text-white truncate mt-0.5">{photo.titulo}</p>
        </div>
        <button 
          type="button"
          onClick={onClose} 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" 
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
      </header>

      {/* 
        CONTENEDOR CENTRAL DE LA IMAGEN
      */}
      <div className="flex-1 min-h-0 p-4 flex items-center justify-center">
        <img 
          src={photo.url} 
          alt={photo.titulo} 
          className="max-w-full max-h-full object-contain rounded-xl" 
        />
      </div>

      {/* Footer */}
      <footer className="flex-none p-6 bg-gradient-to-t from-black via-black/80 to-transparent text-white pb-10">
        <div className="border-l-2 border-brand-500 pl-3">
          <h3 className="text-sm font-black tracking-tight leading-tight">{photo.titulo}</h3>
          <p className="mt-1 text-[11px] font-bold text-white/60 uppercase tracking-wider font-mono">
            REGISTRADO POR: {photo.autor}
          </p>
          <p className="text-[10px] font-bold text-white/80 mt-0.5">
            Fecha operativa: {photo.fecha}
          </p>
        </div>
      </footer>
    </div>
  )
}
