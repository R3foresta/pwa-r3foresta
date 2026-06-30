import { useState } from 'react'

type UserAvatarProps = {
  nombre: string
  fotoUrl?: string | null
  className?: string
  title?: string
}

export function getInitials(
  value?: string | null,
  opts?: { fallback?: string },
): string {
  const fallback = opts?.fallback ?? ''
  if (!value) return fallback
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return initials || fallback
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
