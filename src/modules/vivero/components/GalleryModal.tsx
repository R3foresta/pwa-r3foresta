import { useState, useEffect } from 'react'
import Icon from '../../../components/Icon'
import type { PhotoItem } from '../types/view-models'

interface GalleryModalProps {
  photos: PhotoItem[] | null
  initialIndex?: number
  onClose: () => void
}

export default function GalleryModal({ photos, initialIndex = 0, onClose }: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]); 

  if (!photos || photos.length === 0) return null

  const photo = photos[currentIndex]
  const hasNext = currentIndex < photos.length - 1
  const hasPrev = currentIndex > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      <header className="flex-none flex items-center justify-between px-4 pt-12 pb-4 text-white">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 truncate">
            {photo.etapa ? `EVIDENCIA DE ${photo.etapa.replace('_', ' ')}` : 'EVIDENCIA DE TRAZABILIDAD'}
          </p>
          <p className="text-xs font-extrabold text-white truncate mt-0.5">{photo.titulo}</p>
        </div>
        <div className="h-10 w-10" /> 
      </header>

      <div className="flex-1 min-h-0 relative flex items-center justify-center">
        {hasPrev && (
          <button onClick={() => setCurrentIndex(i => i - 1)} className="absolute left-2 z-10 p-2 text-white/70 hover:text-white bg-black/20 rounded-full">
            <Icon name="arrow-left" className="h-6 w-6" />
          </button>
        )}
        
        <img src={photo.url} alt={photo.titulo} className="max-w-full max-h-full object-contain rounded-xl p-4" />
        
        {hasNext && (
          <button onClick={() => setCurrentIndex(i => i + 1)} className="absolute right-2 z-10 p-2 text-white/70 hover:text-white bg-black/20 rounded-full">
            <Icon name="chevron-right" className="h-6 w-6" />
          </button>
        )}
      </div>

      <footer className="flex-none p-6 bg-gradient-to-t from-black via-black/80 to-transparent text-white pb-10">
        <div className="flex justify-between items-end border-l-2 border-brand-500 pl-3">
          <div>
            <h3 className="text-sm font-black tracking-tight leading-tight">{photo.titulo}</h3>
            <p className="mt-1 text-[11px] font-bold text-white/60 uppercase tracking-wider font-mono">REGISTRADO POR: {photo.autor}</p>
            <p className="text-[10px] font-bold text-white/80 mt-0.5">Fecha operativa: {photo.fecha}</p>
          </div>
          <p className="text-xs font-bold text-white/50">{currentIndex + 1} / {photos.length}</p>
        </div>
      </footer>
    </div>
  )
}