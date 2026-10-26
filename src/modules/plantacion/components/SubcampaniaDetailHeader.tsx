import type { ReactNode } from 'react'
import plantacionHero from '../../../assets/home/plantacion.webp'
import Icon from '../../../components/Icon'
import type { EstadoSubcampania } from '../types/contracts'

type Props = {
  nombre: string
  estado: EstadoSubcampania
  eyebrow?: string
  fechas?: string
  zona?: string | null
  plantados?: number | null
  meta?: number | null
  porcentaje?: number | null
  onBack: () => void
  onMore?: () => void
  badges?: ReactNode
  tipoLabel?: string | null
  children?: ReactNode
}

const stateTones: Record<EstadoSubcampania, string> = {
  BORRADOR: 'bg-warning-400/20 text-warning-100 ring-warning-300/40',
  ACTIVA: 'bg-success-400/20 text-success-100 ring-success-300/40',
  COMPLETADA: 'bg-white/15 text-white ring-white/20',
  FINALIZADA_PARCIAL: 'bg-white/15 text-white ring-white/20',
  PAUSADA: 'bg-warning-400/20 text-warning-100 ring-warning-300/40',
  CANCELADA: 'bg-danger-400/20 text-danger-100 ring-danger-300/40',
}

/** Encabezado original del detalle. Compartir presentación no amplía lecturas ni permisos. */
export default function SubcampaniaDetailHeader({ nombre, estado, eyebrow, fechas, zona, plantados, meta, porcentaje, onBack, onMore, badges, tipoLabel, children }: Props) {
  const format = (value: number) => value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
  return <header className="relative overflow-hidden rounded-b-3xl bg-brand-700 text-white shadow-soft">
    <img src={plantacionHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-brand-700/95" />
    <div className="relative px-5 pb-5 pt-5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25" aria-label="Volver"><Icon name="arrow-left" className="h-5 w-5" /></button>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ${stateTones[estado]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{estado.replace(/_/g, ' ')}</span>
          {badges}
          {onMore && <button type="button" onClick={onMore} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25" aria-label="Más opciones"><Icon name="ellipsis" className="h-5 w-5" /></button>}
        </div>
      </div>
      {eyebrow && <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.24em] text-white/85">{eyebrow}</p>}
      <h1 className="mt-0.5 break-words text-[26px] font-extrabold leading-[1.1] tracking-tight">{nombre}</h1>
      {tipoLabel && <span className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white ring-1 ring-white/20">{tipoLabel}</span>}
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold text-white/80">
        <span className="inline-flex items-center gap-1.5"><Icon name="date" className="h-3.5 w-3.5" />{fechas ?? 'Fechas no disponibles'}</span>
        {zona && <span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-3.5 w-3.5" />{zona}</span>}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Plantados / meta</p>
          <p aria-label={`Plantados: ${plantados == null ? 'No disponible' : format(plantados)}. Meta: ${meta == null ? 'No disponible' : format(meta)}`} className="mt-0.5 text-[40px] font-extrabold leading-none tracking-tight tabular-nums">{plantados == null ? '—' : format(plantados)}<span className="ml-1 text-base font-extrabold text-white/65">/ {meta == null ? '—' : format(meta)}</span></p>
        </div>
        <div className="flex-shrink-0 text-right"><p className="text-[10px] font-bold text-white/70">Avance</p><p className="text-2xl font-extrabold tabular-nums">{porcentaje == null ? '—' : `${format(porcentaje)}%`}</p></div>
      </div>
      {porcentaje != null && <div role="progressbar" aria-label={`Avance inicial de ${nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, porcentaje))} aria-valuetext={`${format(porcentaje)}%`} className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-success-300" style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }} /></div>}
      {children}
    </div>
  </header>
}
