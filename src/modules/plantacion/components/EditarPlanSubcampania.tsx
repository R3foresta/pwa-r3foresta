import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { getPlantacionErrorStatus, PlantacionService } from '../../../services/plantacion.service'
import type { GetPlanData, RevisarPlanData, Subcampania } from '../types/contracts'
import type { PlanFormProposal } from '../utils/planMetaEspeciesForm'
import { clearPlanEditorDraft } from '../utils/planEditorDraft'
import EditarPlanSubcampaniaModal from './EditarPlanSubcampaniaModal'

type Props = {
  subcampania: Subcampania
  authId?: string
  isAdmin: boolean
  onClose: () => void
  onSaved: (saved: RevisarPlanData) => Promise<void>
  onRecoverSession?: () => Promise<void>
}

/** Carga y confirma el plan persistido; las propuestas quedan dentro del modal. */
export default function EditarPlanSubcampania({ subcampania, authId, isAdmin, onClose, onSaved, onRecoverSession }: Props) {
  const [loaded, setLoaded] = useState<{ key: string; plan: GetPlanData } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [refreshReason, setRefreshReason] = useState<'conflict' | 'read_failed' | 'unconfirmed' | null>(null)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [rejectionStatus, setRejectionStatus] = useState<number | null>(null)
  const [recoveringSession, setRecoveringSession] = useState(false)
  const inFlight = useRef(false)
  const reloadRequest = useRef(0)
  const active = useRef(true)
  const key = `${subcampania.id}|${authId ?? ''}`
  const loadFailed = failedKey === key
  const plan = loaded?.key === key ? loaded.plan : null
  // Cambiar de passkey exige otra lectura, pero mantiene la propuesta del
  // mismo plan montada. Una subcampaña distinta nunca reutiliza el formulario.
  const displayedPlan = plan ?? (loaded?.plan.subcampania_id === subcampania.id ? loaded.plan : null)
  const loadingSessionPlan = !plan && !loadFailed
  const allowed = isAdmin && (subcampania.estado === 'BORRADOR' || subcampania.estado === 'ACTIVA')

  useEffect(() => {
    active.current = true
    inFlight.current = false
    return () => { active.current = false; reloadRequest.current += 1 }
  }, [key])

  useEffect(() => {
    let current = true
    PlantacionService.getSubcampaniaPlan(subcampania.id, authId)
      .then((data) => {
        if (!current) return
        setLoaded({ key, plan: data })
        setFailedKey(null)
        setError(null)
        setSubmitting(false)
        setReloading(false)
        setRefreshReason(null)
        setRefreshMessage(null)
        setRejectionStatus(null)
        setRecoveringSession(false)
      })
      .catch((reason: unknown) => {
        if (!current) return
        setFailedKey(key)
        setRecoveringSession(false)
        setRejectionStatus(getPlantacionErrorStatus(reason) ?? null)
        setRefreshReason('read_failed')
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el plan persistido.')
      })
    return () => { current = false }
  }, [subcampania.id, authId, key, attempt])

  const reloadPlan = async () => {
    if (!allowed || rejectionStatus === 401 || rejectionStatus === 403 || rejectionStatus === 404 || inFlight.current || reloading || recoveringSession) return
    const request = ++reloadRequest.current
    setReloading(true)
    setRefreshMessage(null)
    try {
      const data = await PlantacionService.getSubcampaniaPlan(subcampania.id, authId)
      if (!active.current || request !== reloadRequest.current) return
      setLoaded({ key, plan: { ...data } })
      setRefreshReason(null)
      setError(null)
      setRefreshMessage('Plan actual actualizado. Tu propuesta se conservó.')
    } catch (reason) {
      if (active.current && request === reloadRequest.current) {
        const status = getPlantacionErrorStatus(reason)
        setRejectionStatus(status ?? null)
        setRefreshReason('read_failed')
        setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el plan actual.')
      }
    } finally {
      if (active.current && request === reloadRequest.current) setReloading(false)
    }
  }

  const recoverSession = async () => {
    if (!onRecoverSession || rejectionStatus !== 401 || recoveringSession || inFlight.current) return
    const request = ++reloadRequest.current
    setRecoveringSession(true)
    try {
      await onRecoverSession()
      // Recuperar el login solo habilita una lectura; nunca reenvía la escritura.
      const data = await PlantacionService.getSubcampaniaPlan(subcampania.id, authId)
      if (!active.current || request !== reloadRequest.current) return
      setLoaded({ key, plan: { ...data } })
      setFailedKey(null)
      setRejectionStatus(null)
      setRefreshReason(null)
      setError(null)
      setRefreshMessage('Sesión recuperada. Revisa el plan actual y tu propuesta antes de guardar.')
    } catch (reason) {
      if (active.current && request === reloadRequest.current) {
        const status = getPlantacionErrorStatus(reason)
        if (status !== undefined) setRejectionStatus(status)
        setError(reason instanceof Error ? reason.message : 'No se pudo recuperar la sesión.')
      }
    } finally {
      if (active.current && request === reloadRequest.current) setRecoveringSession(false)
    }
  }

  let blockedReason: string | null = null
  if (loadingSessionPlan) blockedReason = 'Cargando el plan persistido para la sesión actual…'
  else if (rejectionStatus === 401) blockedReason = 'Tu sesión no es válida. Inicia sesión nuevamente para continuar; tu propuesta se conserva.'
  else if (rejectionStatus === 403) blockedReason = 'El servidor rechazó el permiso de edición. Solo ADMIN global puede revisar este plan.'
  else if (rejectionStatus === 404) blockedReason = 'La subcampaña no existe o ya no está disponible.'
  else if (!allowed) blockedReason = 'Solo ADMIN global puede revisar planes en BORRADOR o ACTIVA.'
  else if (refreshReason === 'conflict') blockedReason = 'El plan cambió. Actualiza el plan actual y revisa otra vez tu propuesta antes de guardar.'
  else if (refreshReason === 'unconfirmed') blockedReason = 'No se pudo confirmar el guardado. Consulta el plan actual antes de intentar otra escritura; tu propuesta se conserva.'
  else if (refreshReason === 'read_failed') blockedReason = `${error || 'No se pudo actualizar el plan actual.'} Actualiza el plan para continuar.`
  else if (plan && (!Number.isSafeInteger(plan.plan_revision) || Number(plan.plan_revision) < 0)) blockedReason = 'El servidor todavía no ofrece la revisión atómica del plan.'

  const confirm = async (proposal: PlanFormProposal) => {
    if (!plan || blockedReason || inFlight.current || reloading || recoveringSession) return
    const request = reloadRequest.current
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    setRefreshMessage(null)
    let saved: RevisarPlanData
    try {
      saved = await PlantacionService.revisarSubcampaniaPlan(subcampania.id, {
        ...proposal,
        revision_esperada: plan.plan_revision!,
      }, authId)
    } catch (reason) {
      if (active.current && request === reloadRequest.current) {
        const status = getPlantacionErrorStatus(reason)
        setRefreshReason(status === 409 ? 'conflict' : status === undefined || status >= 500 ? 'unconfirmed' : null)
        setRejectionStatus(status ?? null)
        setError(reason instanceof Error ? reason.message : 'No se pudo guardar la revisión del plan.')
        // Los rechazos de estado/protecciones no eliminan la propuesta. La
        // siguiente lectura muestra el estado actual y exige otra revisión.
        if (status === 422) {
          try {
            const currentPlan = await PlantacionService.getSubcampaniaPlan(subcampania.id, authId)
            if (active.current && request === reloadRequest.current) setLoaded({ key, plan: { ...currentPlan } })
          } catch (readError) {
            // Sin lectura actual no se habilita un nuevo envío con la versión anterior.
            if (active.current && request === reloadRequest.current) {
              const readStatus = getPlantacionErrorStatus(readError)
              setRejectionStatus(readStatus ?? null)
              setRefreshReason('read_failed')
            }
          }
        }
      }
      if (active.current && request === reloadRequest.current) {
        inFlight.current = false
        setSubmitting(false)
      }
      return
    }
    if (!active.current || request !== reloadRequest.current) return
    clearPlanEditorDraft(subcampania.id, authId)
    // Una revisión confirmada nunca se reenvía si falla una lectura posterior.
    try {
      await onSaved(saved)
    } finally {
      if (active.current && request === reloadRequest.current) {
        inFlight.current = false
        setSubmitting(false)
        onClose()
      }
    }
  }

  const closeEditor = () => {
    if (inFlight.current || recoveringSession) return
    clearPlanEditorDraft(subcampania.id, authId)
    onClose()
  }

  if (!displayedPlan) {
    const sessionRejected = rejectionStatus === 401
    const unavailable = rejectionStatus === 403 || rejectionStatus === 404
    return <ConfirmDialog open title="Editar meta y especies" description={subcampania.nombre}
      confirmLabel={sessionRejected ? 'Iniciar sesión' : loadFailed ? 'Reintentar carga' : 'Cargando plan…'}
      loading={recoveringSession} confirmDisabled={sessionRejected ? !onRecoverSession : !loadFailed || !allowed || unavailable}
      errorMessage={sessionRejected || unavailable ? blockedReason : error} onCancel={closeEditor} onConfirm={() => {
        if (sessionRejected) { void recoverSession(); return }
        setError(null)
        setFailedKey(null)
        setAttempt((value) => value + 1)
      }}>
      <p className="mt-3 text-sm font-semibold text-brand-700">{loadFailed ? 'No se pudo leer el plan persistido.' : 'Cargando plan persistido…'}</p>
    </ConfirmDialog>
  }

  return <EditarPlanSubcampaniaModal key={subcampania.id} plan={displayedPlan} authId={authId} subcampaniaNombre={subcampania.nombre} isAdmin={isAdmin}
    submitting={submitting} error={error} blockedReason={blockedReason} reloadingPlan={reloading || recoveringSession || loadingSessionPlan}
    refreshMessage={refreshMessage}
    onRecoverSession={rejectionStatus === 401 && onRecoverSession ? () => { void recoverSession() } : undefined}
    recoveringSession={recoveringSession}
    onReloadPlan={allowed && rejectionStatus !== 401 && rejectionStatus !== 403 && rejectionStatus !== 404 && refreshReason !== null ? () => { void reloadPlan() } : undefined} onClose={closeEditor}
    onConfirm={(proposal) => { void confirm(proposal) }} />
}
