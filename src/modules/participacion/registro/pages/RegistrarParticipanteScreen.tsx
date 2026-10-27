import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import SuccessModal from '../../../../components/SuccessModal'
import { Button, Card } from '../../../../components/ui'
import { useAuth } from '../../../../contexts/AuthContext'
import StepFooter from '../../../plantacion/components/registro/StepFooter'
import WizardHeader from '../../../plantacion/components/registro/WizardHeader'
import { validarId } from '../../api/participacion.contract'
import { useRegistroCommand } from '../../commands/useRegistroCommand'
import type { RegistroDraft } from '../../commands/registrationDraftStore'
import RegistroCommandStatus from '../components/RegistroCommandStatus'
import RegistroLocation from '../components/RegistroLocation'
import RegistroParticipants from '../components/RegistroParticipants'
import RegistroPhotos from '../components/RegistroPhotos'
import RegistroSpeciesStep from '../components/RegistroSpeciesStep'
import RegistroSummary from '../components/RegistroSummary'
import { useRegistroContext } from '../hooks/useRegistroContext'
import { safeParticipacionReturn, subcampaniaDetailPath } from '../../utils/detailNavigation'
import type { PersonaMinima } from '../../types'

const titles = { 1: 'Fotos y ubicación', 2: 'Especies y cantidades', 3: 'Participantes y confirmación' }
function validScopeId(value: string | undefined): string | null {
  try { return value ? validarId(value) : null } catch { return null }
}
function registrationReturnTo(state: unknown): string {
  if (state && typeof state === 'object' && 'participacionReturnTo' in state) {
    const destination = safeParticipacionReturn(state.participacionReturnTo)
    if (destination) return destination
  }
  return '/app/participacion/registrar'
}
function registrationSuccessReturnTo(returnTo: string, scopeId: string): string {
  const detail = subcampaniaDetailPath(scopeId)
  if (returnTo === detail || returnTo.startsWith(`${detail}?`)) return returnTo
  if (returnTo.startsWith('/participar?') && new URLSearchParams(returnTo.slice('/participar?'.length)).get('subcampania_id') === scopeId) return returnTo
  return detail
}
function startsNewRegistration(state: unknown): boolean {
  return Boolean(state && typeof state === 'object' && 'registroIntent' in state && state.registroIntent === 'nuevo')
}

export default function RegistrarParticipanteScreen() {
  const { user } = useAuth()
  const { subcampaniaId } = useParams()
  const scopeId = validScopeId(subcampaniaId)
  if (!scopeId) return <div className="p-5"><Card><p role="alert" className="text-sm text-danger-700">La subcampaña indicada no es válida.</p></Card></div>
  return <RegistrarParticipante key={`${user?.id}:${scopeId}`} actorId={user?.id ?? null} scopeId={scopeId} />
}

function RegistrarParticipante({ actorId, scopeId }: { actorId: string | null; scopeId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = registrationReturnTo(location.state)
  const newRegistrationEntry = startsNewRegistration(location.state)
  const { user, login } = useAuth()
  const command = useRegistroCommand(actorId, scopeId)
  const editableStage = ['draft', 'prepared', 'preparing', 'uploading'].includes(command.state)
  const captureStage = editableStage && !command.cancelRequested && !command.pending?.payload && !command.receipt
  const contextState = useRegistroContext(actorId, scopeId, captureStage && !command.receipt && !command.pending?.payload)
  const context = contextState.context
  const { draft, files } = command
  const [people, setPeople] = useState<Record<string, PersonaMinima>>({})
  const visiblePeople = { ...Object.fromEntries((draft.participantes_ui ?? []).map((person) => [person.usuario_id, person])), ...people }
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [newIntentOpen, setNewIntentOpen] = useState(false)
  const [removePhoto, setRemovePhoto] = useState<string | null>(null)
  const disabled = command.busy || !editableStage || !context || context.disponibilidad === 'SIN_STOCK'
  const readyPhotos = files.filter((photo) => (photo.carga?.estado === 'DISPONIBLE' || photo.carga?.estado === 'VINCULADA') && photo.carga.evidencia_id !== null).length
  const validCoordinates = draft.latitud !== null && draft.longitud !== null && Number.isFinite(draft.latitud) && Number.isFinite(draft.longitud) && Math.abs(draft.latitud) <= 90 && Math.abs(draft.longitud) <= 180
  const responsible = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || user?.username || `Cuenta ${actorId}`
  const quantitiesValid = context && draft.especies.length > 0 && draft.especies.every((species) => Number.isSafeInteger(species.cantidad) && species.cantidad > 0 && context.especies.some((current) => current.planta_id === species.planta_id && species.cantidad <= current.saldo_elegible))
  const dateValid = context && draft.fecha_plantacion >= context.reglas.fecha_minima_ventana && draft.fecha_plantacion <= context.reglas.fecha_maxima
  const reviewedCurrentPlan = context && draft.plan_revision_revisada === context.subcampania.plan_revision
  const canConfirm = !disabled && draft.gps_confirmado && validCoordinates && quantitiesValid && dateValid && reviewedCurrentPlan && readyPhotos > 0 && readyPhotos === files.length && readyPhotos <= 10 && (draft.observaciones?.length ?? 0) <= 2000

  const updateDraft = command.updateDraft
  const upload = command.upload
  const { busy: commandBusy, state: commandState, receipt: commandReceipt, newIntent: beginNewIntent } = command
  const autoUpload = useRef<string | null>(null)
  const entryHandled = useRef(false)
  useEffect(() => {
    if (!newRegistrationEntry) { entryHandled.current = false; return }
    if (commandBusy || commandState === 'loading') return
    if (!entryHandled.current) {
      entryHandled.current = true
      if (commandReceipt?.estado === 'CONFIRMADO') {
        void beginNewIntent()
        return
      }
    }
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: { participacionReturnTo: returnTo },
    })
  }, [commandBusy, commandState, commandReceipt, beginNewIntent, location.pathname, location.search, location.hash, navigate, newRegistrationEntry, returnTo])
  useEffect(() => {
    if (disabled || files.length === 0 || readyPhotos === files.length || files.some((photo) => photo.error)) return
    const selection = files.map((photo) => photo.carga_id).join(',')
    if (autoUpload.current === selection) return
    autoUpload.current = selection
    void upload()
  }, [disabled, files, readyPhotos, upload])
  useEffect(() => {
    if (context && draft.fecha_plantacion === '' && captureStage && !command.busy) void updateDraft({ fecha_plantacion: context.reglas.hoy_operativo })
  }, [context, draft.fecha_plantacion, captureStage, command.busy, updateDraft])

  function update(patch: Partial<RegistroDraft>) { setLocalError(null); setConfirmOpen(false); void command.updateDraft(patch) }
  function selectParticipants(ids: string[]) { update({ coresponsable_ids: ids, participantes_ui: ids.flatMap((id) => visiblePeople[id] ? [visiblePeople[id]] : []) }) }
  function back() {
    if (captureStage && draft.step > 1 && !command.busy) update({ step: (draft.step - 1) as 1 | 2 })
    else setExitOpen(true)
  }
  function nextFromLocation() {
    if (disabled) return
    if (!validCoordinates) { setLocalError('Indica una coordenada válida antes de confirmar la ubicación.'); return }
    if (files.length < 1 || readyPhotos !== files.length) { setLocalError('Añade al menos una foto y espera a que termine de subir.'); return }
    update({ gps_confirmado: true, step: 2 })
  }
  async function confirm() {
    if (!canConfirm || !draft.plan_revision_revisada || draft.latitud === null || draft.longitud === null) return
    setConfirmOpen(false); setLocalError(null)
    await command.confirm({ plan_revision_esperada: draft.plan_revision_revisada, fecha_plantacion: draft.fecha_plantacion, latitud: draft.latitud, longitud: draft.longitud, especies: draft.especies, coresponsable_ids: draft.coresponsable_ids, observaciones: draft.observaciones, ...(draft.afiliaciones_declaradas ? { afiliaciones_declaradas: draft.afiliaciones_declaradas } : {}) })
  }
  async function recoverSession() {
    setLocalError(null)
    try { await login(); await command.recover(); contextState.refresh() } catch (error) { setLocalError(error instanceof Error ? error.message : 'No se pudo recuperar la sesión.') }
  }
  async function newIntent() {
    setNewIntentOpen(false); setLocalError(null)
    await command.newIntent()
    contextState.refresh()
  }
  async function discard() {
    setExitOpen(false)
    const cancelled = await command.cancel()
    if (cancelled) navigate(returnTo)
  }
  function addFiles(selected: File[]) {
    const valid = selected.filter((file) => file.size >= 1 && file.size <= 10 * 1024 * 1024)
    setLocalError(valid.length !== selected.length ? 'Cada foto debe pesar entre 1 byte y 10 MiB. Los archivos fuera del límite no se agregaron.' : null)
    if (valid.length) void command.addFiles(valid)
  }

  if (newRegistrationEntry && command.receipt?.estado === 'CONFIRMADO') {
    return <div role="status" className="p-5 text-sm text-neutral-600">Iniciando otra plantación…</div>
  }

  if (command.receipt?.estado === 'CONFIRMADO') {
    const total = command.receipt.resultado.cantidad_total_plantada
    return <SuccessModal
      title="Plantación registrada"
      description="Tu plantación se guardó correctamente."
      summaryText={`${total} ${total === 1 ? 'planta registrada' : 'plantas registradas'}`}
      primaryLabel="Volver a la campaña"
      secondaryLabel="Registrar otra plantación"
      onPrimaryAction={() => navigate(registrationSuccessReturnTo(returnTo, scopeId), { replace: true })}
      onSecondaryAction={() => void newIntent()}
      loading={command.busy}
      errorMessage={command.error}
    />
  }

  return <div className="mx-auto min-h-dvh max-w-3xl">
    <WizardHeader paso={draft.step} totalPasos={3} title={command.receipt ? 'Resultado de la plantación' : command.cancelRequested ? 'Descarte pendiente' : command.pending?.payload ? 'Guardado pendiente' : titles[draft.step]} onBack={back} subcampaniaNombre={context?.subcampania.nombre ?? `Subcampaña ${scopeId}`} subcampaniaDetalle={context?.subcampania.campania_nombre} />
    <div className="space-y-4 px-5 pt-5">
      <RegistroCommandStatus state={command.state} pending={command.pending} cancelRequested={command.cancelRequested} receipt={command.receipt} busy={command.busy} error={command.error} fileCount={files.length} onRecover={() => { autoUpload.current = null; void command.recover() }} onUpload={() => void command.upload()} onRetry={() => void command.retrySame()} onRetryCancel={() => void command.cancel()} onNewIntent={() => setNewIntentOpen(true)} onLogin={() => void recoverSession()} />
      {localError && <p role="alert" className="text-sm text-danger-700">{localError}</p>}
      {contextState.loading && <Card><p role="status" className="text-sm text-neutral-600">Consultando contexto autorizado de esta subcampaña…</p></Card>}
      {contextState.error && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{contextState.error}</p>{contextState.errorCode === 'CONTEXTO_INCOMPLETO' ? <p className="text-sm text-neutral-700">El equipo responsable debe revisar el plan de especies, el polígono y la fecha operativa de entrega del stock de esta subcampaña. No sabemos cuál de esos datos falta. Tu borrador permanece en este dispositivo; cuando lo corrijan, vuelve a consultar.</p> : <p className="text-xs text-neutral-600">No se interpretó el error como falta de stock. El borrador y el comando conservan su identidad.</p>}<Button variant="secondary" onClick={() => { if (contextState.sessionExpired) void recoverSession(); else contextState.refresh() }}>{contextState.sessionExpired ? 'Recuperar sesión con passkey' : 'Volver a consultar contexto'}</Button><Button variant="ghost" onClick={() => setExitOpen(true)}>Salir conservando el borrador</Button></Card>}
      {context?.disponibilidad === 'SIN_STOCK' && <Card className="space-y-3"><h2 className="font-bold text-brand-800">Sin stock disponible para plantación inicial</h2><p className="text-sm text-neutral-700">Tu autorización se conserva. No hay saldo elegible disponible en esta subcampaña.</p><Button variant="secondary" onClick={contextState.refresh}>Consultar disponibilidad otra vez</Button></Card>}
      {context && !command.receipt && captureStage && <>
        {draft.step === 1 && <>
          <RegistroPhotos identity={command.pending} files={files} disabled={disabled} busy={command.busy} onAdd={addFiles} onRemove={setRemovePhoto} onUpload={() => void command.upload()} />
          <RegistroLocation context={context} latitude={draft.latitud} longitude={draft.longitud} disabled={disabled} onChange={(latitude, longitude) => update({ latitud: latitude, longitud: longitude, gps_confirmado: false })} />
          <StepFooter label={command.busy && files.length > 0 ? 'Subiendo fotos…' : 'Continuar'} disabled={disabled} onClick={nextFromLocation} hint={command.busy ? 'Tus fotos se están cargando automáticamente.' : 'Confirma que el punto corresponde al lugar donde plantaste.'} />
        </>}
        {draft.step === 2 && <RegistroSpeciesStep key={context.subcampania.plan_revision} context={context} values={draft} disabled={disabled} onChange={update} onBack={() => update({ step: 1 })} onNext={() => update({ step: 3, plan_revision_revisada: context.subcampania.plan_revision })} />}
        {draft.step === 3 && <>
          {actorId && <RegistroParticipants actorId={actorId} scopeId={scopeId} selected={draft.coresponsable_ids} disabled={disabled} onChange={selectParticipants} onNames={(rows) => setPeople((current) => ({ ...current, ...Object.fromEntries(rows.map((person) => [person.usuario_id, person])) }))} />}
          {draft.coresponsable_ids.length > 0 && <Card className="space-y-2"><h2 className="font-bold text-brand-800">Selección conservada</h2>{draft.coresponsable_ids.map((id) => <div key={id} className="flex items-center justify-between gap-2 text-sm"><span>{visiblePeople[id]?.nombre ?? `Cuenta ${id}`}</span><Button variant="ghost" size="sm" disabled={disabled} onClick={() => selectParticipants(draft.coresponsable_ids.filter((current) => current !== id))}>Retirar participante {visiblePeople[id]?.nombre ?? id}</Button></div>)}</Card>}
          <RegistroSummary context={context} draft={draft} photoCount={readyPhotos} responsible={responsible} people={visiblePeople} />
          {!canConfirm && <p role="alert" className="text-sm text-danger-700">Revisa los pasos anteriores: se necesita ubicación confirmada, fotos válidas, cantidades y fecha permitidas y el plan revisado actual. La propuesta no se ajustó automáticamente.</p>}
          <Button variant="secondary" disabled={disabled} onClick={() => update({ step: 2 })}>Volver y corregir especies, fecha u observaciones</Button>
          <StepFooter label="Confirmar plantación" disabled={!canConfirm} onClick={() => setConfirmOpen(true)} tone="success" hint="Se registrará una sola plantación con las personas indicadas." />
        </>}
      </>}
    </div>
    <ConfirmDialog open={confirmOpen && Boolean(canConfirm)} title="Confirmar plantación" description="Se guardará el registro y consumirá el stock de esta subcampaña en una sola operación. Revisa antes de confirmar." confirmLabel="Confirmar y guardar plantación" loading={command.busy} onConfirm={() => void confirm()} onCancel={() => setConfirmOpen(false)}>
      <p className="mt-3 text-sm text-neutral-700">{context?.subcampania.campania_nombre} · {context?.subcampania.nombre}<br />Responsable: {responsible}<br />Fecha: {draft.fecha_plantacion}<br />{draft.especies.reduce((sum, species) => sum + species.cantidad, 0)} plantas · {readyPhotos} fotos · {draft.coresponsable_ids.length} participantes adicionales<br />Ubicación: {draft.latitud}, {draft.longitud}</p>
    </ConfirmDialog>
    <ConfirmDialog open={exitOpen} title="Salir de la captura" description="Puedes conservar el borrador privado para retomarlo con esta misma cuenta. Un resultado pendiente conserva su comando y no se descarta al salir." confirmLabel="Conservar borrador y salir" onConfirm={() => navigate(returnTo)} onCancel={() => setExitOpen(false)} loading={command.busy}>
      {!command.pending?.payload && !command.receipt && <div className="mt-3"><Button fullWidth variant="danger" disabled={command.busy} onClick={() => void discard()}>Descartar borrador y cerrar preparación</Button><p className="mt-2 text-xs text-neutral-600">El descarte de una preparación debe quedar confirmado por el servidor antes de eliminar sus fotos locales.</p></div>}
    </ConfirmDialog>
    <ConfirmDialog open={newIntentOpen} title="Revisar una nueva intención" description={command.receipt?.estado === 'RECHAZADO' ? 'Se conservarán los datos y fotos permitidos para revisarlos. La nueva preparación utilizará otras identidades de comando y carga; deberás comprobar el contexto y confirmar otra vez.' : 'El comprobante anterior seguirá siendo recuperable. La nueva captura será una plantación distinta.'} confirmLabel="Comenzar nueva revisión" onConfirm={() => void newIntent()} onCancel={() => setNewIntentOpen(false)} loading={command.busy} />
    <ConfirmDialog open={removePhoto !== null} title="Quitar foto de esta propuesta" description="La foto quedará fuera del envío. Las cargas omitidas se limpian mediante el mecanismo del servidor; no se borran evidencias vinculadas." confirmLabel="Quitar de la propuesta" variant="danger" onConfirm={() => { if (removePhoto) void command.removeFile(removePhoto); setRemovePhoto(null) }} onCancel={() => setRemovePhoto(null)} />
  </div>
}
