import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebAuthn } from '../../hooks/useWebAuthn'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'

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
    <div className="flex flex-1 flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setIsRegistering(false)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold transition ${
            !isRegistering
              ? 'bg-white text-brand-700 shadow-soft'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => setIsRegistering(true)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold transition ${
            isRegistering
              ? 'bg-white text-brand-700 shadow-soft'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Crear Cuenta
        </button>
      </div>

      {/* Mensaje informativo */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">🔐</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-blue-900">
              Autenticación sin contraseña
            </h3>
            <p className="mt-1 text-xs font-semibold text-blue-700">
              {isRegistering 
                ? 'Crea tu cuenta y configura tu huella digital, Face ID o Windows Hello.'
                : 'Usa tu huella digital, Face ID o Windows Hello para iniciar sesión.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2">
            <Icon name="info" className="h-5 w-5 text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {!isRegistering ? (
        /* Login con Passkey */
        <div className="flex flex-1 flex-col gap-6">
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <Icon name="user" className="h-5 w-5" />
                <span>Iniciar Sesión con Passkey</span>
              </>
            )}
          </button>

          <p className="text-center text-xs font-semibold text-slate-500">
            Al iniciar sesión, se solicitará tu autenticación biométrica
          </p>
        </div>
      ) : (
        /* Registro */
        <form onSubmit={handleRegister} className="flex flex-1 flex-col gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-700">
              Nombre de usuario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
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
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder="tu@correo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full rounded-2xl bg-brand-500 py-4 text-center text-lg font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <Icon name="user" className="h-5 w-5" />
                <span>Crear Cuenta con Passkey</span>
              </>
            )}
          </button>

          <p className="text-center text-xs font-semibold text-slate-500">
            Se te pedirá configurar tu autenticación biométrica después del registro
          </p>
        </form>
      )}
    </div>
  )
}

export default LoginScreen
