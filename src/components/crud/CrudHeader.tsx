import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../Icon'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  backTo?: string
  rightSlot?: ReactNode
}

function CrudHeader({ eyebrow = 'Sección', title, subtitle, backTo, rightSlot }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Volver"
          onClick={handleBack}
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

export default CrudHeader
