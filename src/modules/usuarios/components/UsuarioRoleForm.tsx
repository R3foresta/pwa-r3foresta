import { useEffect, useRef } from 'react'
import Icon from '../../../components/Icon'
import { Badge, Button, Card, inputClasses } from '../../../components/ui'
import { ROLES_GLOBALES, type RolGlobal, type UsuarioAdministracion } from '../types'
import { ROLE_LABELS } from './rolesPresentation'

type Props = {
  person: UsuarioAdministracion
  roleLocked?: boolean
  role: RolGlobal
  reason: string
  reasonValid: boolean
  locked: boolean
  canReview: boolean
  loading: boolean
  error: string | null
  onChangeUser: () => void
  onRoleChange: (role: RolGlobal) => void
  onReasonChange: (reason: string) => void
  onReview: () => void
}

export default function UsuarioRoleForm({ person, roleLocked = false, role, reason, reasonValid, locked, canReview, loading, error, onChangeUser, onRoleChange, onReasonChange, onReview }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
    titleRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  return <Card as="section" padding="none" aria-labelledby="usuario-role-title" className="overflow-hidden">
    <div className="space-y-3 border-b border-neutral-100 bg-brand-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 ref={titleRef} id="usuario-role-title" tabIndex={-1} className="font-bold text-brand-800 focus:outline-none">Cambiar rol</h2>
        <Button variant="ghost" size="sm" className="min-h-11" disabled={locked} onClick={onChangeUser}>Cambiar usuario</Button>
      </div>
      <div className="min-w-0">
        <p className="break-words text-lg font-semibold leading-tight text-brand-900">{person.nombre}</p>
        {person.username && <p className="mt-1 break-all text-xs text-neutral-600">@{person.username}</p>}
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-600"><span>Rol actual</span><Badge variant="neutral" size="sm">{ROLE_LABELS[person.rol_global]}</Badge></div>
    </div>
    <form className="space-y-4 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); if (canReview && !loading) onReview() }}>
      <label className="block space-y-1.5 text-sm font-semibold text-brand-800">
        <span>Nuevo rol</span>
        <select value={role} disabled={locked || roleLocked} onChange={(event) => onRoleChange(event.target.value as RolGlobal)} className={inputClasses(false)}>
          {ROLES_GLOBALES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
        </select>
      </label>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="usuario-role-reason" className="text-sm font-semibold text-brand-800">Motivo del cambio</label>
          <span aria-hidden="true" className="text-sm font-semibold text-danger-700">*</span>
        </div>
        <textarea id="usuario-role-reason" value={reason} rows={2} required minLength={3} maxLength={1000} disabled={locked || roleLocked} onChange={(event) => onReasonChange(event.target.value)} className={`${inputClasses(Boolean(reason) && !reasonValid)} resize-y`} placeholder="Indica el motivo por el que se cambia el rol." aria-invalid={Boolean(reason) && !reasonValid} aria-describedby="usuario-role-reason-hint" />
        <p id="usuario-role-reason-hint" className={`flex items-start gap-2 text-xs ${reason && !reasonValid ? 'text-danger-700' : 'text-neutral-600'}`}><span aria-hidden="true"><Icon name="info" className="h-4 w-4 shrink-0 text-brand-700" /></span><span>Escribe un motivo entre 3 y 1000 caracteres para habilitar el cambio.</span></p>
      </div>
      {error && <p role="alert" className="text-sm text-danger-700">{error}</p>}
      <Button type="submit" fullWidth leftIcon="user-refresh" disabled={!canReview} loading={loading}>Cambiar rol</Button>
    </form>
  </Card>
}
