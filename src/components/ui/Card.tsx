import type { ElementType, HTMLAttributes } from 'react'
import { cn } from './cn'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

type CardProps = {
  padding?: CardPadding
  as?: ElementType
} & HTMLAttributes<HTMLElement>

/**
 * Shell de tarjeta unificado. Reemplaza el `rounded-3xl bg-white shadow-soft ...`
 * repetido en los 13 componentes `*Card` del proyecto. Ver FRONTEND_UI_STANDARD.md §4.2.
 */
function Card({ padding = 'md', as: Tag = 'div', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn('rounded-3xl bg-white shadow-soft ring-1 ring-black/5', PADDING[padding], className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Card
