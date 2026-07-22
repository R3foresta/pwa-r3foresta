import { useState } from 'react'
import Icon from '../../../components/Icon'
import { Card } from '../../../components/ui'

type Props = {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

function CollapsibleSection({ title, children, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card padding="none" className={className}>
      {/* Cabecera de disclosure (toggle estructural): se mantiene nativa, no <Button>. */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-4"
      >
        <span className="text-sm font-semibold text-brand-700">{title}</span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 text-brand-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}

export default CollapsibleSection
