import { Outlet } from 'react-router-dom'
import heroCanopy from '../assets/home/hero-canopy.jpg'

function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-900 via-brand-800 to-brand-900 text-white">
      <img
        src={heroCanopy}
        alt="Dosel verde"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-brand-700/70 to-brand-900/90" />
      <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-success-400/20 blur-[110px]" />
      <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-success-200/15 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/80">R3foresta</p>
            <h1 className="text-2xl font-bold text-white">Acceso</h1>
          </div>
          <div className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">
            PWA lista
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>

        <footer className="mt-8 text-center text-xs font-semibold text-white/80">
          Passkeys y sync offline
        </footer>
      </div>
    </div>
  )
}

export default AuthLayout
