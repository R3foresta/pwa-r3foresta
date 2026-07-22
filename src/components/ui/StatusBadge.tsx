import Badge from './Badge'
import type { BadgeSize } from './Badge'
import { statusVariant } from './status'

type StatusBadgeProps = {
  status: string | null | undefined
  label?: string
  size?: BadgeSize
  className?: string
}

/**
 * Badge cuyo color deriva del estado de dominio vía el registro único (`status.ts`).
 * Pasar `label` cuando el texto visible difiera del código de estado.
 */
function StatusBadge({ status, label, size = 'md', className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariant(status)} size={size} className={className}>
      {label ?? status ?? '—'}
    </Badge>
  )
}

export default StatusBadge
