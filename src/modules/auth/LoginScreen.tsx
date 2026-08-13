import { useState } from 'react'
import { useWebAuthn } from '../../hooks/useWebAuthn'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'
import { Button } from '../../components/ui'
import heroCanopy from '../../assets/home/hero-canopy.webp'

function LoginScreen() {
  const { login: loginWebAuthn, register: registerWebAuthn, loading, error } = useWebAuthn()
  const { setUser, updateUserFromBackend } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  const handleLogin = async () => {
    try {
      console.log('🔵 LoginScreen: Iniciando login...')
      const result = await loginWebAuthn()
      console.log('✅ LoginScreen: Login exitoso', result)

      // Obtener los datos completos del usuario desde el backend
      if (result.success && result.user) {
        try {
          console.log('📥 Obteniendo datos completos del perfil...')
          const fullUserData = await updateUserFromBackend()
          console.log('✅ LoginScreen: Usuario con datos completos:', fullUserData)
        } catch (error) {
          console.error('❌ Error al obtener datos del perfil, usando datos básicos:', error)
          // Si falla, usar los datos básicos del login
          setUser(result.user)
        }
      }
    } catch (error) {
      console.error('❌ LoginScreen: Error en login:', error)
      // El error ya se muestra a través del hook useWebAuthn
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()

    if (emailError) setEmailError('')

    if (!username.trim() || !email.trim()) {
      return
    }

    if (!email.includes('@')) {
      setEmailError('Ejemplo: pepe@gmail.com')
      return
    }

    try {
      console.log('🔵 LoginScreen: Iniciando registro...')
      const result = await registerWebAuthn(username, email || undefined)
      console.log('✅ LoginScreen: Registro exitoso', result)

      // Para registro nuevo, probablemente no tenga perfil completo aún
      if (result.success && result.user) {
        try {
          console.log('📥 Obteniendo datos del perfil después del registro...')
          const fullUserData = await updateUserFromBackend()
          console.log('✅ LoginScreen: Usuario registrado con datos:', fullUserData)
        } catch (error) {
          console.error('❌ Error al obtener datos del perfil, usando datos básicos:', error)
          // Si falla, usar los datos básicos del registro
          setUser(result.user)
        }
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

          <div className="relative rounded-full border border-white/60 bg-neutral-100/90 p-1 shadow-soft backdrop-blur">
            <div
              className={`absolute top-1 h-[calc(100%-8px)] w-[48%] rounded-full bg-gradient-to-r from-brand-600 to-brand-700 shadow-soft transition-all duration-300 ${isRegistering ? 'translate-x-[104%]' : 'translate-x-[4%]'
                }`}
            />
            <div className="relative z-10 grid grid-cols-2 text-[13px] font-extrabold">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex items-center justify-center gap-1 rounded-full px-4 py-2 transition ${!isRegistering ? 'text-white mix-blend-difference' : 'text-neutral-600'
                  }`}
              >
                <span>Iniciar</span>
                <span className="hidden text-[11px] font-semibold md:inline">sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex items-center justify-center gap-1 rounded-full px-4 py-2 transition ${isRegistering ? 'text-white mix-blend-difference' : 'text-neutral-600'
                  }`}
              >
                <span>Crear</span>
                <span className="hidden text-[11px] font-semibold md:inline">cuenta</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border-l-4 border-danger-500 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700 shadow-soft">
              <div className="flex items-center gap-2">
                <Icon name="info" className="h-5 w-5 text-danger-600" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!isRegistering ? (
            <div className="flex flex-col gap-5">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                leftIcon="user"
                onClick={handleLogin}
              >
                {loading ? 'Autenticando...' : 'Entrar con Passkey'}
              </Button>

              <p className="text-center text-xs font-semibold text-neutral-700">
                Biometría solo cuando sea necesario.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-700">
                  Nombre de usuario <span className="text-danger-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base font-semibold text-neutral-800 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-brand-700">
                    Correo electrónico <span className="text-danger-500">*</span>
                  </label>
                  {emailError && (
                    <span className="text-xs font-semibold text-danger-500">{emailError}</span>
                  )}
                </div>
                <input
                  type="email"
                  required
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
                disabled={loading || !username.trim() || !email.trim()}
              >
                {loading ? 'Registrando...' : 'Crear cuenta con Passkey'}
              </Button>

              <p className="text-center text-xs font-semibold text-neutral-700">
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
