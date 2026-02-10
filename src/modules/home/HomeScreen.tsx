import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import { hero, syncNotice, metrics, sections, recent } from '../../data/home'
import type { Screen } from '../../types/navigation'

function HomeScreen() {
  const navigate = useNavigate()
  const { user, isProfileComplete } = useAuth()
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
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Panel</p>
          <div className="text-2xl font-semibold tracking-tight text-brand-700">
            R3foresta
          </div>
        </div>
        <button
          type="button"
          className="rounded-full bg-white/90 p-2 shadow-sm transition hover:shadow-soft"
          aria-label="Notificaciones"
        >
          <Icon name="bell" className="h-5 w-5 text-brand-700" />
        </button>
      </header>

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
              <Icon name="dot" className="h-3 w-3 text-emerald-200" />
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
            className="w-full flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-medium text-amber-800 shadow-soft hover:bg-amber-100 transition-colors"
          >
            <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </span>
            
            <div className="flex flex-col text-left">
              <span className="font-semibold">Perfil incompleto</span>
              <span className="text-xs font-normal text-amber-600">Necesitas completar tu perfil para acceder a todas las funcionalidades de la aplicación.</span>
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

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-brand-700">Indicadores clave</h2>
          <span className="text-xs text-brand-500">Actualizado hace 12 min</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white px-4 py-4 text-brand-700 shadow-soft"
            >
              <div className="text-xl font-semibold leading-tight">{item.value}</div>
              <p className="mt-1 text-sm font-medium text-brand-600">{item.label}</p>
              {item.helper && <p className="mt-1 text-xs text-brand-500">{item.helper}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-700">Fases en progreso</h2>
          <button
            type="button"
            className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 shadow-soft"
            onClick={() => navigate('/app/map')}
          >
            Ver mapa
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {sections.map((section) => (
            <button
              key={section.label}
              type="button"
              onClick={() => navigate(targetPath[section.target] ?? '/app/home')}
              className="group relative h-44 overflow-hidden rounded-2xl text-left shadow-soft transition transform active:scale-[0.99]"
            >
              <img
                src={section.image}
                alt={section.label}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
              <div className="relative flex h-full flex-col justify-between p-4 text-white">
                <div className="inline-flex w-fit items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold">
                  {section.stat}
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-tight">{section.label}</h3>
                  <p className="mt-1 text-xs text-white/80">{section.detail}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-700">Actividad reciente</h2>
          <span className="text-xs text-brand-500">Hoy</span>
        </div>
        <div className="mt-3 space-y-3">
          {recent.map((item) => (
            <div
              key={item.title + item.time}
              className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-soft"
            >
              <div className="flex h-10 w-12 flex-col items-center justify-center rounded-xl bg-brand-100 text-[11px] font-semibold text-brand-700">
                <span>{item.time}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-700">{item.title}</p>
                <p className="text-xs text-brand-500">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomeScreen
