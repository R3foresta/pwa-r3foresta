import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../../components/Icon'

function PerfilScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/auth/login', { replace: true })
  }

  const truncateWallet = (wallet: string) => {
    if (wallet.length <= 13) return wallet
    return `${wallet.slice(0, 8)}......${wallet.slice(-5)}`
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-white/90 p-2 shadow-sm transition hover:shadow-soft"
          aria-label="Volver"
        >
          <Icon name="arrow-left" className="h-5 w-5 text-brand-700" />
        </button>
        <h1 className="text-xl font-semibold text-brand-700">Mi Perfil</h1>
        <div className="w-10" />{/* Espaciador para centrar el título */}
      </header>

      {/* Información del usuario */}
      <section className="mt-6">
        <div className="rounded-2xl bg-white px-5 py-6 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Icon name="user" className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-brand-700">
                {user?.nombre ? `${user.nombre} ${user.apellido || ''}` : user?.username || 'Usuario'}
              </h2>
              <p className="text-sm text-brand-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Datos personales */}
      <section className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-brand-700">Datos personales</h3>
        <div className="space-y-3">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-600">Nombre de usuario</span>
              <span className="text-sm text-brand-700">{user?.username || 'No definido'}</span>
            </div>
          </div>
          
          <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-600">Correo electrónico</span>
              <span className="text-sm text-brand-700">{user?.email || 'No definido'}</span>
            </div>
          </div>

          {user?.doc_identidad && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-600">Documento</span>
                <span className="text-sm text-brand-700">{user.doc_identidad}</span>
              </div>
            </div>
          )}

          {user?.contacto && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-600">Contacto</span>
                <span className="text-sm text-brand-700">{user.contacto}</span>
              </div>
            </div>
          )}

          {user?.organizacion && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-600">Organización</span>
                <span className="text-sm text-brand-700">{user.organizacion}</span>
              </div>
            </div>
          )}

          {user?.wallet_address && (
            <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-600">Wallet</span>
                <span className="text-sm text-brand-700 font-mono">{truncateWallet(user.wallet_address)}</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-600">Rol</span>
              <span className="text-sm text-brand-700">{user?.rol || 'GENERAL'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Acciones */}
      <section className="mt-6">
        <h3 className="mb-3 text-base font-semibold text-brand-700 text-center">Acciones</h3>
        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={() => navigate('/app/edit-profile')}
            className="w-full max-w-xs flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-center shadow-soft transition hover:bg-gray-50"
          >
            <Icon name="user" className="h-5 w-5 text-brand-600" />
            <span className="text-sm font-medium text-brand-700">Editar perfil</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full max-w-xs flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-6 py-4 text-center shadow-soft transition hover:bg-red-100"
          >
            <Icon name="x" className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Cerrar sesión</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default PerfilScreen