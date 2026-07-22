import type { ReactNode } from 'react'
import { cn } from './cn'

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'
export type BadgeSize = 'sm' | 'md'

// Strings de clase COMPLETOS por variante (no interpolar `bg-${variant}`: el JIT
// de Tailwind no detecta clases construidas dinámicamente).
const VARIANTS: Record<BadgeVariant, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  info: 'bg-info-50 text-info-700 ring-info-200',
}

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

type BadgeProps = {
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
  children: ReactNode
}

function Badge({ variant = 'neutral', size = 'md', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </span>
  )
}

export default Badge
