import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

interface SubetapasBarProps {
  detail: ViveroLotDetailView
  events: ViveroLotEventView[] 
}

export default function SubetapasBar({ detail, events }: SubetapasBarProps) {
  const currentSub = detail.subetapaActual
  if (!currentSub) return null

  const calcularDias = () => {
    const tEmbolsado = events.find(e => e.kind === 'EMBOLSADO')?.fechaIso || detail.fechaInicio;
    const tMediaSombra = events.find(e => e.kind === 'ADAPTABILIDAD' && e.subetapa === 'MEDIA_SOMBRA')?.fechaIso;
    const tSolDirecto = events.find(e => e.kind === 'ADAPTABILIDAD' && e.subetapa === 'SOL_DIRECTO')?.fechaIso;
    
    const cierre = events.find(e => e.kind === 'CIERRE_AUTOMATICO' || e.kind === 'DESPACHO');
    const today = new Date().toISOString().split('T')[0];
    const endRef = cierre ? cierre.fechaIso : (detail.estadoLote === 'FINALIZADO' ? detail.updatedAt : today);
    const diffDays = (start?: string, end?: string) => {
      if (!start || !end) return 0;
      const d1 = new Date(start).getTime();
      const d2 = new Date(end).getTime();
      return Math.max(0, Math.floor((d2 - d1) / 86400000));
    };

    const diasSombra = diffDays(tEmbolsado, tMediaSombra || tSolDirecto || endRef);
    const diasMediaSombra = tMediaSombra ? diffDays(tMediaSombra, tSolDirecto || endRef) : 0;
    const diasSolDirecto = tSolDirecto ? diffDays(tSolDirecto, endRef) : 0;

    return {
      diasSombra: Math.max(0, diasSombra),
      diasMediaSombra: Math.max(0, diasMediaSombra),
      diasSolDirecto: Math.max(0, diasSolDirecto),
    };
  };

  const { diasSombra, diasMediaSombra, diasSolDirecto } = calcularDias();
  const totalDias = diasSombra + diasMediaSombra + diasSolDirecto;

  const subetapasData = [
    { key: 'SOMBRA', label: 'Sombra', icon: 'shield', dias: diasSombra, color: 'bg-amber-300' },
    { key: 'MEDIA_SOMBRA', label: 'Media sombra', icon: 'sun', dias: diasMediaSombra, color: 'bg-amber-400' },
    { key: 'SOL_DIRECTO', label: 'Sol directo', icon: 'sunny', dias: diasSolDirecto, color: 'bg-amber-500' },
  ]

  const safeTotal = totalDias > 0 ? totalDias : 1;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <header className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-brand-700">Tiempo en subetapas</p>
          <h3 className="mt-0.5 text-[15px] font-extrabold text-[#002b15]">Recorrido de adaptabilidad</h3>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 pb-1">
          Total {totalDias}d
        </p>
      </header>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full mb-4">
        {subetapasData.map((s) => (
          <div 
            key={`bar-${s.key}`} 
            style={{ width: `${(s.dias / safeTotal) * 100}%` }} 
            className={`${s.color} transition-all duration-500`} 
          />
        ))}
      </div>

      <ul className="space-y-0">
        {subetapasData.map((s) => {
          const isCurrent = s.key === currentSub
          return (
            <li key={s.key} className="flex items-center gap-4 py-2 relative">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${isCurrent ? 'bg-amber-50 text-amber-600 ring-amber-300' : 'bg-white text-amber-700/60 ring-amber-200/50'}`}>
                <Icon name={s.icon as IconName} className="h-5 w-5" />
              </div>
              
              <div className="flex-1 flex items-center justify-between border-b border-slate-50 pb-2 pt-2">
                <p className="text-[13px] font-black text-[#002b15]">{s.label}</p>
                <div className="text-right">
                  <p className="text-[15px] font-black text-[#002b15] leading-none">
                    {s.dias}<span className="text-xs font-bold text-slate-500">d</span>
                  </p>
                  {isCurrent && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mt-1 absolute right-0 bottom-[-4px]">
                      Actual
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
