import Icon from '../../../components/Icon';
import { PageHeader } from '../../../components/ui';
import type { ViveroLotDetailView } from '../types/view-models';

interface HeroHeaderProps {
  detail: ViveroLotDetailView;
  customImage?: string | null;
}

/**
 * Adaptador de dominio: mapea el lote a la primitiva `PageHeader variant="hero"`
 * (ver FRONTEND_UI_STANDARD.md §4.5). Los slots badge/chips/metric reciben el
 * contenido específico del vivero; el botón volver y el fondo `brand-950` los
 * aporta la primitiva.
 */
export default function HeroHeader({ detail, customImage }: HeroHeaderProps) {
  const isDescartePreEmbolsado = detail.motivoCierre === 'DESCARTE_PRE_EMBOLSADO';
  const disponibles = isDescartePreEmbolsado
    ? null
    : detail.saldoVivoActual ?? detail.plantasVivasIniciales ?? 0;

  const isFinalizado = detail.estadoLote === 'FINALIZADO';
  const motivoCierreLabel = isDescartePreEmbolsado
    ? 'Descarte pre-embolsado'
    : detail.motivoCierre;

  return (
    <PageHeader
      variant="hero"
      eyebrow={`LOTE ${detail.codigo}`}
      title={detail.especie}
      subtitle={detail.nombreCientifico}
      media={detail.plantaImagenUrl ? customImage || detail.plantaImagenUrl : null}
      badge={
        <div
          className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md ${isFinalizado ? 'bg-white text-brand-950' : 'bg-success-400/20 text-success-50 ring-1 ring-success-200/50'}`}
        >
          VIVERO · {detail.estadoLote || 'ACTIVO'}
        </div>
      }
      chips={
        <>
          {detail.viveroNombre && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black tracking-widest backdrop-blur-md ring-1 ring-white/20">
              <Icon name="user" className="h-3 w-3 text-white/80" /> {detail.viveroNombre}
            </span>
          )}

          {detail.subetapaActual && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[9px] font-black tracking-widest text-amber-50 backdrop-blur-md ring-1 ring-amber-300/30">
              <Icon name="sun" className="h-3 w-3 text-amber-300" /> {detail.subetapaActual.replace('_', ' ')}
            </span>
          )}

          {isFinalizado && detail.motivoCierre && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-black tracking-widest text-brand-950 shadow-sm">
              <Icon name={isDescartePreEmbolsado ? 'trash' : 'truck'} className="h-3 w-3" /> {motivoCierreLabel}
            </span>
          )}
        </>
      }
      metric={{
        label: 'Saldo Vivo',
        value: disponibles ?? 'N/A',
        caption: isDescartePreEmbolsado ? 'No nació saldo vivo' : 'Plantas · Unidad',
      }}
    />
  );
}
