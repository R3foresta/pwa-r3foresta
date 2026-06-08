import { useState, useEffect } from 'react'
import Icon from '../../../components/Icon'
import { LotesViveroService } from '../../../services/lotes-vivero.service'

type Props = {
  loteId: number
}

export default function ViveroLotAsignacionesTab({ loteId }: Props) {
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loteId) {
      setLoading(true)
      LotesViveroService.listAsignaciones(loteId)
        .then((data) => setAsignaciones(data))
        .catch((err) => console.error('Error loading assignments:', err))
        .finally(() => setLoading(false))
    }
  }, [loteId])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
        Cargando desglose de asignaciones...
      </div>
    )
  }

  if (asignaciones.length === 0) {
    return (
      <div className="rounded-3xl bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-black/5">
        No hay asignaciones activas registradas para este lote.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {asignaciones.map((asig) => {
        const isExhausted = asig.saldo_asignado_disponible === 0
        const hasMerma = asig.cantidad_mermada > 0
        const isReposicion = asig.proposito === 'REPOSICION'

        return (
          <div
            key={asig.id}
            className={`rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-100 transition-all ${
              isExhausted ? 'opacity-70 bg-slate-50/50' : 'hover:shadow-md'
            }`}
          >
            {/* Header / Top line */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase ring-1 ring-inset ${
                  isReposicion
                    ? 'text-amber-700 ring-amber-200 bg-amber-50/30'
                    : 'text-emerald-700 ring-emerald-200 bg-emerald-50/30'
                }`}
              >
                {isReposicion ? 'REPOSICION' : 'PLANTACION'}
              </span>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                {formatDate(asig.fecha_asignacion)}
              </p>
            </div>

            {/* Title */}
            <h3 className="text-xl font-extrabold text-[#002b15] leading-tight">
              {asig.subcampania_nombre || 'Subcampaña sin nombre'}
            </h3>

            {/* Creator / Responsable */}
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Icon name="user" className="h-4 w-4 text-slate-400" />
              <span>Registrado por: {asig.creador_nombre || 'Desconocido'}</span>
            </p>

            {/* Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-0.5">Campaña</p>
                <p className="text-sm font-bold text-[#002b15] leading-tight">
                  {asig.campania_nombre || 'Sin campaña'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-0.5">Coordinador</p>
                <p className="text-sm font-bold text-[#002b15] leading-tight">
                  {asig.coordinador_nombre || 'Sin coordinador'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-0.5">Cant. Asignada</p>
                <p className="text-base font-black text-[#002b15]">
                  {asig.cantidad_asignada} <span className="text-[10px] font-bold text-slate-400">ud</span>
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#002b15] mb-0.5">Saldo Disp.</p>
                <p className={`text-base font-black ${isExhausted ? 'text-slate-450' : 'text-emerald-700'}`}>
                  {asig.saldo_asignado_disponible} <span className="text-[10px] font-bold text-slate-400">ud</span>
                </p>
              </div>
            </div>

            {/* Detailed numeric counters */}
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50/50 p-2.5 text-center ring-1 ring-inset ring-slate-100">
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Consumido</p>
                <p className="mt-0.5 text-xs font-extrabold text-slate-650">{asig.cantidad_consumida}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Devuelto</p>
                <p className="mt-0.5 text-xs font-extrabold text-slate-650">{asig.cantidad_devuelta}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Mermado</p>
                <p className={`mt-0.5 text-xs font-extrabold ${hasMerma ? 'text-red-650' : 'text-slate-650'}`}>
                  {asig.cantidad_mermada}
                </p>
              </div>
            </div>

            {/* Alert Banner / Status Info */}
            <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ${
              isExhausted 
                ? 'bg-slate-50 ring-slate-200/60' 
                : 'bg-emerald-50/50 ring-emerald-100'
            }`}>
              <Icon name="info" className={`h-4 w-4 flex-shrink-0 ${isExhausted ? 'text-slate-400' : 'text-emerald-600'}`} />
              <p className={`text-[11px] font-bold leading-tight ${isExhausted ? 'text-slate-500' : 'text-emerald-800'}`}>
                {isExhausted 
                  ? 'Asignación completada. El saldo disponible se ha agotado por completo.' 
                  : 'Asignación activa. Saldo disponible para reasignación o despacho en campo.'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
