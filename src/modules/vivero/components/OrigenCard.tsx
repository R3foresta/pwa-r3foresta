import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';
import { formatUnidadCanonicaDisplay } from '../../../utils/recoleccionUnidad'

interface OrigenCardProps {
  detail: ViveroLotDetailView;
}

export default function OrigenCard({ detail }: OrigenCardProps) {
  const navigate = useNavigate();
  const formatTipoMaterial = (tipo: string) => tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase().replace(/_/g, ' ') : 'No especificado';
  const formatFecha = (fechaStr: string | null) => fechaStr ? new Date(fechaStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/D';

  return (
    <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 hover:shadow-md transition-all">
      <header className="flex items-center justify-between">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
          Origen del lote
        </p>
        <button
          type="button"
          onClick={() => navigate(`/app/collections/${detail.recoleccionId}`)}
          className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-600"
        >
          Ver ficha <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="mt-2 flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon name="leaf" className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-brand-800 leading-tight">
            {detail.recoleccionCodigo}
          </p>
          <p className="text-sm font-bold text-brand-700 truncate">
            {detail.nombreComunidadOrigen || 'Comunidad no registrada'}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Icon name="date" className="h-3.5 w-3.5 text-slate-400" />
              {formatFecha(detail.recoleccionFecha)}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1">
              <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
              {detail.responsableNombre}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
            Tipo material
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-emerald-800">
            {formatTipoMaterial(detail.recoleccionTipoMaterial)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            Cantidad consumida
          </p>
          <p className="mt-0.5 text-sm font-extrabold text-brand-800">
            {detail.cantidadInicialEnProceso} {formatUnidadCanonicaDisplay(detail.unidadMedidaInicial)}
          </p>
        </div>
      </div>
    </section>
  );
}