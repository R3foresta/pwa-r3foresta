import { useEffect, useId, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { Button, Field, Input } from '../../../components/ui'
import type { GetPlanData, PlanEspecieMetaInput } from '../types/contracts'
import { buildPlanMetasPayload } from '../utils/planMetas'
import CatalogoEspeciesPicker, { type EspecieCatalogoItem } from './CatalogoEspeciesPicker'

/** Propuesta de UI; la pantalla la adapta al contrato de revisión del backend. */
export type PlanRevisionProposal = {
  meta_total_arboles: number
  metas: PlanEspecieMetaInput[]
}

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

type EspecieForm = {
  planta_id: number
  nombre: string
  nombre_cientifico: string
  cantidad: string
  porcentaje: string
}

type FormErrors = {
  meta?: string
  plan?: string
  especies: Array<{ cantidad?: string; porcentaje?: string }>
}

const PERCENT_TOLERANCE = 0.000001

function positiveInteger(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function percentage(raw: string): number | null {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null
}

function validateForm(meta: string, especies: EspecieForm[]) {
  const errors: FormErrors = { especies: [] }
  const goal = positiveInteger(meta)
  if (goal === null) errors.meta = 'La meta debe ser un número entero positivo.'

  const metas: PlanEspecieMetaInput[] = []
  for (const especie of especies) {
    const cantidad = positiveInteger(especie.cantidad)
    const porcentaje = percentage(especie.porcentaje)
    errors.especies.push({
      ...(cantidad === null ? { cantidad: 'Indica una cantidad entera positiva.' } : {}),
      ...(porcentaje === null ? { porcentaje: 'Indica un porcentaje mayor que 0 y hasta 100, con máximo 2 decimales.' } : {}),
    })
    if (cantidad !== null && porcentaje !== null) {
      metas.push({ planta_id: especie.planta_id, cantidad_objetivo: cantidad, porcentaje_objetivo: porcentaje })
    }
  }
  if (especies.length === 0) {
    errors.plan = 'Agrega al menos una especie al plan.'
  } else if (new Set(especies.map((especie) => especie.planta_id)).size !== especies.length) {
    errors.plan = 'El plan no puede contener especies duplicadas.'
  } else if (metas.length === especies.length) {
    const totalPct = metas.reduce((sum, item) => sum + item.porcentaje_objetivo, 0)
    const totalCantidad = metas.reduce((sum, item) => sum + item.cantidad_objetivo, 0)
    if (Math.abs(totalPct - 100) > PERCENT_TOLERANCE) {
      errors.plan = 'Los porcentajes de las especies deben sumar 100%.'
    } else if (goal !== null && totalCantidad !== goal) {
      errors.plan = 'Las cantidades por especie deben sumar la meta total.'
    }
  }

  const valid = !errors.meta && !errors.plan && metas.length === especies.length
  return { errors, proposal: valid && goal !== null ? { meta_total_arboles: goal, metas } : null }
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
}

function EditarPlanSubcampaniaModal({ plan, subcampaniaNombre, isAdmin, submitting, error, blockedReason, reloadingPlan = false, onReloadPlan, onClose, onConfirm }: Props) {
  const fieldId = useId()
  const [meta, setMeta] = useState(() => String(plan.meta_total_arboles))
  const [especies, setEspecies] = useState<EspecieForm[]>(() => plan.metas.map((item) => ({
    planta_id: item.planta_id,
    nombre: item.planta?.especie || `Especie #${item.planta_id}`,
    nombre_cientifico: item.planta?.nombre_cientifico || '',
    cantidad: String(item.cantidad_objetivo),
    porcentaje: String(item.porcentaje_objetivo),
  })))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [review, setReview] = useState<PlanRevisionProposal | null>(null)
  const [reviewedPlan, setReviewedPlan] = useState<GetPlanData | null>(null)
  const [validationErrors, setValidationErrors] = useState<FormErrors>({ especies: [] })
  const submissionLock = useRef(false)
  const restriction = !isAdmin
    ? 'Solo ADMIN global puede editar el plan.'
    : plan.estado !== 'BORRADOR' && plan.estado !== 'ACTIVA'
      ? 'El plan solo puede editarse en BORRADOR o ACTIVA.'
      : blockedReason
  const disabled = submitting || reloadingPlan || Boolean(restriction)
  const currentReview = reviewedPlan === plan ? review : null

  useEffect(() => {
    if (!submitting) submissionLock.current = false
  }, [submitting, error])

  const updateEspecie = (index: number, field: 'cantidad' | 'porcentaje', value: string) => {
    if (disabled) return
    setEspecies((current) => current.map((item, position) => position === index ? { ...item, [field]: value } : item))
    setValidationErrors({ especies: [] })
  }

  const addEspecies = (items: EspecieCatalogoItem[]) => {
    if (disabled) return
    setEspecies((current) => {
      const existing = new Set(current.map((item) => item.planta_id))
      const added: EspecieForm[] = []
      for (const item of items) {
        if (existing.has(item.planta_id)) continue
        existing.add(item.planta_id)
        added.push({ planta_id: item.planta_id, nombre: item.nombre_comun_principal || item.especie,
          nombre_cientifico: item.nombre_cientifico, cantidad: '', porcentaje: '' })
      }
      return [...current, ...added]
    })
    setPickerOpen(false)
    setValidationErrors({ especies: [] })
  }

  const calculateQuantities = () => {
    if (disabled) return
    const goal = positiveInteger(meta)
    const percentages = especies.map((item) => percentage(item.porcentaje))
    if (goal === null || goal < especies.length || especies.length === 0) {
      setValidationErrors({ meta: 'Para calcular, la meta debe ser entera y permitir al menos un árbol por especie.', especies: [] })
      return
    }
    if (percentages.some((value) => value === null) || Math.abs(percentages.reduce<number>((sum, value) => sum + (value ?? 0), 0) - 100) > PERCENT_TOLERANCE) {
      setValidationErrors({ plan: 'Para calcular cantidades, indica porcentajes válidos que sumen 100%.', especies: [] })
      return
    }
    const calculated = buildPlanMetasPayload(goal, especies.map((item, index) => ({ planta_id: item.planta_id, pct: percentages[index]! })))
    const next = especies.map((item, index) => ({ ...item, cantidad: String(calculated[index].cantidad_objetivo) }))
    setEspecies(next)
    setValidationErrors(validateForm(meta, next).errors)
  }

  const handleConfirm = () => {
    if (disabled || submissionLock.current) return
    const result = validateForm(meta, especies)
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
              const name = especies.find((item) => item.planta_id === id)?.nombre || current?.planta?.especie || `Especie #${id}`
              return <tr key={id} className="border-b border-neutral-100">
                <th className="py-3 font-semibold">{name}<span className="mt-1 block text-[10px] text-neutral-500">{!current ? 'Agregada' : !proposed ? 'Se retira del plan' : 'Plan vigente'}</span></th>
                <td className="px-2 py-3">{current ? <>{formatNumber(current.cantidad_objetivo)} árboles<br />{formatNumber(current.porcentaje_objetivo)}%</> : '—'}</td>
                <td className="py-3">{proposed ? <>{formatNumber(proposed.cantidad_objetivo)} árboles<br />{formatNumber(proposed.porcentaje_objetivo)}%</> : '—'}</td>
              </tr>
            })}</tbody>
          </table>
        </> : <>
          <p className="text-sm font-semibold text-brand-700">Meta actual: {formatNumber(plan.meta_total_arboles)} árboles</p>
          <Field label="Meta total propuesta" required htmlFor={`${fieldId}-meta`} error={validationErrors.meta}>
            <Input id={`${fieldId}-meta`} inputMode="numeric" value={meta} disabled={disabled} error={Boolean(validationErrors.meta)}
              onChange={(event) => { setMeta(event.target.value); setValidationErrors({ especies: [] }) }} />
          </Field>
          <section aria-label="Metas por especie" className="space-y-3">
            <h3 className="text-sm font-bold text-brand-800">Metas por especie</h3>
            {especies.length === 0 && <p className="text-xs font-semibold text-neutral-500">Agrega una especie del catálogo para definir su objetivo.</p>}
            {especies.map((item, index) => {
              const current = plan.metas.find((saved) => saved.planta_id === item.planta_id)
              const fieldError = validationErrors.especies[index]
              return <div key={`${item.planta_id}-${index}`} className="space-y-3 rounded-2xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-sm font-bold text-brand-800">{item.nombre}</p><p className="text-xs italic text-neutral-500">{item.nombre_cientifico}</p></div>
                  <Button variant="ghost" size="sm" disabled={disabled} aria-label={`Quitar ${item.nombre} del plan`}
                    onClick={() => { setEspecies((currentItems) => currentItems.filter((_, position) => position !== index)); setValidationErrors({ especies: [] }) }}>Quitar</Button>
                </div>
                <p className="text-xs font-semibold text-neutral-500">{current ? `Actual: ${formatNumber(current.cantidad_objetivo)} árboles · ${formatNumber(current.porcentaje_objetivo)}%` : 'Nueva especie del catálogo'}</p>
                <Field label={`Cantidad propuesta de ${item.nombre}`} required htmlFor={`${fieldId}-cantidad-${index}`} error={fieldError?.cantidad}>
                  <Input id={`${fieldId}-cantidad-${index}`} inputMode="numeric" value={item.cantidad} disabled={disabled} error={Boolean(fieldError?.cantidad)}
                    onChange={(event) => updateEspecie(index, 'cantidad', event.target.value)} />
                </Field>
                <Field label={`Porcentaje propuesto de ${item.nombre}`} required htmlFor={`${fieldId}-porcentaje-${index}`} error={fieldError?.porcentaje}>
                  <Input id={`${fieldId}-porcentaje-${index}`} inputMode="decimal" value={item.porcentaje} disabled={disabled} error={Boolean(fieldError?.porcentaje)}
                    onChange={(event) => updateEspecie(index, 'porcentaje', event.target.value)} />
                </Field>
              </div>
            })}
            <p className="text-xs font-semibold text-neutral-500">El sistema valida que una especie retirada no tenga plantación inicial ni stock inicial disponible.</p>
            <Button variant="secondary" fullWidth leftIcon="plus" disabled={disabled} onClick={() => setPickerOpen(true)}>Agregar especie del catálogo</Button>
            <Button variant="secondary" fullWidth disabled={disabled} onClick={calculateQuantities}>Calcular cantidades desde porcentajes</Button>
          </section>
        </>}
      </div>
    </ConfirmDialog>
    <CatalogoEspeciesPicker open={pickerOpen && !disabled} excludedPlantaIds={especies.map((item) => item.planta_id)}
      onClose={() => setPickerOpen(false)} onConfirm={addEspecies} />
  </>
}

export default EditarPlanSubcampaniaModal
