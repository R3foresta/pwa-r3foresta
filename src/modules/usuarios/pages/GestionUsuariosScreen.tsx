import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import SuccessModal from '../../../components/SuccessModal'
import { Button, Card, PageHeader } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useParticipacionCapabilities } from '../../participacion/hooks/useParticipacionCapabilities'
import { useRoleCommand } from '../commands/useRoleCommand'
import RoleCommandStatus from '../components/RoleCommandStatus'
import UsuarioRoleForm from '../components/UsuarioRoleForm'
import UsuariosSelector from '../components/UsuariosSelector'
import { ROLE_LABELS } from '../components/rolesPresentation'
import { useUsuarioAutoridad, useUsuariosAdministracion, usuariosError, type UsuariosAccessIssue } from '../hooks/useUsuariosAdministracion'
import type { RolGlobal, UsuarioAdministracion } from '../types'

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
  const [focusSearch, setFocusSearch] = useState(false)
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
    clearSelection(); setRefreshing(true)
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

  return <div className="mx-auto max-w-2xl space-y-4 px-4 pb-8 pt-5 sm:pt-6">
    <PageHeader eyebrow="Administración" title="Usuarios y permisos" subtitle="Escoge un usuario y asigna su rol global" backTo="/app/home" />
    <RoleCommandStatus command={command} onReset={() => void resetTerminal()} onLogin={() => void recoverSession()} />
    {localError && <p role="alert" className="text-sm text-danger-700">{localError}</p>}
    {accessIssue && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{accessIssue.message}</p><Button variant="secondary" loading={refreshing} onClick={() => void (accessIssue.status === 401 ? recoverSession() : refresh())}>{accessIssue.status === 401 ? 'Recuperar sesión con passkey' : 'Revisar permisos'}</Button></Card>}
    {capabilities.status === 'loading' && <Card><p role="status" className="text-sm text-neutral-600">Verificando tus permisos…</p></Card>}
    {(capabilities.status === 'error' || capabilities.status === 'sessionExpired') && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{capabilities.error ?? 'No se pudo verificar tu autorización.'}</p><Button variant="secondary" onClick={() => void (capabilities.status === 'sessionExpired' ? recoverSession() : refresh())}>{capabilities.status === 'sessionExpired' ? 'Recuperar sesión con passkey' : 'Reintentar permisos'}</Button></Card>}
    {capabilities.status === 'ready' && !canManage && <Card><p className="text-sm text-neutral-700">Solo los administradores globales pueden gestionar los roles de usuarios.</p></Card>}
    {canManage && !accessIssue && command.state === 'idle' && (selected ? (
      <UsuarioRoleForm
        person={selected}
        role={role}
        reason={reason}
        reasonValid={reasonValid}
        locked={locked}
        canReview={canReview}
        loading={review.loading}
        error={review.error}
        onChangeUser={() => { clearSelection(); setFocusSearch(true) }}
        onRoleChange={(value) => { setRole(value); invalidateReview() }}
        onReasonChange={(value) => { setReason(value); invalidateReview() }}
        onReview={() => void reviewChange()}
      />
    ) : (
      <UsuariosSelector
        search={search}
        roleFilter={roleFilter}
        searchValid={searchValid}
        dirtyFilters={dirtyFilters}
        locked={locked}
        focusSearch={focusSearch}
        users={users}
        onSearchChange={(value) => { setSearch(value); clearSelection() }}
        onRoleFilterChange={(value) => { setRoleFilter(value); clearSelection() }}
        onSearch={() => { clearSelection(); setFilters({ consulta: normalizedSearch, rol_global: roleFilter }); setListVersion((value) => value + 1) }}
        onRefresh={() => void refresh()}
        onRetry={() => void (users.sessionExpired ? recoverSession() : refresh())}
        onSelect={(person) => { invalidateReview(); setSelected(person); setRole(person.rol_global); setReason(''); setFocusSearch(false) }}
      />
    ))}
    <ConfirmDialog open={dialogOpen && Boolean(review.data) && canReview} title="Confirmar cambio de rol" description="Revisa el usuario y el rol antes de confirmar." confirmLabel="Confirmar rol" onConfirm={() => void confirm()} onCancel={() => setDialogOpen(false)}>
      {selected && review.data && <div className="mt-4 space-y-2 text-sm text-neutral-700"><p className="font-semibold">{review.data.nombre}</p><p>{selected.username ? `@${selected.username} · ` : ''}Cuenta {selected.usuario_id}</p><p>Rol actual: <strong>{ROLE_LABELS[review.data.rol_global]}</strong></p><p>Nuevo rol: <strong>{ROLE_LABELS[role]}</strong></p><p className="break-words">Motivo: {normalizedReason}</p></div>}
    </ConfirmDialog>
    {command.receipt?.estado === 'CONFIRMADO' && closedSuccess !== command.receipt.comando_id && <SuccessModal title="Rol confirmado" description={command.receipt.resultado.cambio === 'SIN_CAMBIOS' ? 'El usuario ya tenía el rol solicitado.' : 'El servidor confirmó la asignación.'} summaryText={`${ROLE_LABELS[command.receipt.resultado.rol_anterior]} → ${ROLE_LABELS[command.receipt.resultado.rol_nuevo]}`} primaryLabel="Ver resultado" onPrimaryAction={() => setClosedSuccess(command.receipt!.comando_id)} />}
  </div>
}
