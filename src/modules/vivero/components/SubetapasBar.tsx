import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models'

export default function SubetapasBar({ events }: { detail: ViveroLotDetailView; events: ViveroLotEventView[] }) {
  const seguimientos = events.filter(event => event.kind === 'ADAPTABILIDAD')
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
      <h3 className="text-sm font-extrabold text-brand-950">Recorrido de adaptabilidad</h3>
      <p className="mt-1 text-xs text-neutral-500">Seguimientos registrados. Admiten saltos y repeticiones; no cambian el saldo.</p>
      {seguimientos.length === 0 ? <p className="mt-3 text-sm text-neutral-500">Sin registro</p> : (
        <ol className="mt-3 space-y-2">
          {seguimientos.map(event => <li key={event.id} className="flex justify-between gap-3 rounded-2xl bg-brand-50 p-3 text-xs font-bold text-brand-800">
            <span>{event.subetapa?.replaceAll('_', ' ') ?? 'Subetapa no registrada'}</span><span>{event.fecha}</span>
          </li>)}
        </ol>
      )}
    </section>
  )
}
