import { useId, useState } from 'react'
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
  const contentId = useId()

  return (
    <Card padding="none" className={className}>
      {/* Cabecera de disclosure (toggle estructural): se mantiene nativa, no <Button>. */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex min-h-11 w-full items-center justify-between rounded-3xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
      >
        <span className="text-sm font-semibold text-brand-700">{title}</span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 text-brand-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={contentId} hidden={!open} className="px-4 pb-4">{open && children}</div>
    </Card>
  )
}

export default CollapsibleSection
