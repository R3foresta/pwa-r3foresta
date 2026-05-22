import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

interface Props {
  detail: ViveroLotDetailView;
}

export default function HeroHeader({ detail }: Props) {
  const navigate = useNavigate();
  const disponibles = detail.saldoVivoActual ?? detail.plantasVivasIniciales ?? 0;

  return (
    <header className="relative h-64 w-full overflow-hidden bg-slate-900">
      {detail.plantaImagenUrl ? (
        <img src={detail.plantaImagenUrl} alt={detail.especie} className="h-full w-full object-cover opacity-60" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      
      <button onClick={() => navigate(-1)} className="absolute left-4 top-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white">
        <Icon name="arrow-left" className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-md">{detail.codigo}</span>
          <h1 className="text-2xl font-black mt-1">{detail.especie}</h1>
          <p className="text-xs italic text-slate-300">{detail.nombreCientifico}</p>
        </div>
        <div className="bg-brand-600 px-4 py-2 rounded-2xl text-center">
          <p className="text-[9px] uppercase font-bold text-brand-200">Individuos</p>
          <p className="text-xl font-black">{disponibles}</p>
        </div>
      </div>
    </header>
  );
}