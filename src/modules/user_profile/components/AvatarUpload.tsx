import React, { useRef, useState } from 'react'
import { ProfileService } from '../profile.service'

interface AvatarUploadProps {
  currentPhotoUrl?: string
  onUploadSuccess: (newUrl: string) => void
}

export function AvatarUpload({ currentPhotoUrl, onUploadSuccess }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const response = await ProfileService.updateProfilePhoto(file)
      onUploadSuccess(response.foto_perfil_url)
    } catch (error: any) {
      alert(error.message || 'Error al subir la foto')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-4 border-brand-200 bg-slate-100 shadow-soft transition-transform hover:scale-105"
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {currentPhotoUrl ? (
          <img src={currentPhotoUrl} alt="Perfil" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        {currentPhotoUrl ? 'Cambiar foto' : 'Subir foto de perfil'}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  )
}