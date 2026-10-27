import type { ReactNode } from 'react'
import Icon, { type IconName } from '../../../components/Icon'
import { UserAvatar } from './UserAvatar'

export type EquipoTone = 'brand' | 'warning'

type MemberCardProps = {
  as?: 'li' | 'section'
  nombre: string
  fotoUrl?: string | null
  rol: string
  tone?: EquipoTone
  subtitle?: string
  action?: ReactNode
}

export function EquipoMemberCard({ as: Component = 'li', nombre, fotoUrl, rol, tone = 'brand', subtitle, action }: MemberCardProps) {
  const avatarColor = tone === 'warning'
    ? 'bg-warning-50 text-warning-700'
    : 'bg-brand-50 text-brand-700'
  const badgeColor = tone === 'warning'
    ? 'bg-warning-50 text-warning-700 ring-warning-100'
    : 'bg-brand-50 text-brand-600 ring-brand-100'

  return <Component className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
    <UserAvatar nombre={nombre} fotoUrl={fotoUrl} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${avatarColor}`} />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="truncate text-sm font-extrabold leading-tight text-brand-800">{nombre}</p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] ring-1 ${badgeColor}`}>{rol}</span>
      </div>
      {subtitle && <p className="mt-0.5 text-[10.5px] font-bold text-neutral-500">{subtitle}</p>}
    </div>
    {action}
  </Component>
}

type ActionButtonProps = {
  icon: IconName
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

export function EquipoActionButton({ icon, active = false, disabled = false, onClick, children }: ActionButtonProps) {
  return <button type="button" onClick={onClick} disabled={disabled}
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 ${active ? 'bg-brand-600 text-white shadow-soft hover:bg-brand-700' : 'bg-white text-brand-700 ring-1 ring-brand-100 shadow-soft hover:bg-brand-50'}`}>
    <Icon name={icon} className="h-3.5 w-3.5" />
    {children}
  </button>
}

export function EquipoSectionHeading({ title, aside }: { title: string; aside?: string }) {
  return <div className="flex items-baseline justify-between gap-2">
    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">{title}</p>
    {aside && <p className="text-[11px] font-extrabold tabular-nums text-neutral-500">{aside}</p>}
  </div>
}

export function EquipoSearchField({ value, onChange, placeholder, disabled = false, type = 'text', ariaLabel }: { value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean; type?: 'text' | 'email'; ariaLabel?: string }) {
  return <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-3 shadow-soft focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
    <Icon name="search" className="h-4 w-4 shrink-0 text-neutral-400" />
    <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel ?? placeholder} disabled={disabled}
      className="w-full border-none bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:font-medium placeholder:text-neutral-400" />
    {value && <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange('')} disabled={disabled}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 disabled:opacity-50">
      <Icon name="x" className="h-3 w-3" />
    </button>}
  </div>
}
