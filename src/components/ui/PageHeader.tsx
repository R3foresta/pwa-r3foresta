import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../Icon'
import { cn } from './cn'

type PageHeaderProps = {
  variant?: 'compact' | 'hero'
  eyebrow?: string
  title: string
  subtitle?: string
  backTo?: string
  onBack?: () => void
  rightSlot?: ReactNode
  className?: string
  // Solo variant="hero":
  media?: string | null
  badge?: ReactNode
  chips?: ReactNode
  metric?: { label: string; value: ReactNode; caption?: string }
}

/**
 * Header unificado. Reemplaza `CrudHeader` (variant="compact") y el `HeroHeader`
 * de Vivero (variant="hero"). Solo presentación: los valores de dominio
 * (saldo, estado, imagen) se calculan en la capa del módulo y se pasan como props.
 * Ver FRONTEND_UI_STANDARD.md §4.5.
 */
function PageHeader({ variant = 'compact', onBack, backTo, ...props }: PageHeaderProps) {
  const navigate = useNavigate()
  const handleBack = () => {
    if (onBack) return onBack()
    if (backTo) return navigate(backTo)
    return navigate(-1)
  }

  return variant === 'hero' ? (
    <HeroHeader {...props} onBack={handleBack} />
  ) : (
    <CompactHeader {...props} onBack={handleBack} />
  )
}

type InnerProps = Omit<PageHeaderProps, 'variant' | 'backTo'> & { onBack: () => void }

function CompactHeader({ eyebrow = 'Sección', title, subtitle, rightSlot, onBack, className }: InnerProps) {
  return (
    <header className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Volver"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-soft transition hover:bg-white"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-700">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-brand-500">{subtitle}</p>}
        </div>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </header>
  )
}

function HeroHeader({ eyebrow, title, subtitle, media, badge, chips, metric, rightSlot, onBack, className }: InnerProps) {
  return (
    <header className={cn('relative h-[300px] w-full overflow-hidden rounded-b-3xl bg-brand-950 shadow-md', className)}>
      {media ? (
        <img src={media} alt="" className="h-full w-full object-cover opacity-50" />
      ) : (
        <div className="h-full w-full bg-brand-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent" />

      <button
        type="button"
        aria-label="Volver"
        onClick={onBack}
        className="absolute left-4 top-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
      >
        <Icon name="arrow-left" className="h-5 w-5" />
      </button>

      {(badge || rightSlot) && <div className="absolute right-4 top-10">{badge ?? rightSlot}</div>}

      <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between text-white">
        <div className="min-w-0 flex-1 pr-4">
          {eyebrow && (
            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{eyebrow}</span>
          )}
          <h1 className="mt-0.5 truncate text-[32px] font-black leading-none tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 truncate text-sm italic text-white/80">{subtitle}</p>}
          {chips && <div className="mt-3 flex flex-wrap gap-2">{chips}</div>}
        </div>
        {metric && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/70">{metric.label}</p>
            <p className="mt-0.5 text-[44px] font-black leading-none tracking-tighter">{metric.value}</p>
            {metric.caption && (
              <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/60">{metric.caption}</p>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default PageHeader
