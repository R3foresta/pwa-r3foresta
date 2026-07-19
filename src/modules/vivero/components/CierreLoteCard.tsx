import Icon from '../../../components/Icon';
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad';
import type { ViveroLotDetailView, ViveroLotEventView } from '../types/view-models';

interface CierreLoteCardProps {
  detail: ViveroLotDetailView;
  events: ViveroLotEventView[];
  stats: { despachadas: number; mermas: number };
}

export default function CierreLoteCard({ detail, events, stats }: CierreLoteCardProps) {

  const ultimoEvento = events[events.length - 1];
  const fechaCierre = ultimoEvento ? ultimoEvento.fecha : detail.updatedAt;
  const isDescartePreEmbolsado = detail.motivoCierre === 'DESCARTE_PRE_EMBOLSADO';

  const formatMotivoCierre = (motivo: string | null | undefined) => {
    if (!motivo) return 'No especificado';
    const dic: Record<string, string> = {
      'DESPACHO_TOTAL': 'Despacho total',
      'PERDIDA_TOTAL': 'Pérdida total',
      'MIXTO': 'Cierre mixto',
      'DESCARTE_PRE_EMBOLSADO': 'Descarte pre-embolsado'
    };
    return dic[motivo] || motivo.replaceAll('_', ' ');
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cierre del lote</p>
        <span className="rounded-full bg-[#1e293b] px-2.5 py-1 text-[9px] font-black tracking-widest text-white uppercase">
          {detail.estadoLote}
        </span>
      </div>

      <div className={`rounded-3xl p-4 ring-1 flex items-center gap-4 ${
        isDescartePreEmbolsado ? 'bg-red-50/70 ring-red-100' : 'bg-[#f8fafe] ring-blue-100'
      }`}>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ${
          isDescartePreEmbolsado ? 'text-red-600 ring-red-200' : 'text-blue-600 ring-blue-200'
        }`}>
          <Icon name={isDescartePreEmbolsado ? 'trash' : 'truck'} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                isDescartePreEmbolsado ? 'text-red-600/70' : 'text-blue-600/70'
              }`}>Motivo</p>
              <p className={`text-[13px] font-black leading-tight ${
                isDescartePreEmbolsado ? 'text-red-800' : 'text-blue-800'
              }`}>
                {formatMotivoCierre(detail.motivoCierre)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                isDescartePreEmbolsado ? 'text-red-600/70' : 'text-blue-600/70'
              }`}>Fecha Cierre</p>
              <p className={`text-xs font-black ${
                isDescartePreEmbolsado ? 'text-red-800' : 'text-blue-800'
              }`}>{fechaCierre}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
         <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 flex flex-col justify-end items-center h-full text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-tight">Días<br/>Activo</p>
            <p className="text-[22px] font-black text-[#002b15] leading-none mt-1">{detail.diasDesdeInicio || 0}</p>
         </div>
         <div className={`rounded-2xl p-3 ring-1 flex flex-col justify-end items-center h-full text-center ${
            isDescartePreEmbolsado ? 'bg-amber-50/70 ring-amber-100' : 'bg-blue-50/60 ring-blue-100'
          }`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 leading-tight ${
              isDescartePreEmbolsado ? 'text-amber-700' : 'text-blue-600'
            }`}>
              {isDescartePreEmbolsado ? 'Material' : 'Despachadas'}
            </p>
            <p className={`text-[22px] font-black leading-none mt-1 ${
              isDescartePreEmbolsado ? 'text-amber-800' : 'text-blue-700'
            }`}>
              {isDescartePreEmbolsado ? detail.cantidadInicialEnProceso : stats.despachadas}
            </p>
            {isDescartePreEmbolsado && (
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-amber-700">
                {formatUnidadCanonicaDisplay(
                  detail.unidadMedidaInicial,
                  detail.cantidadInicialEnProceso,
                )}
              </p>
            )}
         </div>
         <div className="rounded-2xl bg-red-50/60 p-3 ring-1 ring-red-100 flex flex-col justify-end items-center h-full text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600 mb-1 leading-tight">
              {isDescartePreEmbolsado ? 'Saldo vivo' : 'Pérdidas'}
            </p>
            <p className="text-[22px] font-black text-red-700 leading-none mt-1">
              {isDescartePreEmbolsado ? 'N/A' : stats.mermas}
            </p>
         </div>
      </div>
    </section>
  );
}
