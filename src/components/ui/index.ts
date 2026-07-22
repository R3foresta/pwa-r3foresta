// Capa de primitivas de UI — punto de entrada único.
// Ver FRONTEND_UI_STANDARD.md §4.
export { default as Button } from './Button'
export type { ButtonVariant, ButtonSize } from './Button'

export { default as Card } from './Card'
export type { CardPadding } from './Card'

export { default as Badge } from './Badge'
export type { BadgeVariant, BadgeSize } from './Badge'

export { default as StatusBadge } from './StatusBadge'
export { STATUS_VARIANT, statusVariant } from './status'

export { default as Chip } from './Chip'
export { default as SearchBar } from './SearchBar'
export { default as PageHeader } from './PageHeader'

export { default as Field, Input, Select, Textarea } from './Field'

export { cn } from './cn'
export type { ClassValue } from './cn'
