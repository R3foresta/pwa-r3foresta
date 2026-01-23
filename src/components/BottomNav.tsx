import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { NAV_ITEMS } from '../data/navigation'

function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const quickActions = [
    { label: 'Registrar recolección', icon: 'package', to: '/app/collections/new' },
    { label: 'Nuevo germinación', icon: 'vivero', to: '/app/vivero/new' },
    { label: 'Registrar plantación', icon: 'leaf', to: '/app/planting' },
    { label: 'Actualizar CO₂', icon: 'balance', to: '/app/co2' },
  ]

  const handleQuickNav = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  // Verificar si estamos en alguna ruta de acciones rápidas
  const isInQuickActionRoute = quickActions.some(action => pathname === action.to)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 mb-3 flex justify-center">
        <nav className="relative flex w-[92%] max-w-md items-end justify-between rounded-3xl bg-brand-600 px-4 py-3 text-white shadow-2xl shadow-brand-900/30">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                  isActive ? 'text-white' : 'text-white/70'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/70'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          {!isInQuickActionRoute && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="fixed bottom-32 right-1/2 flex h-14 w-14 translate-x-[calc(min(50vw,24rem)-2.5rem)] items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.98] ring-4 ring-white"
              aria-label="Abrir acciones rápidas"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft">
                <Icon name={open ? 'minus' : 'plus'} className="h-6 w-6" />
              </div>
            </button>
          )}
        </nav>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div className="w-full max-w-md rounded-3xl bg-white text-brand-800 shadow-2xl shadow-brand-900/20 ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-center justify-between px-4 pt-4">
              <h3 className="text-sm font-semibold text-brand-800">Acciones rápidas</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-brand-500 hover:bg-slate-100"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 px-2 pb-2 pt-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleQuickNav(action.to)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name={action.icon as any} className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-brand-800">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BottomNav
