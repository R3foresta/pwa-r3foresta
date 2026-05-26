import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/Icon'
import type { ViveroLotDetailView } from '../types/view-models'

interface OrigenCardProps {
  detail: ViveroLotDetailView
}

export default function OrigenCard({ detail }: OrigenCardProps) {
  const navigate = useNavigate()

  // Normalización de la unidad de medida según el estándar del proyecto
  const formatUnidad = (u: string) => (u.toUpperCase() === 'G' ? 'gr' : u.toLowerCase())

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md">
      <header className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="leaf" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Lote de Origen</p>
            <h3 className="text-sm font-black text-[#002b15] mt-1">{detail.recoleccionCodigo}</h3>
          </div>
        </div>
        
        {/* FIX: Redirección usando el ID numérico real mapeado */}
        <button
          type="button"
          onClick={() => navigate(`/app/collections/${detail.recoleccionId}`)}
          className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-600"
        >
          Ver ficha <Icon name="chevron-right" className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="space-y-3.5 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Material biológico</p>
            <p className="font-extrabold text-[#002b15] capitalize mt-0.5">
              {detail.recoleccionTipoMaterial?.toLowerCase() || 'No especificado'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cantidad recolectada</p>
            <p className="font-extrabold text-[#002b15] mt-0.5">
              {detail.cantidadInicialEnProceso} <span className="text-xs font-bold text-slate-400">{formatUnidad(detail.unidadMedidaInicial)}</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Comunidad de procedencia</p>
            <p className="font-bold text-slate-700 truncate mt-0.5">
              {detail.nombreComunidadOrigen || 'No registrada'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha operativa</p>
            <p className="font-bold text-slate-700 mt-0.5">
              {detail.recoleccionFecha ? new Date(detail.recoleccionFecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/D'}
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-50 pt-2.5 mt-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registrado por</p>
          <p className="text-xs font-bold text-slate-600 mt-0.5 truncate">{detail.responsableNombre}</p>
        </div>
      </div>
    </section>
  )
}