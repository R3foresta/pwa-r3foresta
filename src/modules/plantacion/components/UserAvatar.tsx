import { useState } from 'react'

type UserAvatarProps = {
  nombre: string
  fotoUrl?: string | null
  className?: string
  title?: string
}

export function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
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
