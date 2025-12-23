import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebAuthn } from '../../hooks/useWebAuthn'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import heroCanopy from '../../assets/home/hero-canopy.jpg'

function LoginScreen() {
  const navigate = useNavigate()
  const { login: loginWebAuthn, register: registerWebAuthn, loading, error } = useWebAuthn()
  const { login: loginAuth } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  const handleLogin = async () => {
    try {
      console.log('🔵 LoginScreen: Iniciando login...')
      const result = await loginWebAuthn()
      console.log('✅ LoginScreen: Login exitoso', result)
      
      // Actualizar el AuthContext con los datos del usuario del backend
      if (result.success && result.user) {
        const userData = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
        }
        localStorage.setItem('r3foresta:user', JSON.stringify(userData))
        await loginAuth(result.user.email || result.user.username)
        console.log('✅ LoginScreen: Navegando a home...')
        navigate('/app/home', { replace: true })
      }
    } catch (error) {
      console.error('❌ LoginScreen: Error en login:', error)
      // El error ya se muestra a través del hook useWebAuthn
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username.trim()) {
      return
    }
    
    try {
      console.log('🔵 LoginScreen: Iniciando registro...')
      const result = await registerWebAuthn(username, email || undefined)
      console.log('✅ LoginScreen: Registro exitoso', result)
      
      // Actualizar el AuthContext con los datos del usuario del backend
      if (result.success && result.user) {
        const userData = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
        }
        localStorage.setItem('r3foresta:user', JSON.stringify(userData))
        await loginAuth(result.user.email || result.user.username)
        console.log('✅ LoginScreen: Navegando a home...')
        navigate('/app/home', { replace: true })
      }
    } catch (error) {
      console.error('❌ LoginScreen: Error en registro:', error)
      // El error ya se muestra a través del hook useWebAuthn
    }
  }

  return (
    <div className="flex min-h-[82vh] flex-col">
      <div className="relative overflow-hidden rounded-[28px] bg-white text-brand-800 shadow-2xl backdrop-blur">
        <div className="relative h-48">
          <img
            src={heroCanopy}
            alt="Bosque"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/60 to-brand-900/90" />
          <div className="relative flex h-full flex-col justify-between p-5 text-white">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="rounded-full bg-white/25 px-3 py-1 text-white backdrop-blur">
                Passkeys
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-white">Biometría</span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/90">Ingreso</p>
              <h2 className="text-2xl font-semibold leading-tight text-white">Acceso sin contraseñas</h2>
              <p className="mt-1 text-sm text-white">Face ID, huella o Windows Hello.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </div>
            <div className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-600">
              Passkeys
            </div>
          </div>

          <div className="relative rounded-full border border-white/60 bg-slate-100/90 p-1 shadow-soft backdrop-blur">
            <div
              className={`absolute top-1 h-[calc(100%-8px)] w-[48%] rounded-full bg-gradient-to-r from-brand-600 to-brand-700 shadow-soft transition-all duration-300 ${
                isRegistering ? 'translate-x-[104%]' : 'translate-x-[4%]'
              }`}
            />
            <div className="relative z-10 grid grid-cols-2 text-[13px] font-extrabold">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex items-center justify-center gap-1 rounded-full px-4 py-2 transition ${
                  !isRegistering ? 'text-white mix-blend-difference' : 'text-slate-600'
                }`}
              >
                <span>Iniciar</span>
                <span className="hidden text-[11px] font-semibold md:inline">sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex items-center justify-center gap-1 rounded-full px-4 py-2 transition ${
                  isRegistering ? 'text-white mix-blend-difference' : 'text-slate-600'
                }`}
              >
                <span>Crear</span>
                <span className="hidden text-[11px] font-semibold md:inline">cuenta</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-soft">
              <div className="flex items-center gap-2">
                <Icon name="info" className="h-5 w-5 text-red-600" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!isRegistering ? (
            <div className="flex flex-col gap-5">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 px-4 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <Icon name="user" className="h-5 w-5" />
                    <span>Entrar con Passkey</span>
                  </>
                )}
              </button>

              <p className="text-center text-xs font-semibold text-slate-700">
                Biometría solo cuando sea necesario.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-700">
                  Nombre de usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-700">
                  Correo electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base font-semibold text-slate-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  placeholder="tu@correo.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 px-4 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Icon name="user" className="h-5 w-5" />
                    <span>Crear cuenta con Passkey</span>
                  </>
                )}
              </button>

              <p className="text-center text-xs font-semibold text-slate-700">
                Face ID / huella para confirmar alta.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
