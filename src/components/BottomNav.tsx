import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { NAV_ITEMS } from '../data/navigation'

function BottomNav() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed inset-x-0 bottom-0 pb-4 border-t border-white/60 bg-white/95 px-2 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.label}
              to={item.path}
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
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
