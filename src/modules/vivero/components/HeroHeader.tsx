import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

interface Props {
  detail: ViveroLotDetailView;
}

export default function HeroHeader({ detail }: Props) {
  const navigate = useNavigate();
  const disponibles = detail.saldoVivoActual ?? detail.plantasVivasIniciales ?? 0;
  
  const isFinalizado = detail.estadoLote === 'FINALIZADO';

  return (
    <header className="relative h-[300px] w-full overflow-hidden bg-[#002b15]">
      {detail.plantaImagenUrl ? (
        <img src={detail.plantaImagenUrl} alt={detail.especie} className="h-full w-full object-cover opacity-50" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#002b15]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#002b15] via-[#002b15]/60 to-transparent" />
      
      {/* Botón Volver */}
      <button onClick={() => navigate(-1)} className="absolute left-4 top-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition">
        <Icon name="arrow-left" className="h-5 w-5" />
      </button>

      {/* Píldora Superior Derecha (ESTADO) */}
      <div className={`absolute right-4 top-10 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md ${isFinalizado ? 'bg-white text-[#002b15]' : 'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/50'}`}>
        VIVERO · {detail.estadoLote || 'ACTIVO'}
      </div>

      <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between text-white">
        <div className="flex-1 min-w-0 pr-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            LOTE {detail.codigo}
          </span>
          <h1 className="text-[32px] font-black mt-0.5 leading-none tracking-tight truncate">
            {detail.especie}
          </h1>
          <p className="text-sm italic text-white/80 mt-1 truncate">
            {detail.nombreCientifico}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-black tracking-widest text-[#002b15] shadow-sm">
                <Icon name="truck" className="h-3 w-3" /> {detail.motivoCierre}
              </span>
            )}
          </div>
        </div>

        {/* Cifra de Saldo */}
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] uppercase font-black tracking-widest text-white/70">Saldo Vivo</p>
          <p className="text-[44px] font-black leading-none tracking-tighter mt-0.5">{disponibles}</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/60 mt-1">Plantas · Unidad</p>
        </div>
      </div>
    </header>
  );
}
