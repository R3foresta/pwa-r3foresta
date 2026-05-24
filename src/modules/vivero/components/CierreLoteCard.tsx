import Icon from '../../../components/Icon';
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models';

export default function CierreLoteCard({ detail, events }: { detail: ViveroLotDetailView, events: ViveroLotEventView[] }) {
  // Cálculos reales a partir de los eventos
  const despachadas = events.filter(e => e.kind === 'DESPACHO').reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  const perdidas = events.filter(e => e.kind === 'MERMA').reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  
  // Buscar evento de cierre o último evento
  const ultimoEvento = events[events.length - 1];
  const fechaCierre = ultimoEvento ? ultimoEvento.fecha : detail.updatedAt;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cierre del lote</p>
        <span className="rounded-full bg-[#1e293b] px-2.5 py-1 text-[9px] font-black tracking-widest text-white uppercase">
          {detail.estadoLote}
        </span>
      </div>

      <div className="rounded-3xl bg-[#f8fafe] p-4 ring-1 ring-blue-100 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-blue-200 shadow-sm">
          <Icon name="truck" className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70 mb-0.5">Motivo</p>
              <p className="text-[13px] font-black text-blue-800 leading-tight">
                {detail.motivoCierre?.replace('_', ' ') || 'No especificado'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-600/70 mb-0.5">Fecha Cierre</p>
              <p className="text-xs font-black text-blue-800">{fechaCierre}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
         <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 text-center leading-tight">Días<br/>Activo</p>
            <p className="text-[22px] font-black text-[#002b15] leading-none mt-1">{detail.diasDesdeInicio || 0}</p>
         </div>
         <div className="rounded-2xl bg-blue-50/60 p-3 ring-1 ring-blue-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1 text-center leading-tight"><br/>Despachadas</p>
            <p className="text-[22px] font-black text-blue-700 leading-none mt-1">{despachadas}</p>
         </div>
         <div className="rounded-2xl bg-red-50/60 p-3 ring-1 ring-red-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1 text-center leading-tight"><br/>Pérdidas</p>
            <p className="text-[22px] font-black text-red-700 leading-none mt-1">{perdidas}</p>
         </div>
      </div>
    </section>
  );
}