import { useState } from 'react'
import { Link } from 'react-router-dom'

function RecoverScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-brand-700">
          Correo para recuperar
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          placeholder="tu@correo.com"
        />
        {sent && (
          <p className="text-sm font-semibold text-green-600">
            Te enviamos un enlace de recuperación.
          </p>
        )}
      </div>

      <div className="text-sm font-semibold text-brand-600">
        <Link to="/auth/login" className="underline">
          Volver a iniciar sesión
        </Link>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-brand-500 py-3 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
      >
        Enviar enlace
      </button>
    </form>
  )
}

export default RecoverScreen
