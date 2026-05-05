import type { ViveroLotCardData } from '../types/view-models'
import SurvivalBar from './SurvivalBar'

const ETAPA_LABEL: Record<string, string> = {
  INICIO: 'Inicio',
  EMBOLSADO: 'Embolsado',
  ADAPTABILIDAD: 'Adaptabilidad',
  FINALIZADO: 'Finalizado',
}

const ETAPA_BADGE: Record<string, string> = {
  INICIO: 'bg-sky-50 text-sky-700 border-sky-200',
  EMBOLSADO: 'bg-amber-50 text-amber-700 border-amber-200',
  ADAPTABILIDAD: 'bg-blue-50 text-blue-700 border-blue-200',
  FINALIZADO: 'bg-slate-50 text-slate-600 border-slate-200',
}

function getEtapa(lot: ViveroLotCardData): string {
  if (lot.estadoLote === 'FINALIZADO') return 'FINALIZADO'
  if (lot.subetapaActual !== null) return 'ADAPTABILIDAD'
  if (lot.plantasVivasIniciales !== null) return 'EMBOLSADO'
  return 'INICIO'
}

type Props = {
  lot: ViveroLotCardData
  onClick?: () => void
  cta?: { label: string; onClick: () => void }
  compact?: boolean
}

function ViveroLotCard({ lot, onClick, cta, compact }: Props) {
  const etapa = getEtapa(lot)
  const badgeClass = ETAPA_BADGE[etapa] ?? ETAPA_BADGE.INICIO

  if (compact) {
    const Wrapper = onClick ? 'button' : 'div'
    return (
      <Wrapper
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-soft ring-1 ring-black/5 transition hover:shadow-md"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-brand-700">{lot.especie}</p>
          <p className="text-xs font-semibold text-brand-500">
            {lot.codigo} · {lot.diasDesdeInicio}d · {lot.vivero}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}
        >
          {ETAPA_LABEL[etapa]}
        </span>
      </Wrapper>
    )
  }

  return (
    <div className="w-full rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      <button
        type="button"
        onClick={onClick}
        className={`w-full px-4 pt-4 text-left ${cta ? 'pb-3' : 'pb-4'} ${onClick ? 'transition hover:-translate-y-[2px] hover:shadow-md' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <h2 className="truncate text-xl font-extrabold leading-tight text-brand-700">
              {lot.especie}
            </h2>
            <p className="text-sm font-semibold text-brand-500">{lot.codigo}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}
          >
            {ETAPA_LABEL[etapa]}
            {lot.subetapaActual ? ` · ${lot.subetapaActual.replace('_', ' ')}` : ''}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {lot.plantasVivasIniciales !== null ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-brand-500">
                    <span className="font-extrabold text-brand-700">
                      {lot.cantidadActual ?? 0}
                    </span>
                    {' / '}
                    {lot.plantasVivasIniciales} plantas vivas
                  </p>
                  <p className="text-[11px] font-semibold text-brand-400">
                    {lot.vivero} · {lot.diasDesdeInicio}d
                  </p>
                </div>
              </div>
              <SurvivalBar
                alive={lot.cantidadActual}
                initial={lot.plantasVivasIniciales}
                showLabel
              />
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-500">
                  <span className="font-extrabold text-brand-700">
                    {lot.cantidadInicial} {lot.unidadMedida}
                  </span>{' '}
                  en proceso
                </p>
                <p className="text-[11px] font-semibold text-brand-400">
                  {lot.vivero} · {lot.diasDesdeInicio}d
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                Pendiente embolsado
              </span>
            </div>
          )}
        </div>
      </button>

      {cta && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              cta.onClick()
            }}
            className="w-full rounded-2xl bg-brand-700 py-3 text-sm font-extrabold text-white transition hover:bg-brand-600 active:scale-[0.98]"
          >
            {cta.label}
          </button>
        </div>
      )}
    </div>
  )
}

export default ViveroLotCard
