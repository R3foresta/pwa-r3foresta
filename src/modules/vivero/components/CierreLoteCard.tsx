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
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cierre del lote</p>
        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[9px] font-black tracking-widest text-white uppercase">
          {detail.estadoLote}
        </span>
      </div>

      <div className={`rounded-3xl p-4 ring-1 flex items-center gap-4 ${
        isDescartePreEmbolsado ? 'bg-danger-50/70 ring-danger-100' : 'bg-info-50 ring-info-100'
      }`}>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ${
          isDescartePreEmbolsado ? 'text-danger-600 ring-danger-200' : 'text-info-600 ring-info-200'
        }`}>
          <Icon name={isDescartePreEmbolsado ? 'trash' : 'truck'} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                isDescartePreEmbolsado ? 'text-danger-600/70' : 'text-info-600/70'
              }`}>Motivo</p>
              <p className={`text-[13px] font-black leading-tight ${
                isDescartePreEmbolsado ? 'text-danger-800' : 'text-info-800'
              }`}>
                {formatMotivoCierre(detail.motivoCierre)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                isDescartePreEmbolsado ? 'text-danger-600/70' : 'text-info-600/70'
              }`}>Fecha Cierre</p>
              <p className={`text-xs font-black ${
                isDescartePreEmbolsado ? 'text-danger-800' : 'text-info-800'
              }`}>{fechaCierre}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
         <div className="rounded-2xl bg-white p-3 ring-1 ring-neutral-200 flex flex-col justify-end items-center h-full text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1 leading-tight">Días<br/>Activo</p>
            <p className="text-[22px] font-black text-brand-950 leading-none mt-1">{detail.diasDesdeInicio || 0}</p>
         </div>
         <div className={`rounded-2xl p-3 ring-1 flex flex-col justify-end items-center h-full text-center ${
            isDescartePreEmbolsado ? 'bg-warning-50/70 ring-warning-100' : 'bg-info-50/60 ring-info-100'
          }`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 leading-tight ${
              isDescartePreEmbolsado ? 'text-warning-700' : 'text-info-600'
            }`}>
              {isDescartePreEmbolsado ? 'Material' : 'Despachadas'}
            </p>
            <p className={`text-[22px] font-black leading-none mt-1 ${
              isDescartePreEmbolsado ? 'text-warning-800' : 'text-info-700'
            }`}>
              {isDescartePreEmbolsado ? detail.cantidadInicialEnProceso : stats.despachadas}
            </p>
            {isDescartePreEmbolsado && (
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-warning-700">
                {formatUnidadCanonicaDisplay(
                  detail.unidadMedidaInicial,
                  detail.cantidadInicialEnProceso,
                )}
              </p>
            )}
         </div>
         <div className="rounded-2xl bg-danger-50/60 p-3 ring-1 ring-danger-100 flex flex-col justify-end items-center h-full text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-danger-600 mb-1 leading-tight">
              {isDescartePreEmbolsado ? 'Saldo vivo' : 'Pérdidas'}
            </p>
            <p className="text-[22px] font-black text-danger-700 leading-none mt-1">
              {isDescartePreEmbolsado ? 'N/A' : stats.mermas}
            </p>
         </div>
      </div>
    </section>
  );
}
