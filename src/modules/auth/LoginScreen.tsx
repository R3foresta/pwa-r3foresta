import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWebAuthn } from '../../hooks/useWebAuthn'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import { Button } from '../../components/ui'
import heroCanopy from '../../assets/home/hero-canopy.webp'

function LoginScreen({ initialRegistering = false }: { initialRegistering?: boolean }) {
  const { login: loginWebAuthn, register: registerWebAuthn, loading, error } = useWebAuthn()
  const { sessionError, canRetrySession, retrySession } = useAuth()
  const [isRegistering, setIsRegistering] = useState(initialRegistering)
  const [retrying, setRetrying] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  const handleLogin = async () => {
    try {
      await loginWebAuthn()
    } catch {
      // El hook muestra el error de autenticación.
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()

    if (emailError) setEmailError('')

    if (!username.trim()) {
      return
    }

    if (email.trim() && !email.includes('@')) {
      setEmailError('Ingresa un correo válido, por ejemplo nombre@correo.com.')
      return
    }

    try {
      await registerWebAuthn(username.normalize('NFC').trim(), email.trim())
    } catch {
      // El hook muestra el error de autenticación.
    }
  }

  const handleRetrySession = async () => {
    setRetrying(true)
    try {
      await retrySession()
    } catch {
      // AuthContext muestra el estado de conexión o sesión vencida.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex flex-col">
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
                Sin contraseñas
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-white">Acceso seguro</span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/90">Ingreso</p>
              <h2 className="text-2xl font-semibold leading-tight text-white">Acceso sin contraseñas</h2>
              <p className="mt-1 text-sm leading-5 text-white">Usa tu huella, reconocimiento facial o el bloqueo de tu dispositivo.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-6 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </div>
            <div className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-600">
              Llave de acceso
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-100 p-1">
            <div className="grid grid-cols-2 text-[13px] font-bold">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                aria-pressed={!isRegistering}
                disabled={loading || retrying}
                className={`flex items-center justify-center rounded-xl px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 ${!isRegistering ? 'bg-brand-600 text-white shadow-soft' : 'text-neutral-600'
                  }`}
              >
                <span>Iniciar sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                aria-pressed={isRegistering}
                disabled={loading || retrying}
                className={`flex items-center justify-center rounded-xl px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 ${isRegistering ? 'bg-brand-600 text-white shadow-soft' : 'text-neutral-600'
                  }`}
              >
                <span>Crear cuenta</span>
              </button>
            </div>
          </div>

          {(error || sessionError) && (
            <div role="alert" className="rounded-2xl border-l-4 border-danger-500 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 shadow-soft">
              <div className="flex items-center gap-2">
                <Icon name="info" className="h-5 w-5 text-danger-600" />
                <span>{sessionError || error}</span>
              </div>
              {sessionError && canRetrySession && (
                <button type="button" onClick={handleRetrySession} disabled={retrying || loading} className="mt-2 underline disabled:opacity-50">
                  {retrying ? 'Verificando...' : 'Reintentar verificación'}
                </button>
              )}
            </div>
          )}

          {!isRegistering ? (
            <div className="flex flex-col gap-5">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={retrying}
                leftIcon="user"
                onClick={handleLogin}
              >
                {loading ? 'Confirmando acceso...' : 'Entrar con mi llave de acceso'}
              </Button>

              <p className="text-center text-xs font-semibold text-neutral-700">
                Tu dispositivo te pedirá confirmar con la llave de acceso (passkey) que registraste.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-700">
                Crearás una cuenta de voluntariado. Tu perfil y afiliación son personales; el acceso a tareas operativas se coordina con el equipo de R3foresta.
              </p>
              <div className="space-y-2">
                <label htmlFor="register-username" className="text-sm font-semibold text-brand-700">
                  Nombre de usuario <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  id="register-username"
                  autoComplete="username"
                  disabled={loading || retrying}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="register-email" className="text-sm font-semibold text-brand-700">
                    Correo electrónico <span className="font-normal text-neutral-500">(opcional)</span>
                  </label>
                  {emailError && (
                    <span id="register-email-error" className="text-xs font-semibold text-danger-500">{emailError}</span>
                  )}
                </div>
                <input
                  type="email"
                  id="register-email"
                  autoComplete="email"
                  autoCapitalize="none"
                  disabled={loading || retrying}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'register-email-error' : undefined}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  className={`w-full rounded-2xl border bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:ring-2 ${emailError
                      ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-200'
                      : 'border-neutral-200 focus:border-brand-400 focus:ring-brand-200'
                    }`}
                  placeholder="tu@correo.com"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                leftIcon="user"
                disabled={loading || retrying || !username.trim()}
              >
                {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta'}
              </Button>

              <p className="text-center text-xs font-semibold text-neutral-700">
                Al continuar, guardarás una llave de acceso (passkey) con ayuda de tu dispositivo.
              </p>
            </form>
          )}
          <Link to="/auth/recover" className="block rounded-xl py-2 text-center text-sm font-semibold text-brand-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            Ayuda para ingresar
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
