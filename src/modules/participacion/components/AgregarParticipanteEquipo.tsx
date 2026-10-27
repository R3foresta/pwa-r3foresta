import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, inputClasses } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { EquipoActionButton, EquipoMemberCard, EquipoSectionHeading } from '../../plantacion/components/EquipoVisual'
import { useAccessCommand } from '../commands/useAccessCommand'
import { useAccessReview } from '../hooks/useAccessReview'
import type { CapacidadSubcampania, PersonaMinima } from '../types'
import AccessCommandStatus from './AccessCommandStatus'
import AccessPersonSearch from './AccessPersonSearch'
import { accessError, actionDefinition, permissionLabel } from './accessPresentation'

type Props = {
  scope: CapacidadSubcampania
  actorId: string
  globalAdmin: boolean
  canDesignateAdmins: boolean
  heading: string
  onConfirmed: () => Promise<void>
}

const PLANTADOR = 'OTORGAR_PLANTADOR' as const
const ADMINISTRADOR = 'DESIGNAR_ADMINISTRADOR' as const
type OperacionAlta = typeof PLANTADOR | typeof ADMINISTRADOR

export default function AgregarParticipanteEquipo({ scope, actorId, globalAdmin, canDesignateAdmins, heading, onConfirmed }: Props) {
  const { login } = useAuth()
  const command = useAccessCommand(actorId)
  const [open, setOpen] = useState(false)
  const [operation, setOperation] = useState<OperacionAlta>(PLANTADOR)
  const [person, setPerson] = useState<PersonaMinima | null>(null)
  const [version, setVersion] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const refreshedReceipt = useRef<string | null>(null)
  const canAddPlantador = scope.acciones.incorporar_plantador && (globalAdmin || scope.permiso_contextual === 'ADMINISTRADOR_SUBCAMPANIA')
  const canAddAdmin = globalAdmin && canDesignateAdmins && scope.acciones.designar_administrador
  const available: OperacionAlta[] = []
  if (canAddPlantador) available.push(PLANTADOR)
  if (canAddAdmin) available.push(ADMINISTRADOR)
  const currentOperation = available.includes(operation) ? operation : available[0] ?? PLANTADOR
  const review = useAccessReview({ operation: currentOperation, scopeIds: [scope.subcampania_id], person, replacement: null, treatment: 'SIN_ACCESO', version })
  const locked = command.state !== 'idle'
  const canReview = open && !locked && available.includes(currentOperation) && person !== null

  useEffect(() => {
    const receipt = command.receipt
    if (receipt?.estado !== 'CONFIRMADO' || receipt.comando_id === refreshedReceipt.current) return
    refreshedReceipt.current = receipt.comando_id
    if (!receipt.resultado.cambios.some(item => item.subcampania_id === scope.subcampania_id)) return
    void onConfirmed().catch((error: unknown) => setRefreshError(accessError(error)))
  }, [command.receipt, onConfirmed, scope.subcampania_id])

  function chooseOperation(next: OperacionAlta) {
    setOperation(next)
    setPerson(null)
    setDialogOpen(false)
    setVersion((value) => value + 1)
  }

  function choosePerson(next: PersonaMinima | null) {
    setPerson(next)
    setDialogOpen(false)
    setVersion((value) => value + 1)
  }

  function toggle() {
    setOpen((value) => !value)
    setPerson(null)
    setDialogOpen(false)
    setVersion((value) => value + 1)
  }

  async function confirm() {
    const draft = review.buildDraft()
    if (!draft || !canReview) return
    setDialogOpen(false)
    setRefreshError(null)
    await command.confirm(draft)
  }

  async function resetTerminal() {
    await command.resetTerminal()
    setPerson(null)
    setDialogOpen(false)
    setVersion((value) => value + 1)
  }

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <EquipoSectionHeading title={heading} />
      {available.length > 0 && <EquipoActionButton icon={open ? 'check' : 'user'} active={open} disabled={locked} onClick={toggle}>{open ? 'Listo' : 'Agregar participante'}</EquipoActionButton>}
    </div>
    {refreshError && <div className="space-y-2 rounded-2xl bg-warning-50 p-3"><p role="alert" className="text-xs font-semibold text-warning-800">El cambio quedó confirmado, pero no pudimos actualizar el equipo. {refreshError}</p><Button size="sm" variant="secondary" onClick={() => { void onConfirmed().then(() => setRefreshError(null)).catch((error: unknown) => setRefreshError(accessError(error))) }}>Actualizar equipo</Button></div>}
    <AccessCommandStatus state={command.state} pending={command.pending} receipt={command.receipt} error={command.error} busy={command.busy}
      onRecover={() => void command.recover()} onRetry={() => void command.retrySame()} onReset={() => void resetTerminal()}
      onLogin={() => { void login().then(() => command.recover()).catch(() => undefined) }} />
    {open && available.length > 0 && <section className="space-y-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5" aria-label="Agregar participante">
      <div><h3 className="text-sm font-extrabold text-brand-800">Agregar participante</h3><p className="mt-1 text-xs font-semibold text-neutral-500">Solo en {scope.nombre}. Busca una cuenta ya registrada.</p></div>
      {available.length > 1 && <label className="block text-sm font-bold text-brand-800">Permiso
        <select value={currentOperation} onChange={(event) => chooseOperation(event.target.value as OperacionAlta)} disabled={locked} className={inputClasses(false)}>
          <option value={PLANTADOR}>Plantador</option><option value={ADMINISTRADOR}>Administrador de subcampaña</option>
        </select>
      </label>}
      {person ? <EquipoMemberCard as="section" nombre={person.nombre} rol={currentOperation === ADMINISTRADOR ? 'Administrador' : 'Plantador'} subtitle={person.organizacion ?? 'Sin afiliación declarada'}
        action={<Button variant="ghost" size="sm" disabled={locked} onClick={() => choosePerson(null)}>Cambiar</Button>} />
        : <AccessPersonSearch key={`${scope.subcampania_id}:${currentOperation}:${version}`} variant="equipo" action={currentOperation}
          scopeIds={[scope.subcampania_id]} disabled={locked} onSelect={choosePerson} />}
      {review.error && <p role="alert" className="text-sm text-danger-700">{review.error}</p>}
      {person && <Button fullWidth disabled={!canReview} loading={review.loading} onClick={() => { setDialogOpen(true); void review.read() }}>Revisar asignación</Button>}
    </section>}
    <ConfirmDialog open={dialogOpen && Boolean(review.review) && canReview} title="Confirmar asignación" description="Esta acción cambia el permiso de participación en la subcampaña indicada." confirmLabel="Confirmar asignación"
      onConfirm={() => void confirm()} onCancel={() => { setDialogOpen(false); setVersion((value) => value + 1) }}>
      {review.review && <div className="mt-3 space-y-2 rounded-2xl bg-brand-50 p-3 text-sm text-brand-800">
        <p><strong>Persona:</strong> {review.review.target.data.usuario.nombre}</p>
        <p><strong>Subcampaña:</strong> {scope.nombre}</p>
        <p><strong>Permiso actual:</strong> {permissionLabel(review.review.target.data.ambitos[0]?.permiso_contextual ?? null)}</p>
        <p><strong>Permiso solicitado:</strong> {currentOperation === ADMINISTRADOR ? 'Administrador de subcampaña' : 'Plantador'}</p>
        <p className="text-xs text-neutral-600">{actionDefinition(currentOperation).consequence}</p>
      </div>}
    </ConfirmDialog>
  </div>
}
