import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../../components/Icon'

export default function ViveroAdminMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key) }
  }, [open])
  return <div ref={ref} className="relative ml-auto shrink-0">
    <button ref={trigger} type="button" aria-label="Más opciones de Vivero" aria-expanded={open} aria-controls="vivero-admin-options" onClick={() => setOpen(value => !value)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-soft"><Icon name="ellipsis" className="h-5 w-5" /></button>
    {open && <nav id="vivero-admin-options" aria-label="Administración de Vivero" className="absolute right-0 z-30 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-neutral-200">
      {[['/app/collections/validate', 'Recibir y validar material'], ['/app/vivero/material', 'Material de origen y desecho'], ['/app/vivero/incorporaciones', 'Incorporar plantas']].map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand-50">{label}</Link>)}
    </nav>}
  </div>
}
