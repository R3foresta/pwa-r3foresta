import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, Card, PageHeader, inputClasses } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { useAccessCommand } from '../commands/useAccessCommand'
import AccessCommandStatus from '../components/AccessCommandStatus'
import AccessPersonSelector from '../components/AccessPersonSelector'
import AccessReviewSummary from '../components/AccessReviewSummary'
import AccessScopeSelector from '../components/AccessScopeSelector'
import { ACCESS_ACTIONS, accessError, actionDefinition, permitsAction } from '../components/accessPresentation'
import { useAccessReview } from '../hooks/useAccessReview'
import { useParticipacionCapabilities } from '../hooks/useParticipacionCapabilities'
import type { OperacionAcceso, PersonaMinima } from '../types'

export default function GestionAccesosScreen() {
  const { user } = useAuth()
  return <GestionAccesos key={user?.id ?? 'sin-sesion'} actorId={user?.id ?? null} />
}

function GestionAccesos({ actorId }: { actorId: string | null }) {
  const { login } = useAuth()
  const capabilities = useParticipacionCapabilities()
  const refreshCapabilities = capabilities.refresh
  const command = useAccessCommand(actorId)
  const [operation, setOperation] = useState<OperacionAcceso>('OTORGAR_PLANTADOR')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [person, setPerson] = useState<PersonaMinima | null>(null)
  const [replacement, setReplacement] = useState<PersonaMinima | null>(null)
  const [treatment, setTreatment] = useState<'PLANTADOR' | 'SIN_ACCESO'>('SIN_ACCESO')
  const [version, setVersion] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const refreshedReceipt = useRef<string | null>(null)
  const allScopes = capabilities.data?.data.subcampanias ?? []
  const canDesignate = capabilities.data?.data.capacidades_globales.designar_administradores === true
  const actions = ACCESS_ACTIONS.filter((action) => (action.operation === 'OTORGAR_PLANTADOR' || action.operation === 'RETIRAR_PLANTADOR' || canDesignate) && allScopes.some((scope) => scope.acciones[action.capability]))
  const scopes = actions.some((action) => action.operation === operation) ? allScopes.filter((scope) => permitsAction(scope, operation)) : []
  const selectedScopes = scopes.filter((scope) => selectedIds.includes(scope.subcampania_id))
  const selectionCurrent = selectedScopes.length === selectedIds.length
  const selectedKey = JSON.stringify(selectedIds)
  const review = useAccessReview({ operation, scopeIds: selectedIds, person, replacement, treatment, version })
  const locked = command.state !== 'idle' || refreshing || capabilities.status !== 'ready'
  const canReview = !locked && selectionCurrent && selectedIds.length > 0 && person && (operation !== 'REEMPLAZAR_ADMINISTRADOR' || (replacement && replacement.usuario_id !== person.usuario_id))

  useEffect(() => {
    const receipt = command.receipt
    if (!receipt || receipt.comando_id === refreshedReceipt.current) return
    refreshedReceipt.current = receipt.comando_id
    // El recibo histórico no habilita por sí mismo una nueva operación.
    void refreshCapabilities().then(() => setVersion((current) => current + 1)).catch((error: unknown) => setLocalError(accessError(error)))
  }, [command.receipt, refreshCapabilities])

  async function refresh() {
    setRefreshing(true); setLocalError(null); setDialogOpen(false); setVersion((current) => current + 1)
    try { await capabilities.refresh() } catch (error) { setLocalError(accessError(error)) }
    finally { setRefreshing(false) }
  }

  async function resetTerminal() {
    setDialogOpen(false); setLocalError(null); setVersion((current) => current + 1)
    try { await command.resetTerminal(); await refresh() } catch (error) { setLocalError(accessError(error)) }
  }

  async function recoverSession() {
    setLocalError(null)
    try { await login(); await command.recover(); await capabilities.refresh() } catch (error) { setLocalError(accessError(error)) }
  }

  function changeOperation(value: OperacionAcceso) {
    setOperation(value); setSelectedIds([]); setPerson(null); setReplacement(null); setDialogOpen(false); setVersion((current) => current + 1)
  }

  async function confirm() {
    const draft = review.buildDraft()
    if (!draft || !canReview) return
    setDialogOpen(false)
    await command.confirm(draft)
  }

  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-28 pt-6">
    <PageHeader title="Gestión de accesos" eyebrow="Participación" subtitle="Permisos por persona y subcampaña" />
    <p className="text-sm text-neutral-600">Administra permisos de participación. La afiliación y las responsabilidades logísticas se mantienen separadas.</p>
    <AccessCommandStatus state={command.state} pending={command.pending} receipt={command.receipt} error={command.error} busy={command.busy} onRecover={() => void command.recover()} onRetry={() => void command.retrySame()} onReset={() => void resetTerminal()} onLogin={() => void recoverSession()} />
    {localError && <p role="alert" className="text-sm text-danger-700">{localError}</p>}
    {capabilities.status === 'loading' && <Card><p role="status" className="text-sm text-neutral-600">Consultando tus capacidades vigentes…</p></Card>}
    {(capabilities.status === 'error' || capabilities.status === 'sessionExpired') && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{capabilities.error ?? 'No se pudo verificar la autorización actual. Las acciones quedan bloqueadas hasta consultar nuevamente.'}</p><Button variant="secondary" onClick={() => void (capabilities.status === 'sessionExpired' ? recoverSession() : refresh())}>{capabilities.status === 'sessionExpired' ? 'Recuperar sesión con passkey' : 'Reintentar capacidades'}</Button></Card>}
    {capabilities.status === 'ready' && actions.length === 0 && <Card><p className="text-sm text-neutral-700">No tienes acciones de gestión de participación disponibles en las subcampañas actuales.</p></Card>}
    {capabilities.status === 'ready' && actions.length > 0 && <>
      <Card as="section" className="space-y-3">
        <h2 className="font-bold text-brand-800">1. Acción a realizar</h2>
        <label className="block text-sm font-semibold text-brand-800">Acción<select value={actions.some((action) => action.operation === operation) ? operation : ''} disabled={locked} onChange={(event) => changeOperation(event.target.value as OperacionAcceso)} className={inputClasses(false)}><option value="" disabled>Selecciona una acción disponible</option>{actions.map((action) => <option key={action.operation} value={action.operation}>{action.label}</option>)}</select></label>
        <p className="text-sm text-neutral-600">{actionDefinition(operation).consequence}</p>
        <Button variant="ghost" size="sm" disabled={locked} onClick={() => void refresh()}>Actualizar capacidades vigentes</Button>
      </Card>
      <AccessScopeSelector scopes={scopes} selected={selectedIds} disabled={locked} onChange={(ids) => { setSelectedIds(ids); setDialogOpen(false); setVersion((current) => current + 1) }} />
      {!selectionCurrent && <p role="alert" className="text-sm text-danger-700">Cambió la autorización de la selección. Elige nuevamente las subcampañas actuales y revisa sus accesos.</p>}
      {selectedScopes.length > 0 && <AccessPersonSelector key={operation} operation={operation} scopes={selectedScopes} disabled={locked} person={person} replacement={replacement} memberVersion={version} treatment={treatment} onPerson={(value) => { setPerson(value); setReplacement(null); setDialogOpen(false); setVersion((current) => current + 1) }} onReplacement={(value) => { setReplacement(value); setDialogOpen(false); setVersion((current) => current + 1) }} onTreatment={(value) => { setTreatment(value); setDialogOpen(false); setVersion((current) => current + 1) }} />}
      <Card as="section" className="space-y-3">
        <h2 className="font-bold text-brand-800">4. Revisar y confirmar</h2>
        <p className="text-sm text-neutral-600">Consulta los permisos y revisiones actuales antes de confirmar. Cambiar persona, acción o selección exige otra revisión.</p>
        <Button variant="secondary" disabled={!canReview} loading={review.loading} onClick={() => void review.read()}>Consultar accesos para revisar</Button>
        {review.error && <p role="alert" className="text-sm text-danger-700">{review.error}</p>}
        {review.review && <><AccessReviewSummary review={review.review} operation={operation} treatment={treatment} scopes={selectedScopes} /><Button disabled={!canReview || review.loading} onClick={() => setDialogOpen(true)}>Revisar confirmación</Button></>}
      </Card>
    </>}
    <ConfirmDialog key={selectedKey} open={dialogOpen && Boolean(review.review) && Boolean(canReview)} title={actionDefinition(operation).label} description="Confirma la persona y los ámbitos exactos. El servidor valida toda la selección antes de aplicar el cambio." confirmLabel="Confirmar cambio de acceso" variant={operation === 'RETIRAR_PLANTADOR' || operation === 'RETIRAR_ADMINISTRADOR' ? 'danger' : 'default'} onConfirm={() => void confirm()} onCancel={() => setDialogOpen(false)}>
      {review.review && <AccessReviewSummary review={review.review} operation={operation} treatment={treatment} scopes={selectedScopes} />}
    </ConfirmDialog>
  </div>
}
