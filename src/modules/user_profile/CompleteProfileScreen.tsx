import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Card, Input, PageHeader } from '../../components/ui'
import ConfirmDialog from '../../components/ConfirmDialog'
import Icon from '../../components/Icon'
import { AfiliacionSelector } from './components/AfiliacionSelector'
import { AvatarUpload } from './components/AvatarUpload'
import { ProfileRoleBadge } from './components/ProfileRoleBadge'
import { useProfileForm } from './hooks/useProfileForm'

export function CompleteProfileScreen() {
  const { user } = useAuth()
  return <ProfileForm key={user?.auth_id} />
}

const affiliationOptions = [
  { value: 'NINGUNA', label: 'Sin afiliación', description: 'Participa a título personal.', icon: 'user' },
  { value: 'ORGANIZACION_REGISTRADA', label: 'Organización del catálogo', description: 'Busca y selecciona una organización.', icon: 'users' },
  { value: 'OTRA', label: 'Otra', description: 'Escribe el nombre de tu organización.', icon: 'note' },
] as const

function ProfileForm() {
  const { user, updateUserFromBackend } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isEditing = pathname === '/app/edit-profile'
  const form = useProfileForm()
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const backTo = isEditing ? '/app/profile' : '/app/home'
  const leave = () => { if (!form.saving && !photoUploading) navigate(backTo, { replace: true }) }
  const requestLeave = () => {
    if (form.saving || photoUploading) return
    if (form.dirty) setConfirmLeave(true); else leave()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (photoUploading) return
    if (await form.save()) navigate(isEditing ? '/app/profile' : '/app/home', { replace: true, state: { profileUpdated: true } })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-6">
      <PageHeader eyebrow="Mi cuenta" title={isEditing ? 'Editar perfil' : 'Tu perfil en R3foresta'}
        subtitle="Un nombre para reconocerte y una afiliación si deseas compartirla." onBack={requestLeave} />
      {form.loading ? (
        <Card className="space-y-5 py-8" aria-busy="true">
          <p role="status" className="text-center text-sm font-semibold text-brand-600">Cargando tu perfil…</p>
          <div aria-hidden="true" className="motion-safe:animate-pulse space-y-4">
            <div className="mx-auto h-24 w-24 rounded-full bg-brand-100" />
            <div className="h-12 rounded-2xl bg-neutral-100" /><div className="h-12 rounded-2xl bg-neutral-100" />
          </div>
        </Card>
      ) : !form.perfil ? (
        <Card className="space-y-4 py-8 text-center">
          <Icon name="alert" className="mx-auto h-9 w-9 text-warning-600" />
          <h2 className="text-lg font-bold text-brand-700">No pudimos cargar tu perfil</h2>
          <p role="alert" className="text-sm text-neutral-600">{form.error}</p>
          <Button leftIcon="refresh" onClick={form.retry}>Reintentar lectura</Button>
        </Card>
      ) : (
        <form noValidate onSubmit={event => void submit(event)} className="space-y-5">
          <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:p-6">
            <AvatarUpload currentPhotoUrl={user?.foto_perfil_url} disabled={form.saving} onUploadingChange={setPhotoUploading}
              onUploadSuccess={() => updateUserFromBackend().then(() => undefined)} />
            <div className="min-w-0 space-y-2 text-center sm:pt-2 sm:text-left">
              <p className="text-sm font-bold text-brand-700">Tu foto de perfil</p>
              <p className="text-xs leading-relaxed text-neutral-500">Es opcional y se guarda al subirla.</p>
              <ProfileRoleBadge rol={form.perfil.rol_global} />
              <p className="text-xs leading-relaxed text-neutral-500">Tu rol es informativo. La afiliación no cambia tus permisos.</p>
            </div>
          </Card>
          <Card as="section" className="space-y-5 sm:p-6" aria-labelledby="datos-personales-title">
            <div><h2 id="datos-personales-title" className="text-base font-bold text-brand-700">¿Cómo te llamas?</h2>
              <p className="mt-1 text-sm text-neutral-500">Solo el nombre es obligatorio.</p></div>
            <ProfileInput id="nombre" label="Nombre" required value={form.nombre} limit={100}
              error={form.errors.nombre} disabled={form.disabled} autoComplete="given-name"
              onChange={form.setNombre} onBlur={() => form.touch('nombre')} />
            <ProfileInput id="apellido" label="Apellido (opcional)" value={form.apellido} limit={30}
              error={form.errors.apellido} disabled={form.disabled} autoComplete="family-name"
              onChange={form.setApellido} onBlur={() => form.touch('apellido')} />
          </Card>
          <Card as="section" className="space-y-4 sm:p-6" aria-labelledby="afiliacion-title">
            <fieldset disabled={form.disabled} aria-describedby="afiliacion-hint" className="space-y-4">
              <legend id="afiliacion-title" className="text-base font-bold text-brand-700">Afiliación (opcional)</legend>
              <p id="afiliacion-hint" className="text-sm leading-relaxed text-neutral-500">Puedes continuar sin una organización. Elige cómo quieres aparecer en tu perfil.</p>
              <div className="space-y-2">
                {affiliationOptions.map(option => (
                  <label key={option.value} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-brand-400 ${form.tipo === option.value ? 'border-brand-300 bg-brand-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <input type="radio" name="afiliacion" value={option.value} checked={form.tipo === option.value}
                      onChange={() => form.setTipo(option.value)} className="h-4 w-4 shrink-0 accent-brand-600" />
                    <Icon name={option.icon} className="h-5 w-5 shrink-0 text-brand-500" />
                    <span className="min-w-0"><span className="block text-sm font-semibold text-brand-700">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">{option.description}</span></span>
                  </label>
                ))}
              </div>
              {form.tipo === 'ORGANIZACION_REGISTRADA' && <AfiliacionSelector selected={form.organizacion} disabled={form.disabled} onSelect={form.setOrganizacion} />}
              {form.tipo === 'OTRA' && <ProfileInput id="otra-organizacion" label="Nombre de otra organización" value={form.otra} limit={150}
                error={form.errors.afiliacion} disabled={form.disabled} autoComplete="organization"
                onChange={form.setOtra} onBlur={() => form.touch('afiliacion')}
                hint="Este nombre se guarda en tu perfil. No crea una organización en el catálogo." />}
              {form.tipo === 'ORGANIZACION_REGISTRADA' && form.errors.afiliacion && <p role="alert" className="text-sm font-semibold text-danger-700">{form.errors.afiliacion}</p>}
            </fieldset>
          </Card>
          {form.error && <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{form.error}</div>}
          <div className="space-y-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 sm:p-5">
            <p role="status" className="text-center text-xs text-neutral-500">{form.saving ? 'Guardando tu perfil…' : photoUploading ? 'Espera a que termine de guardarse la foto.' : form.dirty ? 'Tienes cambios sin guardar.' : 'No necesitas documento ni wallet para completar tu perfil.'}</p>
            <Button type="submit" fullWidth size="lg" loading={form.saving} disabled={form.disabled || photoUploading || !form.nombre.trim()} leftIcon="check">{form.saving ? 'Guardando…' : 'Guardar perfil'}</Button>
            <Button variant="ghost" fullWidth disabled={form.saving || photoUploading} onClick={requestLeave}>{isEditing ? 'Cancelar' : 'Volver al inicio'}</Button>
          </div>
        </form>
      )}
      <ConfirmDialog open={confirmLeave} title="¿Salir sin guardar?" description="Los cambios de nombre y afiliación se perderán."
        confirmLabel="Salir sin guardar" cancelLabel="Seguir editando" onConfirm={leave} onCancel={() => setConfirmLeave(false)} />
    </div>
  )
}

type ProfileInputProps = {
  id: string; label: string; value: string; limit: number; error?: string; hint?: string
  required?: boolean; disabled: boolean; autoComplete: string
  onChange: (value: string) => void; onBlur: () => void
}
function ProfileInput({ id, label, value, limit, error, hint, onChange, onBlur, ...props }: ProfileInputProps) {
  const count = [...value.normalize('NFC').trim()].length
  const visibleError = error || (count > limit ? `Admite hasta ${limit} caracteres. Ajusta el texto para guardarlo completo.` : undefined)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-brand-700">{label}{props.required && <span className="ml-1 text-danger-500" aria-hidden="true">*</span>}</label>
        <span aria-hidden="true" className={`shrink-0 text-xs ${count > limit ? 'font-bold text-danger-600' : 'text-neutral-400'}`}>{count}/{limit}</span>
      </div>
      <Input id={id} value={value} onChange={event => onChange(event.target.value)} onBlur={onBlur}
        error={Boolean(visibleError)} aria-invalid={Boolean(visibleError)} aria-describedby={`${id}-hint`} {...props} />
      <p id={`${id}-hint`} className={`text-xs leading-relaxed ${visibleError ? 'font-semibold text-danger-700' : 'text-neutral-500'}`}>{visibleError || hint || `Hasta ${limit} caracteres.`}</p>
    </div>
  )
}
