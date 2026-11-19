import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui'

type Props = { titulo: string; onClose: () => void; children: ReactNode; pie?: ReactNode }

export default function DialogoReporte({ titulo, onClose, children, pie }: Props) {
  const heading = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const focus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    element?.showModal()
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      if (focus?.isConnected) focus.focus()
    }
  }, [])

  return createPortal(<dialog ref={dialog} aria-labelledby={heading} onCancel={(event) => {
    event.preventDefault()
    onClose()
  }} className="m-auto max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl overflow-hidden rounded-3xl bg-white p-0 text-brand-900 shadow-xl backdrop:bg-brand-950/60">
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-brand-100 px-4 py-4 sm:px-6">
        <h2 id={heading} className="font-display text-xl font-extrabold">{titulo}</h2>
        <Button variant="ghost" size="sm" leftIcon="x" onClick={onClose}>Cerrar</Button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-brand-50/50 px-4 py-4 sm:px-6" role="region" aria-label="Contenido del reporte" tabIndex={0}>
        {children}
      </div>
      {pie && <footer className="shrink-0 border-t border-brand-100 px-4 py-4 sm:px-6">
        {pie}
      </footer>}
    </div>
  </dialog>, document.body)
}
