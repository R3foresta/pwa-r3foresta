import Icon from '../../../components/Icon'
import type { ViveroLotDetailView } from '../types/view-models'

interface SubetapasBarProps {
  detail: ViveroLotDetailView
}

export default function SubetapasBar({ detail }: SubetapasBarProps) {
  const currentSub = detail.subetapaActual
  if (!currentSub) return null

  const subetapasData = [
    { key: 'SOMBRA', label: 'Sombra', icon: 'shield' as const, color: 'bg-amber-300' },
    { key: 'MEDIA_SOMBRA', label: 'Media Sombra', icon: 'sun' as const, color: 'bg-amber-400' },
    { key: 'SOL_DIRECTO', label: 'Sol Directo', icon: 'planting' as const, color: 'bg-amber-500' },
  ]

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Aclimatación</p>
          <h3 className="mt-0.5 text-sm font-bold text-brand-800">Subetapa de adaptabilidad</h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
          {currentSub.replace('_', ' ')}
        </span>
      </header>

      <ul className="mt-4 space-y-3">
        {subetapasData.map((s) => {
          const isCurrent = s.key === currentSub
          return (
            <li key={s.key} className={`flex items-center gap-2.5 p-1 rounded-xl transition-all ${isCurrent ? 'bg-amber-50/40 ring-1 ring-amber-100/50' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${isCurrent ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white ring-slate-200 text-slate-500'}`}>
                <Icon name={s.icon as never} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-extrabold ${isCurrent ? 'text-brand-800' : 'text-slate-600'}`}>{s.label}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${s.color} transition-all`} style={{ width: isCurrent ? '100%' : '0%' }} />
                </div>
              </div>
              {isCurrent && (
                <div className="text-right shrink-0 px-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-600">Activo</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}