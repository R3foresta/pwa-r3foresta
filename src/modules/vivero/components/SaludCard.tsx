import SurvivalBar from './SurvivalBar'
import type { ViveroLotDetailView } from '../types/view-models'

interface SaludCardProps {
  detail: ViveroLotDetailView
}

export default function SaludCard({ detail }: SaludCardProps) {
  const plantasIniciales = detail.plantasVivasIniciales ?? 0
  const saldoVivo = detail.saldoVivoActual ?? plantasIniciales
  const hasEmbolsado = detail.plantasVivasIniciales !== null
  
  const muertas = hasEmbolsado ? Math.max(0, plantasIniciales - saldoVivo) : 0
  const supervivencia = plantasIniciales > 0 
    ? Math.round((saldoVivo / plantasIniciales) * 100) 
    : 0

  if (!hasEmbolsado) {
    return (
      <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold text-brand-700">Material en proceso</p>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
            Pendiente embolsado
          </span>
        </div>
        <p className="text-xs font-semibold text-brand-600 bg-brand-50/60 px-3 py-2.5 rounded-2xl">
          El conteo oficial de plantas vivas se inaugura cuando se registre el embolsado.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Salud del lote</p>
          <h3 className="mt-0.5 text-sm font-bold text-brand-800">Supervivencia y composición actual</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Edad</p>
          <p className="text-sm font-extrabold text-brand-800 leading-none mt-0.5">
            {detail.diasDesdeInicio}<span className="text-xs font-bold text-slate-500 ml-0.5">días</span>
          </p>
        </div>
      </header>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Supervivencia</p>
          <p className="text-4xl font-extrabold text-brand-700 leading-none tracking-tight">{supervivencia}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Vivas hoy</p>
          <p className="text-xl font-extrabold text-brand-800 leading-none">
            {saldoVivo.toLocaleString('es-BO')}
            <span className="text-xs font-bold text-slate-400"> / {plantasIniciales.toLocaleString('es-BO')}</span>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SurvivalBar alive={saldoVivo} initial={plantasIniciales} showLabel={false} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-brand-700">Disponibles · {detail.stockVivoActual ?? saldoVivo}</span></span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-700">Mermas · {muertas}</span></span>
      </div>
    </section>
  )
}