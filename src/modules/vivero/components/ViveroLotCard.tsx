import type { ViveroLotCardData } from '../types/view-models'
import SurvivalBar from './SurvivalBar'
import { DISPATCH_FLOW_LABEL, getDispatchFlowStatus } from '../utils/dispatchFlow'

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
  cta?: { label: string; onClick: () => void; disabled?: boolean }
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

  const reservado = lot.saldoAsignadoTotal ?? 0
  const stockLibre = lot.saldoVivoDisponibleAsignacion ?? (lot.cantidadActual ?? 0)
  const flowStatus = getDispatchFlowStatus(lot)
  const flowTone =
    flowStatus === 'ASIGNADO_A_DESTINO'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : flowStatus === 'LISTO_PARA_DESPACHO'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-slate-50 text-slate-600 ring-slate-200'

  return (
    <div className="w-full rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      <button
        type="button"
        onClick={onClick}
        className={`w-full px-4 pt-4 text-left ${cta ? 'pb-3' : 'pb-4'} ${onClick ? 'transition hover:-translate-y-[2px] hover:shadow-md' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate text-xl font-extrabold leading-tight text-brand-700">
                {lot.especie}
              </h2>
              {reservado > 0 && (
                <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  RESERVADO
                </span>
              )}
              {stockLibre === 0 && reservado > 0 && (
                <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 ring-1 ring-red-200">
                  SIN STOCK LIBRE
                </span>
              )}
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1 ${flowTone}`}>
                {DISPATCH_FLOW_LABEL[flowStatus]}
              </span>
            </div>
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

        {/* Columnas derivadas de saldos */}
        {lot.saldoAsignadoTotal !== undefined && (
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-4 text-center">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-600">Saldo Vivo</p>
              <p className="text-xs font-extrabold text-slate-700 mt-1">{lot.cantidadActual ?? 0}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-600">Reservado</p>
              <p className="text-xs font-extrabold text-amber-600 mt-1">{lot.saldoAsignadoTotal}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-600">Saldo Libre</p>
              <p className={`text-xs font-extrabold mt-1 ${stockLibre === 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                {stockLibre}
              </p>
            </div>
          </div>
        )}


      </button>

      {cta && (
        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={cta.disabled}
            onClick={(e) => {
              e.stopPropagation()
              cta.onClick()
            }}
            className={`w-full rounded-2xl py-3 text-sm font-extrabold text-white transition active:scale-[0.98] ${cta.disabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-brand-700 hover:bg-brand-600'
              }`}
          >
            {cta.label}
          </button>
        </div>
      )}
    </div>
  )
}

export default ViveroLotCard
