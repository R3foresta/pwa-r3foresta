import React from 'react'
import Icon from '../../../components/Icon'

interface GalleryModalProps {
  photo: { url: string; titulo: string; fecha: string; autor: string } | null
  onClose: () => void
}

export default function GalleryModal({ photo, onClose }: GalleryModalProps) {
  if (!photo) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-fade-in">
      {/* Barra superior de acciones */}
      <header className="flex items-center justify-between px-4 pt-8 pb-4 text-white">
        <button 
          type="button"
          onClick={onClose} 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" 
          aria-label="Cerrar modal"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="text-center min-w-0 flex-1 px-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 truncate">Evidencia de Trazabilidad</p>
          <p className="text-xs font-extrabold text-white truncate mt-0.5">{photo.titulo}</p>
        </div>
        <button 
          type="button"
          onClick={onClose} 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors" 
          aria-label="Cerrar modal"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
      </header>

      {/* Contenedor central de imagen adaptada */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-h-[60vh] w-full rounded-2xl overflow-hidden bg-black/40 shadow-2xl border border-white/5">
          <img src={photo.url} alt={photo.titulo} className="w-full h-full object-contain max-h-[60vh]" />
        </div>
      </div>

      {/* Pie de foto con metadatos de auditoría */}
      <footer className="p-5 bg-gradient-to-t from-black via-black/80 to-transparent text-white">
        <div className="border-l-2 border-brand-500 pl-3">
          <h3 className="text-sm font-black tracking-tight leading-tight">{photo.titulo}</h3>
          <p className="mt-1 text-[11px] font-bold text-white/60 uppercase tracking-wider font-mono">
            Registrado por: {photo.autor}
          </p>
          <p className="text-[10px] font-bold text-brand-400 mt-0.5">
            Fecha operativa: {photo.fecha}
          </p>
        </div>
      </footer>
    </div>
  )
}