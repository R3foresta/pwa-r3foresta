import { lazy, Suspense, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import { Button } from './ui'
import { NAV_ITEMS, PARTICIPANT_NAV_ITEMS } from '../data/navigation'
import { useAuth } from '../contexts/AuthContext'
import { ProfileService } from '../modules/user_profile/profile.service'
import { hasInternalAppAccess } from '../utils/appAccess'
import { subcampaniaDetailPath } from '../modules/participacion/utils/detailNavigation'

const SubcampaniasOperativasSheet = lazy(
  () => import('../modules/plantacion/components/SubcampaniasOperativasSheet'),
)

type QuickAction = {
  label: string
  icon: IconName
  to: string
}

// Vista interna del bottom sheet: acciones rápidas o selector de subcampañas
// operativas para registrar plantación (PLT-FE-001).
type SheetView = 'actions' | 'plantacion'

function BottomNav({ publicMode = false }: { publicMode?: boolean }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [sheetView, setSheetView] = useState<SheetView>('actions')
  const [showProfileWarning, setShowProfileWarning] = useState(false)
  const hasInternalAccess = !publicMode && hasInternalAppAccess(user?.rol)
  const navItems = hasInternalAccess ? NAV_ITEMS : PARTICIPANT_NAV_ITEMS

  const quickActions: QuickAction[] = [
    { label: 'Registrar recolección', icon: 'package', to: '/app/collections/new' },
    { label: 'Nuevo germinación', icon: 'vivero', to: '/app/vivero/new' },
    { label: 'Registrar plantación', icon: 'leaf', to: 'plantacion-selector' },
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
    hasInternalAccess && !isInQuickActionRoute && !isSubcampaniaWizardRoute && !isRegistroPlantacionRoute

  // El formulario dispone de volver/cancelar con aviso de cambios sin guardar.
  if (pathname === '/app/edit-profile' || /^\/app\/participacion\/subcampanias\/[^/]+\/registrar$/.test(pathname)) return null

  return (
    <>
      {hasInternalAccess && open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
          onClick={closeSheet}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center">
        <nav aria-label="Navegación principal" className={`relative flex w-[92%] max-w-md items-end justify-between rounded-3xl bg-brand-600 px-4 ${hasInternalAccess ? 'py-3' : 'py-1'} text-white shadow-2xl shadow-brand-900/30`}>
          {navItems.map((item) => {
            const isActive = item.path === '/impacto' ? pathname === '/' || pathname.startsWith('/impacto') : item.path === '/participar' ? pathname === '/participar' || pathname === '/app/home' || /^\/app\/planting\/subcampanias\/[1-9]\d*$/.test(pathname) || pathname.endsWith('/registrar') : pathname.startsWith(item.path)
            const needsLogin = !isAuthenticated && item.path.startsWith('/app/')
            return (
              <NavLink
                key={item.label}
                to={needsLogin ? '/auth/login' : item.path}
                state={needsLogin ? { from: item.path } : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                  isActive ? 'text-white' : 'text-white/70'
                }`}
              >
                <div
                  className={`flex ${hasInternalAccess ? 'h-10 w-10' : 'h-8 w-8'} items-center justify-center rounded-xl ${
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

      {hasInternalAccess && open && (
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
              <Suspense
                fallback={(
                  <div
                    className="px-5 py-8 text-center text-sm font-semibold text-brand-600"
                    aria-live="polite"
                  >
                    Cargando subcampañas…
                  </div>
                )}
              >
                <SubcampaniasOperativasSheet
                  onBack={() => setSheetView('actions')}
                  onVer={(subcampaniaId) => {
                    closeSheet()
                    navigate(`/app/planting/subcampanias/${subcampaniaId}`)
                  }}
                  onRegistrar={(subcampaniaId) => {
                    closeSheet()
                    navigate(
                      `/app/participacion/subcampanias/${subcampaniaId}/registrar`,
                      { state: { registroIntent: 'nuevo', participacionReturnTo: subcampaniaDetailPath(subcampaniaId) } },
                    )
                  }}
                />
              </Suspense>
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
                Agrega tu nombre para identificarte en los registros. Tu rol y los permisos de cada operación determinan el acceso.
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
