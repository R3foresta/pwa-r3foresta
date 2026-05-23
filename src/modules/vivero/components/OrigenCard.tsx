import Icon from '../../../components/Icon';
import type { ViveroLotDetailView } from '../types/view-models';

export default function OrigenCard({ detail }: { detail: ViveroLotDetailView }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      {/* Detalle visual de fondo (Opcional, le da el toque de la app) */}
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        <Icon name="leaf" className="h-32 w-32 text-brand-500" />
      </div>

      <header className="relative z-10 mb-4 flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-500">
          Origen del lote
        </p>
        <span className="inline-flex items-center rounded-md bg-[#eef2ed] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-brand-800 ring-1 ring-inset ring-brand-600/20">
          {detail.recoleccionTipoMaterial}
        </span>
      </header>

      <div className="relative z-10 flex items-start gap-4">
        {/* Ícono principal */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon name="box" className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xl font-black leading-none text-brand-900">
            {detail.recoleccionCodigo}
          </p>
          <p className="mt-1 text-sm font-bold text-brand-600 truncate">
            {detail.especie}
          </p>

          {/* Grilla de datos extra */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                Responsable
              </p>
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Icon name="user" className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{detail.responsableNombre}</span>
              </p>
            </div>
            <div>
              <p className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                Cantidad Inicial
              </p>
              <p className="text-xs font-bold text-slate-600">
                {detail.cantidadInicialEnProceso} {detail.unidadMedidaInicial?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}