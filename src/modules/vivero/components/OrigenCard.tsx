import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

export default function OrigenCard({ detail }: { detail: ViveroLotDetailView }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <header className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Origen del lote</p>
      </header>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon name="leaf" className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-brand-800 leading-tight">{detail.recoleccionCodigo}</p>
          <p className="text-sm font-bold text-brand-700 truncate">{detail.especie}</p>
          <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3.5 w-3.5" /> {detail.responsableNombre}</span>
          </p>
        </div>
      </div>
    </section>
  );
}