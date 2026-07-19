import { useState } from 'react'
import { getInitials } from '../utils/userAvatar'

type UserAvatarProps = {
  nombre: string
  fotoUrl?: string | null
  className?: string
  title?: string
}

export function UserAvatar({ nombre, fotoUrl, className, title }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <span className={className} title={title}>
      {fotoUrl && !imgError ? (
        <img
          src={fotoUrl}
          alt={nombre}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(nombre)
      )}
    </span>
  )
}
