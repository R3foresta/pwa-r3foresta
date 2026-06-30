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
  return (
    <span className={className} title={title}>
      {fotoUrl ? (
        <img src={fotoUrl} alt={nombre} className="h-full w-full rounded-full object-cover" />
      ) : (
        getInitials(nombre)
      )}
    </span>
  )
}
