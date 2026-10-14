import { Badge } from '../../../components/ui'
import type { BadgeVariant } from '../../../components/ui/Badge'

const ROLE_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  ADMIN: { label: 'Administrador', variant: 'brand' },
  GENERAL: { label: 'Equipo operativo', variant: 'info' },
  VALIDADOR: { label: 'Validador', variant: 'success' },
  VOLUNTARIO: { label: 'Voluntario', variant: 'neutral' },
}

/** Traduce el rol recibido sin deducir permisos ni asignar uno por defecto. */
export function ProfileRoleBadge({ rol, className }: { rol: string | null | undefined; className?: string }) {
  const presentation = rol ? ROLE_LABELS[rol] : undefined
  return (
    <span title={rol || undefined} className={className}>
      <Badge variant={presentation?.variant || 'neutral'}>{presentation?.label || 'Rol no disponible'}</Badge>
    </span>
  )
}
