// Ayuda de navegación basada en la audiencia del InternalActorGuard actual.
// El backend sigue verificando actividad y permisos para cada operación.
export function hasInternalAppAccess(role: string | null | undefined): boolean {
  return ['ADMIN', 'GENERAL', 'VALIDADOR'].includes(role ?? '')
}

export function canOpenAppPath(path: string, role: string | null | undefined): boolean {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, '')
  if (!/^\/app(?:\/|$)/.test(pathname)) return false
  if (hasInternalAppAccess(role)) return true
  return ['/app', '/app/home', '/app/profile', '/app/edit-profile'].includes(pathname)
}
