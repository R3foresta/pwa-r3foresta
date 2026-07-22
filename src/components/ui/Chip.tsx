import type { ReactNode } from 'react'
import { cn } from './cn'

type ChipProps = {
  selected?: boolean
  onClick?: () => void
  className?: string
  children: ReactNode
}

/**
 * Píldora interactiva para filtros/tags (p. ej. filtros de etapa en Vivero).
 * Para etiquetas de estado no interactivas usar <Badge> / <StatusBadge>.
 */
function Chip({ selected = false, onClick, className, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
        selected
          ? 'bg-brand-600 text-white shadow-soft'
          : 'bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export default Chip
