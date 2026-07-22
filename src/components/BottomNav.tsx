import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import { Button } from './ui'
import { NAV_ITEMS } from '../data/navigation'
import { useAuth } from '../contexts/AuthContext'
import { ProfileService } from '../modules/user_profile'
import SubcampaniasOperativasSheet from '../modules/plantacion/components/SubcampaniasOperativasSheet'

type QuickAction = {
  label: string
  icon: IconName
  to: string
}

// Vista interna del bottom sheet: acciones rápidas o selector de subcampañas
// operativas para registrar plantación (PLT-FE-001).
type SheetView = 'actions' | 'plantacion'

function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [sheetView, setSheetView] = useState<SheetView>('actions')
  const [showProfileWarning, setShowProfileWarning] = useState(false)

  const quickActions: QuickAction[] = [
    { label: 'Registrar recolección', icon: 'package', to: '/app/collections/new' },
    { label: 'Nuevo germinación', icon: 'vivero', to: '/app/vivero/new' },
    { label: 'Registrar plantación', icon: 'leaf', to: 'plantacion-selector' },
    { label: 'Actualizar CO₂', icon: 'balance', to: '/app/co2' },
  ]

  const closeSheet = () => {
    setOpen(false)
    setSheetView('actions')
  }

  const handleQuickNav = (to: string) => {
    // Validar si el usuario tiene el perfil completo antes de permitir ciertas acciones
    const requiresCompleteProfile = [
      '/app/collections/new',
      '/app/vivero/new',
      'plantacion-selector',
      '/app/co2',
    ]

    if (requiresCompleteProfile.includes(to)) {
      const isComplete = ProfileService.isProfileComplete(user)

      if (!isComplete) {
        closeSheet()
        setShowProfileWarning(true)
        return
      }
    }

    // «Registrar plantación» no navega directo: abre el selector de
    // subcampañas operativas dentro del mismo sheet (PLT-FE-001).
    if (to === 'plantacion-selector') {
      setSheetView('plantacion')
      return
    }

    closeSheet()
    navigate(to)
  }

  const handleCompleteProfile = () => {
    setShowProfileWarning(false)
    navigate('/complete-profile')
  }

  // Verificar si estamos en alguna ruta de acciones rápidas
  const isInQuickActionRoute = quickActions.some(action => pathname === action.to)
  const isSubcampaniaWizardRoute = pathname.includes('/subcampanias/new')
  const isRegistroPlantacionRoute = pathname.includes('/plantaciones/new')
  const showQuickActionButton =
    !isInQuickActionRoute && !isSubcampaniaWizardRoute && !isRegistroPlantacionRoute

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
          onClick={closeSheet}
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

          {showQuickActionButton && (
            <button
              type="button"
              onClick={() => {
                if (open) {
                  closeSheet()
                } else {
                  setOpen(true)
                }
              }}
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
              <h3 className="text-sm font-semibold text-brand-800">
                {sheetView === 'plantacion'
                  ? 'Registrar plantación · Elige subcampaña'
                  : 'Acciones rápidas'}
              </h3>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-full p-2 text-brand-500 hover:bg-neutral-100"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            {sheetView === 'plantacion' ? (
              <SubcampaniasOperativasSheet
                onBack={() => setSheetView('actions')}
                onVer={(subcampaniaId) => {
                  closeSheet()
                  navigate(`/app/planting/subcampanias/${subcampaniaId}`)
                }}
                onRegistrar={(subcampaniaId) => {
                  closeSheet()
                  navigate(
                    `/app/planting/subcampanias/${subcampaniaId}/plantaciones/new`,
                  )
                }}
              />
            ) : (
              <div className="divide-y divide-neutral-100 px-2 pb-2 pt-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickNav(action.to)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-neutral-50 active:bg-neutral-100"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <Icon name={action.icon} className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-brand-800">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de advertencia de perfil incompleto */}
      {showProfileWarning && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProfileWarning(false)}
          />
          <div className="fixed inset-x-0 top-1/2 z-50 -translate-y-1/2 px-6">
            <div className="mx-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex justify-center">
                {/* <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
                  <Icon name="alert-triangle" className="h-8 w-8 text-warning-600" />
                </div> */}
              </div>
              
              <h3 className="mb-2 text-center text-lg font-semibold text-brand-700">
                Perfil incompleto
              </h3>
              
              <p className="mb-6 text-center text-sm text-brand-600">
                Necesitas completar tu perfil para acceder a todas las funcionalidades de la aplicación.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button variant="primary" fullWidth onClick={handleCompleteProfile}>
                  Completar perfil
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setShowProfileWarning(false)}>
                  Continuar sin completar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default BottomNav
