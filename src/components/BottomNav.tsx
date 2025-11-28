import Icon from './Icon'
import { NAV_ACTIVE_FOR, NAV_ITEMS } from '../data/navigation'
import type { Screen } from '../types/navigation'

type Props = {
  active: Screen
  onChange: (screen: Screen) => void
}

function BottomNav({ active, onChange }: Props) {
  const activeNav = NAV_ACTIVE_FOR[active] ?? 'home'

  return (
    <nav className="fixed inset-x-0 bottom-0 pb-4 border-t border-white/60 bg-white/95 px-2 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const isActive = item.screen === activeNav
          return (
            <button
              key={item.label}
              onClick={() => onChange(item.screen)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                isActive ? 'text-brand-600' : 'text-brand-500'
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  isActive ? 'bg-brand-100 text-brand-600' : 'text-brand-500'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
