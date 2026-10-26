// Ayuda de navegación basada en la audiencia del InternalActorGuard actual.
// El backend sigue verificando actividad y permisos para cada operación.
export function hasInternalAppAccess(role: string | null | undefined): boolean {
  return ['ADMIN', 'GENERAL', 'VALIDADOR'].includes(role ?? '')
}

export function canOpenAppPath(path: string, role: string | null | undefined): boolean {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, '')
  if (!/^\/app(?:\/|$)/.test(pathname)) return false
  if (hasInternalAppAccess(role)) return true
  // La pantalla verifica capacidades del servidor; esta excepción no abre el módulo interno.
  return ['/app', '/app/home', '/app/profile', '/app/edit-profile', '/app/participacion/accesos', '/app/participacion/registrar', '/app/participacion/borradores', '/app/participacion/mis-registros', '/app/participacion/correcciones'].includes(pathname)
    || /^\/app\/planting\/subcampanias\/[1-9]\d*$/.test(pathname)
    || /^\/app\/participacion\/subcampanias\/[1-9]\d*\/registrar$/.test(pathname)
    || /^\/app\/participacion\/registros\/[1-9]\d*$/.test(pathname)
    || /^\/app\/participacion\/correcciones\/[1-9]\d*$/.test(pathname)
}

export function isPublicImpactPath(path: string): boolean {
  if (path.includes('\\')) return false
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, '')
  return pathname === '/impacto' || /^\/impacto\/(campanias|subcampanias|registros)\/[1-9]\d*$/.test(pathname)
}
