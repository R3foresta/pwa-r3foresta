import Icon from '../../../components/Icon'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

interface SaludCardProps {
  detail: ViveroLotDetailView;
  events: ViveroLotEventView[]; 
  stats: {
    plantasIniciales: number;
    hasEmbolsado: boolean;
    despachadas: number;
    mermas: number;
    disponibles: number;
    vivasHoy: number;
    supervivencia: number;
    pctDisponibles: number;
    pctDespachadas: number;
    pctMermas: number;
    diasDesdeUltimaMerma: number | null;
  };
}

export default function SaludCard({ detail, stats }: SaludCardProps) {
  
  const { 
    plantasIniciales, hasEmbolsado, despachadas, mermas, disponibles, 
    vivasHoy, supervivencia, pctDisponibles, pctDespachadas, pctMermas, diasDesdeUltimaMerma 
  } = stats;

  if (!hasEmbolsado) {
    return (
      <div className="rounded-3xl bg-white px-4 py-4 shadow-soft ring-1 ring-black/5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold text-[#002b15]">Material en proceso</p>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 ring-1 ring-amber-200">
            Pendiente embolsado
          </span>
        </div>
        <p className="text-xs font-semibold text-brand-600 bg-[#f4f7f2] px-3 py-2.5 rounded-2xl ring-1 ring-brand-100">
          El conteo oficial de plantas vivas se inaugura cuando se registre el embolsado.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-brand-700">Salud del lote</p>
          <h3 className="mt-0.5 text-base font-extrabold text-[#002b15] leading-tight">Supervivencia y<br/>composición actual</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">En vivero</p>
          <p className="text-sm font-black text-[#002b15] leading-none mt-0.5">
            {detail.diasDesdeInicio ?? 0} <span className="font-bold text-slate-500">días</span>
          </p>
        </div>
      </header>

      <div className="mt-5 flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15]">Supervivencia</p>
          <p className="text-5xl font-black text-[#002b15] leading-none tracking-tighter mt-1">{supervivencia}%</p>
        </div>
        <div className="text-right pb-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vivas hoy</p>
          <p className="text-2xl font-black text-[#002b15] leading-none mt-1">
            {vivasHoy.toLocaleString('es-BO')} <span className="text-sm font-bold text-slate-400">/ {plantasIniciales.toLocaleString('es-BO')}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div style={{ width: `${pctDisponibles}%` }} className="bg-brand-700 transition-all duration-500" />
        <div style={{ width: `${pctDespachadas}%` }} className="bg-blue-500 transition-all duration-500" />
        <div style={{ width: `${pctMermas}%` }} className="bg-red-500 transition-all duration-500" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-black tracking-wide">
        <span className="flex items-center gap-1.5 text-[#002b15]">
          <span className="h-2 w-2 rounded-full bg-brand-700" /> Disponibles · {disponibles}
        </span>
        <span className="flex items-center gap-1.5 text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Despachadas · {despachadas}
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Mermas · {mermas}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f4f7f2] px-3 py-2.5 ring-1 ring-brand-100/50">
        <Icon name="info" className="h-4 w-4 shrink-0 text-brand-600" />
        <p className="text-[10.5px] font-bold text-[#002b15] leading-snug">
          {diasDesdeUltimaMerma !== null ? `Última merma hace ${diasDesdeUltimaMerma} días.` : 'Sin mermas registradas.'} Subetapa actual: <span className="font-black">{detail.subetapaActual?.replace('_', ' ') || 'SOMBRA'}</span>.
        </p>
      </div>
    </section>
  )
}
