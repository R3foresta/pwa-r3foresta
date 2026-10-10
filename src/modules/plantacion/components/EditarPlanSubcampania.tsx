import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { getPlantacionErrorStatus, PlantacionService } from '../../../services/plantacion.service'
import type { GetPlanData, RevisarPlanData, Subcampania } from '../types/contracts'
import type { PlanFormProposal } from '../utils/planMetaEspeciesForm'
import EditarPlanSubcampaniaModal from './EditarPlanSubcampaniaModal'

type Props = {
  subcampania: Subcampania
  authId?: string
  isAdmin: boolean
  onClose: () => void
  onSaved: (saved: RevisarPlanData) => Promise<void>
}

/** Carga y confirma el plan persistido; las propuestas quedan dentro del modal. */
export default function EditarPlanSubcampania({ subcampania, authId, isAdmin, onClose, onSaved }: Props) {
  const [loaded, setLoaded] = useState<{ key: string; plan: GetPlanData } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [refreshReason, setRefreshReason] = useState<'conflict' | 'read_failed' | null>(null)
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const inFlight = useRef(false)
  const reloadRequest = useRef(0)
  const active = useRef(true)
  const key = `${subcampania.id}|${authId ?? ''}`
  const plan = loaded?.key === key ? loaded.plan : null
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
        setLoadFailed(false)
        setError(null)
        setSubmitting(false)
        setReloading(false)
        setRefreshReason(null)
        setRefreshMessage(null)
        setPermissionDenied(false)
      })
      .catch((reason: unknown) => {
        if (!current) return
        setLoadFailed(true)
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el plan persistido.')
      })
    return () => { current = false }
  }, [subcampania.id, authId, key, attempt])

  const reloadPlan = async () => {
    if (!allowed || permissionDenied || inFlight.current || reloading) return
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
        setPermissionDenied(status === 401 || status === 403)
        setRefreshReason('read_failed')
        setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el plan actual.')
      }
    } finally {
      if (active.current && request === reloadRequest.current) setReloading(false)
    }
  }

  const blockedReason = !allowed
    ? 'Solo ADMIN global puede revisar planes en BORRADOR o ACTIVA.'
    : permissionDenied
      ? 'El servidor rechazó el permiso de edición. Vuelve a verificar tu sesión.'
      : refreshReason === 'conflict'
        ? 'El plan cambió. Actualiza el plan actual y revisa otra vez tu propuesta antes de guardar.'
        : refreshReason === 'read_failed'
          ? `${error || 'No se pudo actualizar el plan actual.'} Actualiza el plan para continuar.`
          : plan && (!Number.isSafeInteger(plan.plan_revision) || Number(plan.plan_revision) < 0)
            ? 'El servidor todavía no ofrece la revisión atómica del plan.'
            : null

  const confirm = async (proposal: PlanFormProposal) => {
    if (!plan || blockedReason || inFlight.current || reloading) return
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
        setRefreshReason(status === 409 ? 'conflict' : null)
        setPermissionDenied(status === 401 || status === 403)
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
              setPermissionDenied(readStatus === 401 || readStatus === 403)
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

  if (!plan) {
    return <ConfirmDialog open title="Editar meta y especies" description={subcampania.nombre}
      confirmLabel={loadFailed ? 'Reintentar carga' : 'Cargando plan…'} confirmDisabled={!loadFailed || !allowed}
      errorMessage={error} onCancel={onClose} onConfirm={() => {
        setError(null)
        setLoadFailed(false)
        setAttempt((value) => value + 1)
      }}>
      <p className="mt-3 text-sm font-semibold text-brand-700">{loadFailed ? 'No se pudo leer el plan persistido.' : 'Cargando plan persistido…'}</p>
    </ConfirmDialog>
  }

  return <EditarPlanSubcampaniaModal plan={plan} subcampaniaNombre={subcampania.nombre} isAdmin={isAdmin}
    submitting={submitting} error={error} blockedReason={blockedReason} reloadingPlan={reloading}
    refreshMessage={refreshMessage}
    onReloadPlan={allowed && !permissionDenied && refreshReason !== null ? () => { void reloadPlan() } : undefined} onClose={() => { if (!inFlight.current) onClose() }}
    onConfirm={(proposal) => { void confirm(proposal) }} />
}
