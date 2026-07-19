import Icon from '../../../../components/Icon'

export type StageKey =
  | 'embolsado'
  | 'descarte-pre-embolsado'
  | 'adaptabilidad'
  | 'merma'
  | 'despacho'

export type StageTab = {
  key: StageKey
  label: string
  available: boolean
  hidden?: boolean
  reason?: string
}

type Props = {
  tabs: StageTab[]
  current: StageKey
  onSelect: (key: StageKey) => void
}

function StageTabs({ tabs, current, onSelect }: Props) {
  const visible = tabs.filter((t) => !t.hidden)

  return (
    <div
      role="tablist"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {visible.map((tab) => {
        const isCurrent = tab.key === current
        const tone = isCurrent
          ? 'bg-brand-700 text-white shadow-soft'
          : tab.available
            ? 'bg-white text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50'
            : 'bg-brand-50 text-brand-400 cursor-not-allowed ring-1 ring-brand-100'
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-disabled={!tab.available}
            disabled={!tab.available}
            title={!tab.available ? tab.reason : undefined}
            onClick={() => tab.available && onSelect(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${tone}`}
          >
            {!tab.available && <Icon name="info" className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default StageTabs
