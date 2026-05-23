import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotDetailView } from '../types/view-models'

interface SubetapasBarProps {
  detail: ViveroLotDetailView
}

export default function SubetapasBar({ detail }: SubetapasBarProps) {
  const currentSub = detail.subetapaActual
  if (!currentSub) return null

  const detailExtended = detail as ViveroLotDetailView & { 
    diasSombra?: number; 
    diasMediaSombra?: number; 
    diasSolDirecto?: number; 
  };
  const diasSombra = detailExtended.diasSombra ?? 21;
  const diasMediaSombra = detailExtended.diasMediaSombra ?? 24;
  const diasSolDirecto = detailExtended.diasSolDirecto ?? 35;
  const totalDias = diasSombra + diasMediaSombra + diasSolDirecto;

  const subetapasData = [
    { key: 'SOMBRA', label: 'Sombra', icon: 'shield', dias: diasSombra, color: 'bg-amber-300' },
    { key: 'MEDIA_SOMBRA', label: 'Media sombra', icon: 'sun', dias: diasMediaSombra, color: 'bg-amber-400' },
    { key: 'SOL_DIRECTO', label: 'Sol directo', icon: 'sunny', dias: diasSolDirecto, color: 'bg-amber-500' },
  ]

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

      {/* Barra superior segmentada */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full mb-4">
        {subetapasData.map((s) => (
          <div 
            key={`bar-${s.key}`} 
            style={{ width: `${(s.dias / totalDias) * 100}%` }} 
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