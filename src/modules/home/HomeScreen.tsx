import { useOperationalAccess } from '../accesos/capabilitiesContext'
import { hasViveroCapability } from '../accesos/accessPolicy'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import MenuLateral from '../../components/MenuLateral'
import { hero, syncNotice, sections } from '../../data/home'
import type { Screen } from '../../types/navigation'
import RecoleccionStockPanel from '../recolecciones/components/RecoleccionStockPanel'
import { useRecoleccionStock } from '../recolecciones/hooks/useRecoleccionStock'
import { hasInternalAppAccess } from '../../utils/appAccess'
import ParticipantHomeScreen from './ParticipantHomeScreen'
import GestionAccesosEntry from '../participacion/components/GestionAccesosEntry'
import RegistroParticipanteEntry from '../participacion/components/RegistroParticipanteEntry'
import UsuariosEntry from '../usuarios/components/UsuariosEntry'

function HomeScreen() {
  const { user } = useAuth()
  return hasInternalAppAccess(user?.rol) ? <InternalHomeScreen /> : <ParticipantHomeScreen />
}

function InternalHomeScreen() {
  const navigate = useNavigate()
  const { user, isProfileComplete, login } = useAuth()
  const { m1, m2 } = useOperationalAccess()
  const canM1 = m1.status === 'ready' && Boolean(m1.data?.capacidades.mantener_propias)
  const canReceive = m2.status === 'ready' && hasViveroCapability(m2.data, 'recibir_y_validar')
  const canM2 = m2.status === 'ready' && hasViveroCapability(m2.data, 'operar')
  const isAdmin = (user?.rol ?? '').toUpperCase() === 'ADMIN'
  const { items: stockItems, loading: stockLoading, error: stockError } =
    useRecoleccionStock(isAdmin)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const targetPath: Record<Screen, string> = {
    home: '/app/home',
    collections: '/app/collections',
    collectionDetail: '/app/collections',
    collectionForm: '/app/collections/new',
    collectionFormStep2: '/app/collections/new/location',
    collectionFormStep3: '/app/collections/new/summary',
    vivero: '/app/vivero',
    scan: '/app/scan',
    report: '/app/report',
    profile: '/app/profile',
    planting: '/app/planting',
    co2: '/app/co2',
    impacto: '/impacto',
    misRegistros: '/app/participacion/mis-registros',
  }

  useEffect(() => {
    if (!isMenuOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [isMenuOpen])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6">
      <MenuLateral isOpen={isMenuOpen} onClose={closeMenu} />
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-white/90 p-2 shadow-sm transition hover:shadow-soft"
            aria-label="Abrir menú lateral"
            aria-controls="menu-lateral"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5 text-brand-700"
            >
              <path strokeLinecap="round" d="M4 7h16" />
              <path strokeLinecap="round" d="M4 12h16" />
              <path strokeLinecap="round" d="M4 17h16" />
            </svg>
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Panel</p>
            <div className="text-2xl font-semibold tracking-tight text-brand-700">
              R3foresta
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            className="relative rounded-full bg-white/90 p-2 shadow-sm transition hover:shadow-soft"
            aria-label="Perfil"
          >
            <Icon name="user" className="h-5 w-5 text-brand-700" />
            {!isProfileComplete && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-warning-500 border-2 border-white shadow-sm">
                <span className="sr-only">Perfil incompleto</span>
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Este es el banner principal hero para mostrar info relevante o novedades */}
      <section className="mt-4">
        <div className="relative overflow-hidden rounded-3xl bg-brand-700 text-white shadow-soft">
          <img
            src={hero.image}
            alt="Bosque"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700/90 via-brand-700/70 to-brand-500/30" />
          <div className="relative p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">Seguimiento</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">{hero.title}</h1>
            <p className="mt-2 text-sm text-white/85">{hero.subtitle}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <Icon name="dot" className="h-3 w-3 text-success-200" />
              <span>{hero.badge}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Banner de perfil incompleto */}
      {user && !isProfileComplete && (
        <section className="mt-4">
          <button
            onClick={() => navigate('/complete-profile', { replace: true })}
            className="w-full flex items-start gap-3 rounded-2xl bg-warning-50 border border-warning-200 px-4 py-3 text-sm font-medium text-warning-800 shadow-soft hover:bg-warning-100 transition-colors"
          >
            <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-warning-200 text-warning-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </span>
            
            <div className="flex flex-col text-left">
              <span className="font-semibold">Perfil incompleto</span>
              <span className="text-xs font-normal text-warning-600">Agrega tu nombre para identificarte en los registros. El acceso depende de tu rol y los permisos de cada operación.</span>
            </div>
            
            <span className="ml-auto mt-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </section>
      )}

      <section className="mt-4">
        <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-brand-700 shadow-soft">
          <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Icon name="dot" className="h-3 w-3 text-brand-600" />
          </span>

          <div className="flex flex-col">
            <span>{syncNotice.label}</span>
            <span className="text-xs font-normal text-brand-500">{syncNotice.detail}</span>
          </div>
        </div>
      </section>

      {[m1, m2].some(access => access.status === 'loading') && <p role="status" className="mt-4 text-sm">Consultando accesos de Recolección y Vivero…</p>}
      {[m1, m2].map((access, index) => access.status === 'error' || access.status === 'sessionExpired' ? <div key={index} className="mt-4 rounded-2xl bg-white p-4 text-sm"><p role="alert">{access.error}</p><button className="min-h-11 font-semibold underline" onClick={() => void (access.status === 'sessionExpired' ? login() : access.refresh())}>{access.status === 'sessionExpired' ? 'Recuperar sesión con passkey' : `Reintentar accesos de ${index === 0 ? 'Recolección' : 'Vivero'}`}</button></div> : null)}
      <RegistroParticipanteEntry />
      <GestionAccesosEntry />
      <UsuariosEntry />

      {isAdmin && (
        <div className="mt-7">
          {stockLoading && (
            <section>
              <h2 className="text-lg font-extrabold text-brand-700">
                Disponibilidad por especie
              </h2>
              <div
                role="status"
                aria-live="polite"
                className="mt-3 rounded-3xl bg-white px-4 py-5 text-sm font-semibold text-neutral-600 shadow-soft"
              >
                Cargando inventario global...
              </div>
            </section>
          )}

          {stockError && (
            <section>
              <h2 className="text-lg font-extrabold text-brand-700">
                Disponibilidad por especie
              </h2>
              <div
                role="alert"
                className="mt-3 rounded-3xl bg-danger-50 px-4 py-5 text-sm font-semibold text-danger-700 ring-1 ring-danger-200"
              >
                No se pudo cargar el inventario de semillas.
              </div>
            </section>
          )}

          {!stockLoading && !stockError && stockItems.length === 0 && (
            <section>
              <h2 className="text-lg font-extrabold text-brand-700">
                Disponibilidad por especie
              </h2>
              <div className="mt-3 rounded-3xl bg-white px-4 py-5 text-sm font-medium text-neutral-600 shadow-soft">
                No hay plantas activas registradas todavía.
              </div>
            </section>
          )}

          {!stockLoading && !stockError && stockItems.length > 0 && (
            <RecoleccionStockPanel
              items={stockItems}
              limit={4}
              compact
              onViewAll={() => navigate('/app/collections/stock')}
            />
          )}
        </div>
      )}

      {canReceive && <section className="mt-5">
        <button type="button" onClick={() => navigate('/app/collections/validate')} className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft ring-1 ring-brand-100">
          <Icon name="check-circle" className="h-7 w-7 shrink-0 text-brand-600" />
          <span className="flex-1"><span className="block font-bold text-brand-800">Recepción de semillas y esquejes</span><span className="text-sm text-neutral-600">Revisar el material recibido y validar la recolección.</span></span>
          <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-brand-600" />
        </button>
      </section>}

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-700">Operación en campo</h2>
          <button
            type="button"
            className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft"
            onClick={() => navigate('/app/map')}
          >
            Ver mapa
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {sections.filter(section => section.target !== 'collections' || canM1).filter(section => section.target !== 'vivero' || canM2).map((section) => (
            <button
              key={section.label}
              type="button"
              disabled={section.disabled}
              aria-label={`${section.label}: ${section.action}`}
              onClick={() => navigate(targetPath[section.target] ?? '/app/home')}
              className="group relative h-44 overflow-hidden rounded-2xl text-left shadow-soft transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-default disabled:active:scale-100"
            >
              <img
                src={section.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${section.disabled ? 'grayscale' : 'group-hover:scale-105'}`}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/20" />
              <div className="relative flex h-full flex-col justify-end p-4 text-white">
                <h3 className="text-lg font-semibold leading-tight">{section.label}</h3>
                <p className="mt-1 text-xs leading-5 text-white/90">{section.detail}</p>
                <span className="mt-3 flex items-center gap-1 text-xs font-semibold">
                  {section.action}
                  {!section.disabled && <Icon name="chevron-right" className="h-4 w-4" />}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  )
}

export default HomeScreen
