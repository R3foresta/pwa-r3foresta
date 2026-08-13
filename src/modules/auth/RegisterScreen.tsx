import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui'
import plantacionImg from '../../assets/home/plantacion.webp'

function RegisterScreen() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    await login(email)
    setLoading(false)
    navigate('/app/home', { replace: true })
  }

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden rounded-[28px] bg-white text-brand-800 shadow-2xl backdrop-blur">
        <div className="relative h-44">
          <img
            src={plantacionImg}
            alt="Plantación"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-brand-900/90" />
          <div className="relative flex h-full flex-col justify-between p-5 text-white">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="rounded-full bg-white/25 px-3 py-1 text-white">Nuevo usuario</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-white">Crea tu cuenta</span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/90">
                Plantación
              </p>
              <h2 className="text-2xl font-semibold leading-tight text-white">Activa tu perfil</h2>
              <p className="mt-1 text-sm text-white">Acceso a trazabilidad y reportes.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 pb-6 pt-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-700">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-700">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm font-semibold text-brand-600">
            <Link to="/auth/login" className="underline">
              Ya tengo cuenta
            </Link>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] text-brand-700">
              Perfil único
            </span>
          </div>

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <div className="grid grid-cols-2 gap-3 text-[12px] font-semibold text-brand-600">
            <div className="rounded-2xl bg-neutral-100 px-3 py-2">CO₂ y plantación</div>
            <div className="rounded-2xl bg-neutral-100 px-3 py-2">Alertas y reportes</div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterScreen
