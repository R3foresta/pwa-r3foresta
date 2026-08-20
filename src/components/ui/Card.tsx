import type { ComponentPropsWithoutRef } from 'react'
import { cn } from './cn'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'
type CardElement = 'div' | 'article' | 'section'

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

type CardProps<T extends CardElement = 'div'> = {
  padding?: CardPadding
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'padding'>

/**
 * Shell de tarjeta unificado. Reemplaza el `rounded-3xl bg-white shadow-soft ...`
 * repetido en los 13 componentes `*Card` del proyecto. Ver FRONTEND_UI_STANDARD.md §4.2.
 */
function Card<T extends CardElement = 'div'>({
  padding = 'md',
  as,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = as ?? 'div'

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
