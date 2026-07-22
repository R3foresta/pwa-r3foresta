import Icon from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'

export type StageTimelineItem = {
  key: string
  label: string
  done: boolean
  active: boolean
  date: string | null
  subStates?: { key: string; label: string; active: boolean }[]
}

type StageAction = {
  label: string
  iconName: IconName
  onClick: () => void
}

type Props = {
  stages: StageTimelineItem[]
  imagenUrl?: string | null
  nextAction?: StageAction | null
  mermaAction?: { onClick: () => void } | null
}

// Theming de mini-viz del timeline (gotcha §6.2): ícono + color por etapa. Codifica
// un dato de la visualización (avance/estado de cada hito), no una píldora de estado
// de dominio; por eso se mantiene inline con tokens migrados y no deriva de status.ts.
const STAGE_CONFIG: Record<
  string,
  { iconName: IconName; doneClass: string; activeClass: string; pendingClass: string }
> = {
  INICIO: {
    iconName: 'check',
    doneClass: 'bg-neutral-200 text-neutral-500',
    activeClass: 'bg-success-100 text-success-600 ring-2 ring-success-400',
    pendingClass: 'bg-neutral-100 text-neutral-400',
  },
  EMBOLSADO: {
    iconName: 'package',
    doneClass: 'bg-neutral-200 text-neutral-500',
    activeClass: 'bg-teal-50 text-teal-600 ring-2 ring-teal-400',
    pendingClass: 'bg-neutral-100 text-neutral-400',
  },
  MERMA: {
    iconName: 'trash',
    doneClass: 'bg-red-100 text-red-600',
    activeClass: 'bg-red-50 text-red-500 ring-2 ring-red-300',
    pendingClass: 'bg-neutral-100 text-neutral-400',
  },
  ADAPTABILIDAD: {
    iconName: 'leaf',
    doneClass: 'bg-neutral-200 text-neutral-500',
    activeClass: 'bg-amber-50 text-amber-600 ring-2 ring-amber-400',
    pendingClass: 'bg-neutral-100 text-neutral-400',
  },
  DESPACHO: {
    iconName: 'planting',
    doneClass: 'bg-neutral-200 text-neutral-500',
    activeClass: 'bg-blue-50 text-blue-600 ring-2 ring-blue-400',
    pendingClass: 'bg-neutral-100 text-neutral-400',
  },
  CIERRE: {
    iconName: 'info',
    doneClass: 'bg-neutral-200 text-neutral-500',
    activeClass: 'bg-neutral-100 text-neutral-500 ring-2 ring-neutral-300',
    pendingClass: 'bg-neutral-100 text-neutral-300',
  },
}

const SUBETAPA_LABELS: Record<string, string> = {
  SOMBRA: 'Sombra',
  MEDIA_SOMBRA: 'Media sombra',
  SOL_DIRECTO: 'Sol directo',
}

function formatDate(value?: string | null) {
  if (!value) return null
  const parts = value.split('T')[0].split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StageTimeline({ stages, imagenUrl, nextAction, mermaAction }: Props) {
  return (
    <div className="flex gap-3">
      {/* Columna izquierda: lista de etapas */}
      <div className="min-w-0 flex-1">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1
          const config = STAGE_CONFIG[stage.key] ?? STAGE_CONFIG.CIERRE
          const iconClass = stage.done
            ? config.doneClass
            : stage.active
              ? config.activeClass
              : config.pendingClass
          const formattedDate = formatDate(stage.date)

          return (
            <div key={stage.key} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                >
                  <Icon name={config.iconName} className="h-4 w-4" />
                </div>
                {!isLast && (
                  <div
                    className={`mt-1 w-0.5 flex-1 ${stage.done ? 'bg-success-200' : 'bg-neutral-200'}`}
                    style={{ minHeight: '14px' }}
                  />
                )}
              </div>

              <div className="pb-3">
                <p
                  className={`text-sm font-bold leading-tight ${
                    stage.done || stage.active ? 'text-brand-700' : 'text-brand-400'
                  }`}
                >
                  {stage.label}
                </p>
                {formattedDate && (
                  <p className="text-xs font-semibold text-brand-500">{formattedDate}</p>
                )}
                {stage.subStates && stage.subStates.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-0.5">
                    {stage.subStates.map((sub, i) => (
                      <div key={sub.key} className="flex items-center gap-0.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                            sub.active
                              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {SUBETAPA_LABELS[sub.key] ?? sub.label}
                        </span>
                        {i < stage.subStates!.length - 1 && (
                          <span className="text-[9px] text-neutral-400">›</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Columna derecha: foto + botones de acción */}
      <div className="flex w-[130px] shrink-0 flex-col gap-2">
        <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt="Última foto del lote"
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div
              className="aspect-square w-full rounded-2xl"
              style={{
                background:
                  'repeating-linear-gradient(45deg, #bbf7d0 0px, #bbf7d0 1.5px, white 1.5px, white 8px)',
              }}
            />
          )}
        </div>

        {nextAction && (
          <button
            type="button"
            onClick={nextAction.onClick}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-success-500 bg-white px-2 py-2.5 text-success-600 transition hover:bg-success-50 active:scale-95"
          >
            <Icon name={nextAction.iconName} className="h-5 w-5" />
            <span className="text-center text-[11px] font-bold leading-tight">
              {nextAction.label}
            </span>
          </button>
        )}

        {mermaAction && (
          <button
            type="button"
            onClick={mermaAction.onClick}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-red-400 bg-white px-2 py-2.5 text-red-500 transition hover:bg-red-50 active:scale-95"
          >
            <Icon name="trash" className="h-5 w-5" />
            <span className="text-center text-[11px] font-bold leading-tight">
              Registrar Merma
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

export default StageTimeline
