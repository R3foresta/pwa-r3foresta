import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import type { ViveroLotEventView } from '../types/view-models'

interface EventCardProps {
  event: ViveroLotEventView
  isLast: boolean
}

export default function EventCard({ event, isLast }: EventCardProps) {
  // Configuración de estilos visuales e iconos por cada tipo de acción operativa
  const configMap: Record<string, { icon: IconName; bg: string; text: string; border: string }> = {
    INICIO: { icon: 'package', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    EMBOLSADO: { icon: 'leaf', bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200' },
    MERMA: { icon: 'trash', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    ADAPTABILIDAD: { icon: 'sunny', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    DESPACHO: { icon: 'truck', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    CIERRE_AUTOMATICO: { icon: 'check', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  }

  const theme = configMap[event.kind] || configMap.INICIO

  return (
    <div className="flex gap-x-3">
      {/* Columna Izquierda: Línea y Burbuja del Indicador Cronológico */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white ${theme.border} ${theme.text} shadow-sm z-10`}>
          <Icon name={theme.icon} className="h-4.5 w-4.5" />
        </div>
        {!isLast && <div className="w-0.5 bg-slate-200 grow my-1" />}
      </div>

      {/* Columna Derecha: Contenido de la Transacción */}
      <div className="min-w-0 flex-1 bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm mb-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide uppercase border ${theme.bg} ${theme.text} ${theme.border}`}>
            {event.kind.replace('_', ' ')}
          </span>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {event.fecha}
          </span>
        </div>
        
        <h4 className="mt-1.5 text-xs font-black text-brand-800 leading-tight">
          {event.label}
        </h4>

        {event.observacion && (
          <p className="mt-1 text-[11px] font-medium text-slate-500 leading-normal line-clamp-2">
            {event.observacion}
          </p>
        )}

        {/* Pequeño detalle de cantidades transaccionadas si aplican */}
        {event.cantidad !== undefined && event.cantidad !== null && (
          <div className="mt-2 text-[10px] font-bold text-slate-400">
            Cantidad: <span className="text-brand-700 font-extrabold">{event.cantidad}</span> 
            {event.saldoDespues !== undefined && ` · Saldo: ${event.saldoDespues}`}
          </div>
        )}
      </div>
    </div>
  )
}