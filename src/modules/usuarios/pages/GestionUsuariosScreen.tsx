import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import SuccessModal from '../../../components/SuccessModal'
import { Button, Card, PageHeader, inputClasses } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useParticipacionCapabilities } from '../../participacion/hooks/useParticipacionCapabilities'
import { useRoleCommand } from '../commands/useRoleCommand'
import RoleCommandStatus from '../components/RoleCommandStatus'
import { ROLE_LABELS } from '../components/rolesPresentation'
import { useUsuarioAutoridad, useUsuariosAdministracion, usuariosError, type UsuariosAccessIssue } from '../hooks/useUsuariosAdministracion'
import { ROLES_GLOBALES, type RolGlobal, type UsuarioAdministracion } from '../types'

export default function GestionUsuariosScreen() {
  const { user } = useAuth()
  return <GestionUsuarios key={user?.id ?? 'sin-sesion'} actorId={user?.id ?? null} />
}

function GestionUsuarios({ actorId }: { actorId: string | null }) {
  const { login, updateUserFromBackend } = useAuth()
  const capabilities = useParticipacionCapabilities()
  const refreshCapabilities = capabilities.refresh
  // Recuperar un envío propio sigue disponible si se perdió el rol ADMIN.
  const command = useRoleCommand(actorId)
  const canManage = Boolean(actorId && capabilities.status === 'ready' && capabilities.data?.data.actor.usuario_id === actorId && capabilities.data.data.actor.rol_global === 'ADMIN' && capabilities.data.data.capacidades_globales.asignar_roles)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RolGlobal | ''>('')
  const [filters, setFilters] = useState({ consulta: '', rol_global: '' as RolGlobal | '' })
  const [listVersion, setListVersion] = useState(0)
  const [selected, setSelected] = useState<UsuarioAdministracion | null>(null)
  const [role, setRole] = useState<RolGlobal>('VOLUNTARIO')
  const [reason, setReason] = useState('')
  const [intentionVersion, setIntentionVersion] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [accessIssue, setAccessIssue] = useState<UsuariosAccessIssue | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [closedSuccess, setClosedSuccess] = useState<string | null>(null)
  const refreshedReceipt = useRef<string | null>(null)
  const normalizedSearch = search.normalize('NFC').trim()
  const normalizedReason = reason.normalize('NFC').trim()
  const searchValid = !normalizedSearch || [...normalizedSearch].length >= 2 && [...normalizedSearch].length <= 100
  const reasonValid = [...normalizedReason].length >= 3 && [...normalizedReason].length <= 1000
  const dirtyFilters = normalizedSearch !== filters.consulta || roleFilter !== filters.rol_global
  const locked = !canManage || accessIssue !== null || command.state !== 'idle' || command.busy || refreshing
  // El bloqueo de acceso sobrevive a la cancelación de las lecturas que lo originaron.
  const handleAccessIssue = useCallback((issue: UsuariosAccessIssue) => {
    setAccessIssue(issue); setDialogOpen(false); setIntentionVersion((value) => value + 1)
  }, [])
  const users = useUsuariosAdministracion(actorId, canManage && !accessIssue, filters, listVersion, handleAccessIssue)
  const review = useUsuarioAutoridad(actorId, selected?.usuario_id ?? null, !locked && !dirtyFilters && reasonValid, JSON.stringify([role, reason, intentionVersion]), handleAccessIssue)
  const canReview = !locked && !dirtyFilters && selected !== null && reasonValid

  function invalidateReview() {
    setDialogOpen(false); setIntentionVersion((value) => value + 1); setLocalError(null)
  }

  function clearSelection() {
    setSelected(null); setReason(''); invalidateReview()
  }

  useEffect(() => {
    const receipt = command.receipt
    if (!receipt || receipt.comando_id === refreshedReceipt.current) return
    refreshedReceipt.current = receipt.comando_id
    let active = true
    const refreshes = [refreshCapabilities()]
    if (receipt.estado === 'CONFIRMADO' && receipt.resultado.usuario_id === actorId) refreshes.push(updateUserFromBackend().then(() => undefined))
    void Promise.allSettled(refreshes).then((results) => {
      if (active) {
        const failure = results.find((result) => result.status === 'rejected')
        if (failure?.status === 'rejected') setLocalError(`El resultado se conserva. ${usuariosError(failure.reason)}`)
        setSelected(null); setReason(''); setDialogOpen(false)
        setIntentionVersion((value) => value + 1); setListVersion((value) => value + 1)
      }
    })
    return () => { active = false }
  }, [actorId, command.receipt, refreshCapabilities, updateUserFromBackend])

  async function refresh() {
    clearSelection(); setRefreshing(true)
    try { await refreshCapabilities(); setAccessIssue(null); setListVersion((value) => value + 1) }
    catch (error) { setLocalError(usuariosError(error)) }
    finally { setRefreshing(false) }
  }

  async function resetTerminal() {
    clearSelection()
    try { await command.resetTerminal(); await refresh() }
    catch (error) { setLocalError(usuariosError(error)) }
  }

  async function recoverSession() {
    setLocalError(null); setRefreshing(true)
    try {
      await login()
      if (command.pending) await command.recover()
      await refreshCapabilities()
      setAccessIssue(null)
      setListVersion((value) => value + 1)
    } catch (error) { setLocalError(usuariosError(error)) }
    finally { setRefreshing(false) }
  }

  async function reviewChange() {
    if (!canReview) return
    const authority = await review.read()
    if (authority) setDialogOpen(true)
  }

  async function confirm() {
    if (!canReview || !selected || !review.data || !dialogOpen) return
    setDialogOpen(false)
    await command.confirm({ usuario_id: selected.usuario_id, rol_global: role, revision_esperada: review.data.revision_autoridad, motivo: normalizedReason })
  }

  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-6">
    <PageHeader eyebrow="Administración" title="Usuarios y permisos" subtitle="Escoge un usuario y asigna su rol global" />
    <RoleCommandStatus command={command} onReset={() => void resetTerminal()} onLogin={() => void recoverSession()} />
    {localError && <p role="alert" className="text-sm text-danger-700">{localError}</p>}
    {accessIssue && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{accessIssue.message}</p><Button variant="secondary" loading={refreshing} onClick={() => void (accessIssue.status === 401 ? recoverSession() : refresh())}>{accessIssue.status === 401 ? 'Recuperar sesión con passkey' : 'Revisar permisos'}</Button></Card>}
    {capabilities.status === 'loading' && <Card><p role="status" className="text-sm text-neutral-600">Verificando tus permisos…</p></Card>}
    {(capabilities.status === 'error' || capabilities.status === 'sessionExpired') && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{capabilities.error ?? 'No se pudo verificar tu autorización.'}</p><Button variant="secondary" onClick={() => void (capabilities.status === 'sessionExpired' ? recoverSession() : refresh())}>{capabilities.status === 'sessionExpired' ? 'Recuperar sesión con passkey' : 'Reintentar permisos'}</Button></Card>}
    {capabilities.status === 'ready' && !canManage && <Card><p className="text-sm text-neutral-700">Solo los administradores globales pueden gestionar los roles de usuarios.</p></Card>}
    {canManage && !accessIssue && <>
      <Card as="section" className="space-y-4">
        <h2 className="font-bold text-brand-800">1. Escoger usuario</h2>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!locked && searchValid) { clearSelection(); setFilters({ consulta: normalizedSearch, rol_global: roleFilter }); setListVersion((value) => value + 1) } }}>
          <label className="block text-sm font-semibold text-brand-800">Buscar por nombre o usuario<input value={search} maxLength={100} disabled={locked} onChange={(event) => { setSearch(event.target.value); clearSelection() }} className={inputClasses(!searchValid)} autoComplete="off" /></label>
          {!searchValid && <p className="text-sm text-danger-700">Escribe al menos 2 caracteres o deja la búsqueda vacía.</p>}
          <label className="block text-sm font-semibold text-brand-800">Filtrar por rol<select value={roleFilter} disabled={locked} onChange={(event) => { setRoleFilter(event.target.value as RolGlobal | ''); clearSelection() }} className={inputClasses(false)}><option value="">Todos los roles</option>{ROLES_GLOBALES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}</select></label>
          <div className="flex flex-wrap gap-2"><Button type="submit" variant="secondary" disabled={locked || !searchValid}>Buscar usuarios</Button><Button variant="ghost" disabled={locked} onClick={() => void refresh()}>Actualizar lista</Button></div>
        </form>
        {dirtyFilters && <p className="text-sm text-neutral-600">Aplica la búsqueda para escoger una cuenta.</p>}
        {users.loading && <p role="status" className="text-sm text-neutral-600">Consultando usuarios…</p>}
        {users.error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">{users.error}</p><Button variant="secondary" onClick={() => void (users.sessionExpired ? recoverSession() : refresh())}>{users.sessionExpired ? 'Recuperar sesión con passkey' : 'Reintentar lista'}</Button></div>}
        {!users.loading && !users.error && users.rows.length === 0 && <p className="text-sm text-neutral-600">No hay usuarios activos que coincidan con la búsqueda.</p>}
        <ul className="space-y-2">{users.rows.map((person) => <li key={person.usuario_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3"><div className="min-w-0 text-sm"><p className="break-words font-semibold text-brand-800">{person.nombre}</p><p className="break-words text-neutral-600">{person.username ? `@${person.username} · ` : ''}Cuenta {person.usuario_id}</p><p className="text-neutral-600">{ROLE_LABELS[person.rol_global]}</p></div><Button variant={selected?.usuario_id === person.usuario_id ? 'primary' : 'secondary'} size="sm" disabled={locked || dirtyFilters} aria-pressed={selected?.usuario_id === person.usuario_id} aria-label={`Seleccionar a ${person.nombre} (${person.username ?? person.usuario_id})`} onClick={() => { invalidateReview(); setSelected(person); setRole(person.rol_global); setReason('') }}>{selected?.usuario_id === person.usuario_id ? 'Seleccionado' : 'Seleccionar'}</Button></li>)}</ul>
        {users.moreError && <p role="alert" className="text-sm text-danger-700">{users.moreError}</p>}
        {users.cursor && <Button variant="secondary" disabled={locked || dirtyFilters} loading={users.loadingMore} onClick={() => void users.loadMore()}>{users.moreError ? 'Reintentar siguiente página' : 'Cargar más usuarios'}</Button>}
      </Card>
      {selected && <Card as="section" className="space-y-3">
        <h2 className="font-bold text-brand-800">2. Asignar rol</h2>
        <p className="text-sm text-neutral-700">Usuario seleccionado: <strong>{selected.nombre}</strong>{selected.username ? ` · @${selected.username}` : ''}</p>
        <label className="block text-sm font-semibold text-brand-800">Rol a asignar<select value={role} disabled={locked} onChange={(event) => { setRole(event.target.value as RolGlobal); invalidateReview() }} className={inputClasses(false)}>{ROLES_GLOBALES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}</select></label>
        <p className="text-xs text-neutral-600">Cada usuario tiene un rol global.</p>
        <label className="block text-sm font-semibold text-brand-800">Motivo del cambio<textarea value={reason} rows={3} maxLength={1000} disabled={locked} onChange={(event) => { setReason(event.target.value); invalidateReview() }} className={inputClasses(Boolean(reason) && !reasonValid)} /></label>
        <p className="text-xs text-neutral-600">Indica un motivo de 3 a 1000 caracteres.</p>
        {review.error && <p role="alert" className="text-sm text-danger-700">{review.error}</p>}
        <Button disabled={!canReview} loading={review.loading} onClick={() => void reviewChange()}>Revisar cambio de rol</Button>
      </Card>}
    </>}
    <ConfirmDialog open={dialogOpen && Boolean(review.data) && canReview} title="Confirmar cambio de rol" description="Revisa el usuario y el rol antes de confirmar." confirmLabel="Confirmar rol" onConfirm={() => void confirm()} onCancel={() => setDialogOpen(false)}>
      {selected && review.data && <div className="mt-4 space-y-2 text-sm text-neutral-700"><p className="font-semibold">{review.data.nombre}</p><p>{selected.username ? `@${selected.username} · ` : ''}Cuenta {selected.usuario_id}</p><p>Rol actual: <strong>{ROLE_LABELS[review.data.rol_global]}</strong></p><p>Nuevo rol: <strong>{ROLE_LABELS[role]}</strong></p><p className="break-words">Motivo: {normalizedReason}</p></div>}
    </ConfirmDialog>
    {command.receipt?.estado === 'CONFIRMADO' && closedSuccess !== command.receipt.comando_id && <SuccessModal title="Rol confirmado" description={command.receipt.resultado.cambio === 'SIN_CAMBIOS' ? 'El usuario ya tenía el rol solicitado.' : 'El servidor confirmó la asignación.'} summaryText={`${ROLE_LABELS[command.receipt.resultado.rol_anterior]} → ${ROLE_LABELS[command.receipt.resultado.rol_nuevo]}`} primaryLabel="Ver resultado" onPrimaryAction={() => setClosedSuccess(command.receipt!.comando_id)} />}
  </div>
}
