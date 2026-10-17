import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import MenuLateral from '../../components/MenuLateral'
import { Card } from '../../components/ui'
import heroCanopy from '../../assets/home/hero-canopy.webp'
import GestionAccesosEntry from '../participacion/components/GestionAccesosEntry'
import RegistroParticipanteEntry from '../participacion/components/RegistroParticipanteEntry'

function ParticipantHomeScreen() {
  const { user, isProfileComplete } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const name = user?.nombre?.trim() || user?.username || 'Bienvenido'

  useEffect(() => {
    if (!isMenuOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [isMenuOpen])

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-36 pt-6 text-brand-700">
      <MenuLateral isOpen={isMenuOpen} onClose={closeMenu} />
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menú lateral"
            aria-controls="menu-lateral"
            aria-expanded={isMenuOpen}
            className="rounded-full bg-white p-3 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <p className="text-xl font-bold tracking-tight">R3foresta</p>
        </div>
        <Link to="/app/profile" aria-label="Ver mi perfil" className="rounded-full bg-white p-3 shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <Icon name="user" className="h-5 w-5" />
        </Link>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-brand-800 text-white shadow-soft">
        <img src={heroCanopy} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/75 to-brand-900/40" />
        <div className="relative px-6 pb-7 pt-10">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            {user?.rol === 'VOLUNTARIO' ? 'Voluntariado' : 'Mi cuenta'}
          </span>
          <h1 className="mt-6 break-words text-3xl font-bold leading-tight">Hola, {name}</h1>
          <p className="mt-3 text-sm leading-6 text-white/90">Tu espacio en R3foresta. Gracias por ser parte de la reforestación.</p>
        </div>
      </section>

      <RegistroParticipanteEntry />
      <GestionAccesosEntry />

      <Card as="section" className="mt-5" padding="lg">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50">
            <Icon name="user" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Tu perfil, a tu manera</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Puedes revisar tu nombre y agregar un apellido o una afiliación si lo deseas.
            </p>
          </div>
        </div>
        {!isProfileComplete && (
          <p className="mt-4 rounded-2xl bg-warning-50 px-4 py-3 text-sm leading-6 text-warning-800">
            Agrega tu nombre para que el equipo pueda identificarte.
          </p>
        )}
        <Link to="/app/edit-profile" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
          {isProfileComplete ? 'Revisar mi perfil' : 'Agregar mi nombre'}
          <Icon name="user" className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs leading-5 text-neutral-500">La afiliación es opcional y puedes cambiarla cuando lo necesites.</p>
      </Card>

      <section className="mt-5 rounded-3xl bg-brand-100/60 px-5 py-5">
        <div className="flex items-center gap-2">
          <Icon name="leaf" className="h-5 w-5" />
          <h2 className="text-base font-bold">Para trabajar en campo</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-brand-800">
          Puedes registrar plantaciones en las subcampañas donde tengas permiso. Recolecciones y vivero requieren acceso del equipo operativo. Coordina cualquier habilitación con el equipo de R3foresta.
        </p>
        <p className="mt-3 text-xs leading-5 text-brand-700">Editar tu perfil o elegir una organización conserva el acceso de tu cuenta.</p>
      </section>
    </main>
  )
}

export default ParticipantHomeScreen
