import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

function LoginScreen() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    await login(email, password)
    setLoading(false)
    navigate('/app/home', { replace: true })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">
          Correo electrónico
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between text-sm font-semibold text-brand-600">
        <Link to="/auth/recover" className="underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link to="/auth/register" className="underline">
          Crear cuenta
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-brand-500 py-3 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

export default LoginScreen
