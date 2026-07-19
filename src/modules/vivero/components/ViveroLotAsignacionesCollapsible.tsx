import { useState } from 'react'
import Icon from '../../../components/Icon'
import {
  LotesViveroService,
  type AsignacionViveroResumen,
} from '../../../services/lotes-vivero.service'

type Props = {
  loteId: number
  cantidadAsignacionesActivas?: number
  className?: string
}

export default function ViveroLotAsignacionesCollapsible({
  loteId,
  cantidadAsignacionesActivas = 0,
  className,
}: Props) {
  const [showAsignaciones, setShowAsignaciones] = useState(false)
  const [asignaciones, setAsignaciones] = useState<AsignacionViveroResumen[]>([])
  const [loadingAsig, setLoadingAsig] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const handleToggle = () => {
    const nextOpen = !showAsignaciones
    setShowAsignaciones(nextOpen)

    if (nextOpen && cantidadAsignacionesActivas > 0 && asignaciones.length === 0 && loteId) {
      setLoadingAsig(true)
      setLoadError(null)
      LotesViveroService.listAsignaciones(loteId)
        .then((data) => setAsignaciones(data))
        .catch((error: unknown) => {
          setLoadError(
            error instanceof Error ? error.message : 'No se pudieron cargar las asignaciones.',
          )
        })
        .finally(() => setLoadingAsig(false))
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          handleToggle()
        }}
        className="flex w-full items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        <div className="flex items-center gap-1.5">
          <Icon name="package" className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-extrabold text-brand-800">Asignaciones activas ({cantidadAsignacionesActivas})</span>
        </div>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showAsignaciones ? 'rotate-180' : ''}`}
        />
      </button>

      {showAsignaciones && (
        <div className="mt-3 space-y-2">
          {cantidadAsignacionesActivas === 0 ? (
            <p className="text-[11px] font-semibold text-slate-400 text-center py-2">No hay asignaciones activas para este lote.</p>
          ) : loadingAsig ? (
            <p className="text-[11px] font-semibold text-slate-400 text-center py-2">Cargando...</p>
          ) : loadError ? (
            <p className="py-2 text-center text-[11px] font-semibold text-red-500">
              {loadError}
            </p>
          ) : (
            <ul className="space-y-2">
              {asignaciones.map((asig) => (
                <li key={asig.id} className="flex items-center gap-2.5 rounded-2xl bg-slate-50/50 p-2.5 ring-1 ring-black/5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                    <Icon name="vivero" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ring-1 ${
                        asig.proposito === 'REPOSICION'
                          ? 'bg-amber-50 text-amber-700 ring-amber-100'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      }`}>
                        {asig.proposito}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Asignadas: {asig.cantidad_asignada} ud
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-extrabold text-brand-800 truncate">{asig.campania_nombre || 'Sin campaña'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
