import type { ButtonHTMLAttributes } from 'react'
import Icon from '../Icon'
import type { IconName } from '../Icon'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700',
  secondary: 'bg-white text-brand-700 ring-1 ring-brand-200 shadow-soft hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-danger-600 text-white shadow-soft hover:bg-danger-700',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs font-bold',
  md: 'px-4 py-3 text-sm font-semibold',
  lg: 'px-4 py-4 text-base font-extrabold',
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
}

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: IconName
  rightIcon?: IconName
} & ButtonHTMLAttributes<HTMLButtonElement>

/**
 * Botón unificado. Reemplaza los 50 strings de clase distintos de botón primario.
 * Ver FRONTEND_UI_STANDARD.md §4.1.
 *
 * Nota: `type` por defecto es 'button' (estándar de librería). Los botones que
 * envían formularios deben pasar explícitamente `type="submit"`.
 */
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  type = 'button',
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl transition',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner className={ICON_SIZE[size]} />
      ) : (
        leftIcon && <Icon name={leftIcon} className={ICON_SIZE[size]} />
      )}
      {children}
      {!loading && rightIcon && <Icon name={rightIcon} className={ICON_SIZE[size]} />}
    </button>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

export default Button
