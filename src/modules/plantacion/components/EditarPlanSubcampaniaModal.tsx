import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button } from '../../../components/ui'
import type { GetPlanData } from '../types/contracts'
import { usePlanMetaEspeciesForm } from '../hooks/usePlanMetaEspeciesForm'
import { createPlanFormFromPlan, getPlanEspecieNombre, recalculatePlanQuantities, validatePlanForm, type PlanFormErrors, type PlanFormProposal } from '../utils/planMetaEspeciesForm'
import PlanMetaEspeciesForm from './PlanMetaEspeciesForm'
import CatalogoEspeciesPicker, { type EspecieCatalogoItem } from './CatalogoEspeciesPicker'

/** Propuesta de UI; la pantalla la adapta al contrato de revisión del backend. */
export type PlanRevisionProposal = PlanFormProposal

type Props = {
  plan: GetPlanData
  subcampaniaNombre: string
  isAdmin: boolean
  submitting: boolean
  error: string | null
  blockedReason?: string | null
  reloadingPlan?: boolean
  onReloadPlan?: () => void
  onClose: () => void
  onConfirm: (proposal: PlanRevisionProposal) => void
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
}

function EditarPlanSubcampaniaModal({ plan, subcampaniaNombre, isAdmin, submitting, error, blockedReason, reloadingPlan = false, onReloadPlan, onClose, onConfirm }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [review, setReview] = useState<PlanRevisionProposal | null>(null)
  const [reviewedPlan, setReviewedPlan] = useState<GetPlanData | null>(null)
  const [validationErrors, setValidationErrors] = useState<PlanFormErrors>({ especies: [] })
  const submissionLock = useRef(false)
  const restriction = !isAdmin
    ? 'Solo ADMIN global puede editar el plan.'
    : plan.estado !== 'BORRADOR' && plan.estado !== 'ACTIVA'
      ? 'El plan solo puede editarse en BORRADOR o ACTIVA.'
      : blockedReason
  const disabled = submitting || reloadingPlan || Boolean(restriction)
  const form = usePlanMetaEspeciesForm(() => createPlanFormFromPlan(plan), {
    disabled,
    onChange: () => { setValidationErrors({ especies: [] }); setReview(null) },
  })
  const { especies } = form.value
  const currentReview = reviewedPlan === plan ? review : null

  useEffect(() => {
    if (!submitting) submissionLock.current = false
  }, [submitting, error])

  const addEspecies = (items: EspecieCatalogoItem[]) => {
    if (disabled) return
    form.addSpecies(items)
    setPickerOpen(false)
  }

  const calculateQuantities = () => {
    if (disabled) return
    const calculated = recalculatePlanQuantities(form.value)
    form.recalculate()
    setValidationErrors(validatePlanForm(calculated).errors)
  }

  const handleConfirm = () => {
    if (disabled || submissionLock.current) return
    const result = validatePlanForm(form.value)
    setValidationErrors(result.errors)
    if (!result.proposal) return
    if (!currentReview) {
      setReview(result.proposal)
      setReviewedPlan(plan)
      return
    }
    submissionLock.current = true
    onConfirm(currentReview)
  }

  const comparisonIds = currentReview ? [...new Set([...plan.metas.map((item) => item.planta_id), ...currentReview.metas.map((item) => item.planta_id)])] : []

  return <>
    <ConfirmDialog open={!pickerOpen || disabled} title={currentReview ? 'Confirmar revisión del plan' : 'Editar meta y especies'}
      description={subcampaniaNombre} iconName="leaf" confirmLabel={currentReview ? 'Confirmar y guardar plan' : 'Revisar cambios'}
      cancelLabel={currentReview ? 'Volver a editar' : 'Cancelar edición'} loading={submitting} confirmDisabled={Boolean(restriction) || reloadingPlan}
      errorMessage={restriction || validationErrors.plan || error} onConfirm={handleConfirm}
      onCancel={() => { if (!submitting) { if (currentReview) setReview(null); else onClose() } }}>
      <div className="mt-4 space-y-4">
        <p className="rounded-2xl bg-brand-50 p-3 text-xs font-semibold text-brand-700">
          La revisión ajusta la planificación. Lo plantado, el stock y el estado de la subcampaña se conservan.
        </p>
        {onReloadPlan && <Button variant="secondary" fullWidth loading={reloadingPlan} disabled={submitting}
          onClick={onReloadPlan}>{reloadingPlan ? 'Consultando plan…' : 'Consultar plan vigente'}</Button>}
        {currentReview ? <>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-neutral-50 p-3 text-sm text-brand-800">
            <div><p className="text-xs font-semibold text-neutral-500">Meta actual</p><p className="font-extrabold">{formatNumber(plan.meta_total_arboles)} árboles</p></div>
            <div><p className="text-xs font-semibold text-neutral-500">Meta propuesta</p><p className="font-extrabold">{formatNumber(currentReview.meta_total_arboles)} árboles</p></div>
          </div>
          <table className="w-full text-left text-xs text-brand-800">
            <caption className="mb-2 text-left text-sm font-bold">Objetivos por especie</caption>
            <thead><tr className="border-b border-neutral-200"><th className="py-2">Especie</th><th className="px-2 py-2">Actual</th><th className="py-2">Propuesto</th></tr></thead>
            <tbody>{comparisonIds.map((id) => {
              const current = plan.metas.find((item) => item.planta_id === id)
              const proposed = currentReview.metas.find((item) => item.planta_id === id)
              const proposedItem = especies.find((item) => item.planta_id === id)
              const name = proposedItem ? getPlanEspecieNombre(proposedItem) : current?.planta?.especie || `Especie #${id}`
              return <tr key={id} className="border-b border-neutral-100">
                <th className="py-3 font-semibold">{name}<span className="mt-1 block text-[10px] text-neutral-500">{!current ? 'Agregada' : !proposed ? 'Se retira del plan' : 'Plan vigente'}</span></th>
                <td className="px-2 py-3">{current ? <>{formatNumber(current.cantidad_objetivo)} árboles<br />{formatNumber(current.porcentaje_objetivo)}%</> : '—'}</td>
                <td className="py-3">{proposed ? <>{formatNumber(proposed.cantidad_objetivo)} árboles<br />{formatNumber(proposed.porcentaje_objetivo)}%</> : '—'}</td>
              </tr>
            })}</tbody>
          </table>
        </> : <>
          <p className="text-sm font-semibold text-brand-700">Meta actual: {formatNumber(plan.meta_total_arboles)} árboles</p>
          <PlanMetaEspeciesForm value={form.value} errors={validationErrors} disabled={disabled}
            metaLabel="Meta total propuesta" manualQuantities currentMetas={plan.metas}
            onMetaChange={form.changeMeta} onMetaStep={form.stepMeta}
            onPercentageChange={form.changePercentage} onPercentageStep={form.stepPercentage}
            onQuantityChange={form.changeQuantity} onRemoveSpecies={form.removeSpecies}
            onOpenCatalog={() => setPickerOpen(true)} onRecalculate={calculateQuantities} />
          <p className="text-xs font-semibold text-neutral-500">El sistema valida que una especie retirada no tenga plantación inicial ni stock inicial disponible.</p>
        </>}
      </div>
    </ConfirmDialog>
    <CatalogoEspeciesPicker open={pickerOpen && !disabled} excludedPlantaIds={especies.map((item) => item.planta_id)}
      onClose={() => setPickerOpen(false)} onConfirm={addEspecies} />
  </>
}

export default EditarPlanSubcampaniaModal
