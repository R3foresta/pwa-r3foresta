import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotEventView, ViveroEventPhoto } from '../types/view-models'

interface EventCardProps {
  event: ViveroLotEventView
  isLast: boolean
  onOpenGallery?: (event: ViveroLotEventView) => void
}

export default function EventCard({ event, isLast, onOpenGallery }: EventCardProps) {
  const configMap: Record<string, { icon: IconName; bg: string; text: string; ring: string }> = {
    INICIO: { icon: 'leaf', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    EMBOLSADO: { icon: 'box', bg: 'bg-[#f4f7f2]', text: 'text-[#002b15]', ring: 'ring-[#002b15]/10' },
    MERMA: { icon: 'loss', bg: 'bg-red-50/80', text: 'text-red-700', ring: 'ring-red-200' },
    ADAPTABILIDAD: { icon: 'sun', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
    DESPACHO: { icon: 'truck', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' },
    CIERRE_AUTOMATICO: { icon: 'flag', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200' },
  }

  const theme = configMap[event.kind] || configMap.INICIO

  const imagenes = event.fotos && event.fotos.length > 0 
  ? event.fotos.map((f: ViveroEventPhoto) => ({ 
      id: f.id, 
      url: f.url, 
      titulo: f.titulo 
    }))
  : []

  return (
    <div className="flex gap-x-3">
      {/* Columna Izquierda: Línea y Burbuja */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-inset ${theme.ring} ${theme.text} shadow-sm z-10`}>
          <Icon name={theme.icon} className="h-5 w-5" />
        </div>
        {!isLast && <div className="w-[2px] bg-emerald-900/5 grow my-1" />}
      </div>

      {/* Columna Derecha: Tarjeta Principal */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="bg-white rounded-3xl ring-1 ring-slate-100 p-4 shadow-sm">
          
          {/* Header Común */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase ring-1 ring-inset ${theme.text} ${theme.ring} bg-white`}>
              {event.kind?.replaceAll('_', ' ')}
            </span>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {event.fecha} {event.hora ? `· ${event.hora}` : ''}
            </p>
          </div>
          
          <h3 className="text-xl font-extrabold text-[#002b15] leading-tight">
            {event.label}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Icon name="user" className="h-5 w-5 text-slate-400" />
            {event.responsableNombre}
          </p>

          {/* 1. Diseño Específico para INICIO */}
          {event.kind === 'INICIO' && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-1">Material Ingresado</p>
                  <p className="text-base font-black text-[#002b15]">{event.materialIngresado || `${event.cantidad || 0} G`}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-1">Sustrato</p>
                  <p className="text-sm font-bold text-[#002b15] leading-tight">{event.sustrato || 'Sustrato A · turba + perlita'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50/50 px-3 py-2.5 ring-1 ring-emerald-100">
                <Icon name="info" className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className="text-[11px] font-bold text-emerald-800 leading-tight">Aún no hay plantas vivas. El saldo nace en EMBOLSADO.</p>
              </div>
            </div>
          )}

          {/* Diseño Específico para EMBOLSADO */}
          {event.kind === 'EMBOLSADO' && (
            <div className="mt-4 rounded-2xl bg-brand-50 p-3 ring-1 ring-inset ring-brand-100">
              <p className="text-[9px] font-black uppercase tracking-widest text-brand-700">Nacen las plantas vivas</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-[#002b15]">{event.cantidad || 0}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[#002b15]/70">Unidad · saldo inicial del lote</p>
            </div>
          )}

          {/* 2. Diseño Específico para ADAPTABILIDAD */}
          {event.kind === 'ADAPTABILIDAD' && (
            <div className={`mt-4 flex items-center justify-between gap-2 rounded-2xl ${theme.bg} p-3 ring-1 ring-inset ${theme.ring}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ${theme.ring} ${theme.text}`}>
                  <Icon name="sun" className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Nueva Subetapa</p>
                  <p className={`text-base font-black ${theme.text}`}>{event.subetapa?.replace('_', ' ') || 'SOL DIRECTO'}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-slate-500 ring-1 ring-slate-200 shadow-sm">
                <Icon name="info" className="h-3 w-3" /> No afecta saldo
              </span>
            </div>
          )}

          {/* 3. Diseño Específico para MERMA (Con causa y saldo) */}
          {event.kind === 'MERMA' && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className={`flex-1 rounded-2xl p-3 ${theme.bg} ring-1 ring-inset ${theme.ring}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Pérdida</p>
                  <p className={`mt-0.5 text-3xl font-black tracking-tight ${theme.text}`}>-{event.cantidad || 0}</p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.text}/80`}>Unidad</p>
                </div>
                <div className="flex-1 rounded-2xl p-3 bg-white ring-1 ring-inset ring-slate-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Causa</p>
                  <p className="mt-0.5 text-base font-black text-[#002b15] capitalize">{event.causa?.toLowerCase().replace('_', ' ') || 'No especificada'}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{event.causa || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Diseño Específico para DESPACHO */}
          {event.kind === 'DESPACHO' && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <div className={`flex-1 rounded-2xl p-3 ${theme.bg} ring-1 ring-inset ${theme.ring}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Despachadas</p>
                  <p className={`mt-0.5 text-3xl font-black tracking-tight ${theme.text}`}>{event.cantidad || 0}</p>
                  <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.text}/80`}>Unidad</p>
                </div>
                <div className="flex-1 rounded-2xl p-3 bg-white ring-1 ring-inset ring-slate-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Destino</p>
                  <p className="mt-0.5 text-sm font-black text-[#002b15] leading-tight">{event.destino || 'Plantación propia'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Referencia</p>
                  <p className="text-xs font-bold text-[#002b15]">{event.referencia || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Comunidad</p>
                  <p className="text-xs font-bold text-[#002b15]">{event.comunidad || 'No especificada'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Componente "Saldo Antes -> Saldo Después" (Reutilizable para Merma y Despacho) */}
          {event.saldoAntes != null && event.saldoDespues != null && (
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <div className="text-center flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Saldo Antes</p>
                <p className="text-xl font-black text-slate-500">{event.saldoAntes}</p>
              </div>
              <div className="px-2">
                <Icon 
                  name="arrow-down" 
                  className={`h-4 w-4 ${event.kind === 'MERMA' ? 'text-red-500' : 'text-blue-500'}`} 
                />
              </div>
              <div className="text-center flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-0.5">Saldo Después</p>
                <p className="text-xl font-black text-[#002b15]">{event.saldoDespues}</p>
              </div>
            </div>
          )}

          {/* Galería de Evidencia Fotográfica */}
          {imagenes.length > 0 && (
            <button 
              onClick={() => onOpenGallery && onOpenGallery(event)}
              className="mt-3 w-full flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-slate-200 hover:bg-slate-50 transition text-left"
            >
              <div className="relative h-[60px] w-[88px] flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <img src={imagenes[0].url} alt={imagenes[0].titulo} className="h-full w-full object-cover" />
                {imagenes.length > 1 && (
                  <span className="absolute bottom-1 right-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-[#002b15] shadow-sm backdrop-blur-sm">
                    +{imagenes.length - 1}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>Evidencia</p>
                <p className="truncate text-sm font-bold text-[#002b15]">{imagenes[0].titulo || 'Registro fotográfico'}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">{imagenes.length} fotos · Toca para ver</p>
              </div>
              <Icon name="chevron-right" className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
            </button>
          )}

          {/* Observación Inferior */}
          {event.observacion && (
            <div className="mt-3 rounded-2xl bg-[#f4f7f2]/60 p-3.5 ring-1 ring-slate-200/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Observación</p>
              <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                {event.observacion}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
