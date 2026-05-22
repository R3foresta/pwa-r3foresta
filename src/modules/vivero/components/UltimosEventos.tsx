import Icon from '../../../components/Icon'
import type { ViveroLotEventView } from '../types/view-models'

export default function UltimosEventos({ events, onJumpHistorial }: { events: ViveroLotEventView[], onJumpHistorial: () => void }) {
  const recent = [...events].reverse().slice(0, 3)

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Últimos eventos</p>
          <h3 className="mt-0.5 text-base font-extrabold text-brand-800">Cronología reciente</h3>
        </div>
        <button onClick={onJumpHistorial} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-extrabold text-brand-700 hover:bg-brand-100 transition">
          Ver historial
          <Icon name="chevron-right" className="h-3 w-3" />
        </button>
      </header>

      {recent.length === 0 ? (
        <p className="text-sm font-semibold text-slate-400 mt-4 text-center">No hay eventos registrados.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <Icon name="activity" className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-[9.5px] font-extrabold ring-1 ring-brand-100">{e.kind}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{e.fecha}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] font-extrabold text-brand-800 truncate leading-tight">{e.label}</p>
                {e.observacion && <p className="text-[11px] font-medium text-slate-500 truncate">{e.observacion}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}