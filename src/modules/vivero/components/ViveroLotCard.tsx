import type { ViveroLotCardData } from '../types/view-models'
import SurvivalBar from './SurvivalBar'
import { DISPATCH_FLOW_LABEL, getDispatchFlowStatus } from '../utils/dispatchFlow'
import { Badge, Button, statusVariant } from '../../../components/ui'

// Etiquetas de etapa (solo texto). El color de cada etapa vive en el registro
// único `status.ts` (INICIO→info, EMBOLSADO→warning, ADAPTABILIDAD→info,
// FINALIZADO→neutral), no en un mapa de color local. Ver FRONTEND_UI_STANDARD.md §5.
const ETAPA_LABEL: Record<string, string> = {
  INICIO: 'Inicio',
  EMBOLSADO: 'Embolsado',
  ADAPTABILIDAD: 'Adaptabilidad',
  FINALIZADO: 'Finalizado',
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

  if (compact) {
    // Wrapper es una zona tocable a pantalla completa (no un botón de acción):
    // se mantiene nativo, no <Button>, para no heredar el estilo de acción. (gotcha §6.5)
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
        <Badge variant={statusVariant(etapa)} size="sm" className="shrink-0">
          {ETAPA_LABEL[etapa]}
        </Badge>
      </Wrapper>
    )
  }

  const entregado = lot.saldoAsignadoSubcampanias ?? 0
  const enVivero = lot.cantidadActual ?? 0
  const flowStatus = getDispatchFlowStatus(lot)
  const flowTone =
    flowStatus === 'ASIGNADO_A_DESTINO'
      ? 'bg-success-50 text-success-700 ring-success-200'
      : flowStatus === 'LISTO_PARA_DESPACHO'
        ? 'bg-info-50 text-info-700 ring-info-200'
        : 'bg-neutral-50 text-neutral-600 ring-neutral-200'

  return (
    <div className="w-full rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      {/* Zona tocable a pantalla completa (abre el detalle): control estructural,
          se mantiene nativo en vez de <Button> para no heredar el estilo de acción. (gotcha §6.5) */}
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
              {entregado > 0 && (
                <span className="shrink-0 rounded bg-success-50 px-1.5 py-0.5 text-[9px] font-bold text-success-700 ring-1 ring-success-200">
                  ENTREGADO
                </span>
              )}
              {enVivero === 0 && entregado > 0 && (
                <span className="shrink-0 rounded bg-danger-50 px-1.5 py-0.5 text-[9px] font-bold text-danger-700 ring-1 ring-danger-200">
                  SIN STOCK EN VIVERO
                </span>
              )}
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1 ${flowTone}`}>
                {DISPATCH_FLOW_LABEL[flowStatus]}
              </span>
            </div>
            <p className="text-sm font-semibold text-brand-500">{lot.codigo}</p>
          </div>
          <Badge variant={statusVariant(etapa)} className="shrink-0">
            {ETAPA_LABEL[etapa]}
            {lot.subetapaActual ? ` · ${lot.subetapaActual.replace('_', ' ')}` : ''}
          </Badge>
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
              <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-700 ring-1 ring-warning-200">
                Pendiente embolsado
              </span>
            </div>
          )}
        </div>

        {/* Columnas derivadas de saldos (modelo fisico) */}
        {lot.saldoAsignadoSubcampanias !== undefined && (
          <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 mt-4 text-center">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-600">En vivero</p>
              <p className={`text-xs font-extrabold mt-1 ${enVivero === 0 ? 'text-danger-500' : 'text-success-700'}`}>
                {enVivero}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-brand-600">Entregado</p>
              <p className="text-xs font-extrabold text-warning-600 mt-1">{entregado}</p>
            </div>
          </div>
        )}


      </button>

      {cta && (
        <div className="px-4 pb-4">
          <Button
            variant="primary"
            fullWidth
            disabled={cta.disabled}
            onClick={(e) => {
              e.stopPropagation()
              cta.onClick()
            }}
          >
            {cta.label}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ViveroLotCard
