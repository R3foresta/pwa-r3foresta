import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import Icon from '../../components/Icon'
import { AvatarUpload } from './components/AvatarUpload'
import { ProfileRoleBadge } from './components/ProfileRoleBadge'
import { ParticipacionProfileService, type PerfilParticipacion } from './participacion.service'

function PerfilScreen() {
  const { user } = useAuth()
  // Cambiar de cuenta desmonta la vista y cancela la consulta de la anterior.
  return <ProfileView key={user?.auth_id} />
}

function ProfileView() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, updateUserFromBackend } = useAuth()
  const [perfil, setPerfil] = useState<PerfilParticipacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const updated = (location.state as { profileUpdated?: boolean } | null)?.profileUpdated === true

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const current = await ParticipacionProfileService.leer(controller.signal)
        if (!controller.signal.aborted) setPerfil(current)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Revisa tu conexión e intenta de nuevo.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [attempt])

  const fullName = perfil ? [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') : ''
  const hasHistoricalDetails = Boolean(user?.doc_identidad || user?.contacto || user?.wallet_address)

  function handleLogout() {
    logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-32 pt-6 sm:px-6">
      <PageHeader eyebrow="Tu cuenta" title="Mi perfil" subtitle="Tu identidad y afiliación en R3foresta." backTo="/app/home" />
      {updated && (
        <section role="status" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-success-50 p-4 text-success-700 ring-1 ring-success-200">
          <p className="text-sm font-semibold">Tu perfil se actualizó.</p>
          <Button variant="ghost" size="sm" aria-label="Cerrar mensaje de confirmación" onClick={() => navigate(location.pathname, { replace: true, state: null })}>
            <Icon name="x" className="h-4 w-4" />
          </Button>
        </section>
      )}

      {loading && (
        <Card role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-brand-700">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden="true" />
          Cargando tu perfil…
        </Card>
      )}

      {!loading && error && (
        <Card className="space-y-3 border border-danger-100">
          <div role="alert">
            <h2 className="text-base font-semibold text-danger-700">No pudimos cargar tu perfil</h2>
            <p className="mt-1 text-sm text-danger-700">{error}</p>
          </div>
          <Button variant="secondary" leftIcon="refresh" onClick={() => setAttempt(value => value + 1)}>
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && perfil && !error && (
        <div className="space-y-5">
          <Card as="section" padding="lg" aria-label="Identidad de tu perfil">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <AvatarUpload
                  currentPhotoUrl={user?.foto_perfil_url}
                  onUploadSuccess={() => updateUserFromBackend().then(() => undefined)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2 text-center sm:pt-2 sm:text-left">
                <h2 className="break-words text-2xl font-semibold tracking-tight text-brand-800 [overflow-wrap:anywhere]">{fullName}</h2>
                {user?.email && <p className="break-words text-sm text-neutral-600 [overflow-wrap:anywhere]">{user.email}</p>}
                <ProfileRoleBadge rol={perfil.rol_global} />
              </div>
            </div>
            <Button fullWidth leftIcon="note" className="mt-6" onClick={() => navigate('/app/edit-profile')}>
              Editar perfil
            </Button>
          </Card>

          <Card as="section" padding="lg" aria-labelledby="afiliacion-title">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-brand-50 p-2.5 text-brand-600" aria-hidden="true">
                <Icon name="users" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="afiliacion-title" className="text-base font-semibold text-brand-800">Afiliación</h2>
                {perfil.afiliacion ? (
                  <>
                    <p className="mt-2 break-words text-sm font-medium text-neutral-800 [overflow-wrap:anywhere]">{perfil.afiliacion.nombre}</p>
                    <div className="mt-2">
                      <Badge variant="neutral">{perfil.afiliacion.tipo === 'ORGANIZACION_REGISTRADA' ? 'Organización del catálogo' : 'Otra organización'}</Badge>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-neutral-600">Sin afiliación</p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">Es opcional. Puedes actualizarla desde Editar perfil; no cambia tu rol ni concede permisos.</p>
              </div>
            </div>
          </Card>

          <Card as="section" padding="lg" aria-labelledby="cuenta-title">
            <h2 id="cuenta-title" className="text-base font-semibold text-brand-800">Datos de tu cuenta</h2>
            <dl className="mt-4 divide-y divide-neutral-100">
              <ProfileDetail label="Nombre de usuario" value={user?.username || 'No disponible'} />
              <ProfileDetail label="Correo electrónico" value={user?.email || 'No registrado'} />
              <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <dt className="text-sm text-neutral-500">Rol de la cuenta</dt>
                <dd><ProfileRoleBadge rol={perfil.rol_global} /></dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">Tu rol es informativo. Las acciones disponibles dependen de los permisos asignados a tu cuenta.</p>
          </Card>

          {hasHistoricalDetails && (
            <Card padding="none">
              <details className="p-6">
                <summary className="cursor-pointer rounded-lg text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                  Datos adicionales de tu cuenta
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">Datos guardados anteriormente. Son opcionales para completar tu perfil.</p>
                <dl className="mt-3 divide-y divide-neutral-100">
                  {user?.doc_identidad && <ProfileDetail label="Documento de identidad" value={user.doc_identidad} />}
                  {user?.contacto && <ProfileDetail label="Contacto" value={user.contacto} />}
                  {user?.wallet_address && <ProfileDetail label="Wallet" value={user.wallet_address} mono />}
                </dl>
              </details>
            </Card>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <Button variant="ghost" fullWidth leftIcon="x" className="text-danger-700 hover:bg-danger-50" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

function ProfileDetail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <dt className="shrink-0 text-sm text-neutral-500">{label}</dt>
      <dd className={`min-w-0 break-words text-sm text-neutral-800 [overflow-wrap:anywhere] sm:text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

export default PerfilScreen
