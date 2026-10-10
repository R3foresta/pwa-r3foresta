import { useId } from 'react'
import Icon from '../../../components/Icon'
import { Button, Field, Input } from '../../../components/ui'
import type { PlanEspecieMeta } from '../types/contracts'
import {
  getPlanEspecieNombre,
  getPlanPercentageTotal,
  planPercentage,
  positivePlanInteger,
  type PlanEspecieForm,
  type PlanFormErrors,
  type PlanMetaEspeciesValue,
} from '../utils/planMetaEspeciesForm'

type PlanMetaEspeciesFormProps = {
  value: PlanMetaEspeciesValue
  errors?: PlanFormErrors
  disabled?: boolean
  metaLabel?: string
  manualQuantities?: boolean
  currentMetas?: PlanEspecieMeta[]
  onMetaChange: (raw: string) => void
  onMetaStep: (delta: number) => void
  onPercentageChange: (index: number, raw: string) => void
  onPercentageStep: (index: number, delta: number) => void
  onQuantityChange?: (index: number, raw: string) => void
  onRemoveSpecies: (index: number) => void
  onOpenCatalog: () => void
  onRecalculate?: () => void
}

const META_FINE_STEP = 100
const META_QUICK_STEPS = [500, 1000, 5000, 10000] as const
const PERCENTAGE_STEP = 5

function formatNumber(value: number): string {
  return value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
}

type SpeciesRowProps = {
  item: PlanEspecieForm
  index: number
  fieldId: string
  error?: PlanFormErrors['especies'][number]
  manualQuantities: boolean
  disabled: boolean
  showCurrent: boolean
  current?: PlanEspecieMeta
  onPercentageChange: PlanMetaEspeciesFormProps['onPercentageChange']
  onPercentageStep: PlanMetaEspeciesFormProps['onPercentageStep']
  onQuantityChange: PlanMetaEspeciesFormProps['onQuantityChange']
  onRemoveSpecies: PlanMetaEspeciesFormProps['onRemoveSpecies']
}

function PlanSpeciesRow({
  item, index, fieldId, error, manualQuantities, disabled, showCurrent, current,
  onPercentageChange, onPercentageStep, onQuantityChange, onRemoveSpecies,
}: SpeciesRowProps) {
  const nombre = getPlanEspecieNombre(item)
  const quantity = item.cantidad === '0' ? 0 : positivePlanInteger(item.cantidad)
  const porcentaje = planPercentage(item.porcentaje)
  const percentageId = `${fieldId}-porcentaje-${index}`
  const percentageErrorId = `${percentageId}-error`
  const hasStockReference = item.saldo_disponible !== undefined
  const noStock = hasStockReference && item.saldo_disponible! <= 0 && (porcentaje ?? 0) > 0
  const exceedsStock = hasStockReference && item.saldo_disponible! > 0 && quantity !== null && quantity > item.saldo_disponible!

  return (
    <div className="rounded-2xl bg-white px-3 py-3 shadow-soft ring-1 ring-black/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-24">
          <p className="text-sm font-extrabold leading-tight text-brand-800">{nombre}</p>
          {item.nombre_cientifico && <p className="mt-0.5 text-[11px] italic text-neutral-500">{item.nombre_cientifico}</p>}
          {showCurrent && (
            <p className="mt-1 text-xs font-semibold text-neutral-500">
              {current
                ? `Actual: ${formatNumber(current.cantidad_objetivo)} árboles · ${formatNumber(current.porcentaje_objetivo)}%`
                : 'Nueva especie del catálogo'}
            </p>
          )}
          {hasStockReference && (
            <p className={`mt-1 text-[10px] font-bold ${item.saldo_disponible! <= 0 ? 'text-warning-700' : 'text-neutral-500'}`}>
              Vivero: <span className="tabular-nums">{formatNumber(item.saldo_disponible!)}</span> disponibles (referencia)
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPercentageStep(index, -PERCENTAGE_STEP)}
            aria-label={`Restar ${PERCENTAGE_STEP}% a ${nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <div className="flex w-20 items-center gap-0.5">
            <label htmlFor={percentageId} className="sr-only">Porcentaje propuesto de {nombre}</label>
            <input
              id={percentageId}
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={item.porcentaje}
              aria-invalid={Boolean(error?.porcentaje)}
              aria-describedby={error?.porcentaje ? percentageErrorId : undefined}
              onChange={(event) => onPercentageChange(index, event.target.value)}
              className={`w-full min-w-0 rounded-lg border-b-2 bg-transparent px-0.5 py-1 text-center text-[22px] font-extrabold leading-none tabular-nums text-brand-800 outline-none focus:border-brand-600 ${error?.porcentaje ? 'border-danger-500' : 'border-brand-100'}`}
            />
            <span className="text-lg font-extrabold text-brand-800" aria-hidden="true">%</span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPercentageStep(index, PERCENTAGE_STEP)}
            aria-label={`Sumar ${PERCENTAGE_STEP}% a ${nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error?.porcentaje && <p id={percentageErrorId} className="mt-2 text-xs font-semibold text-danger-700">{error.porcentaje}</p>}
      {manualQuantities && (
        <div className="mt-3">
          <Field label={`Cantidad propuesta de ${nombre}`} required htmlFor={`${fieldId}-cantidad-${index}`} error={error?.cantidad}>
            <Input
              id={`${fieldId}-cantidad-${index}`}
              inputMode="numeric"
              disabled={disabled}
              value={item.cantidad}
              error={Boolean(error?.cantidad)}
              readOnly={!onQuantityChange}
              onChange={(event) => onQuantityChange?.(index, event.target.value)}
            />
          </Field>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] font-extrabold text-neutral-500">
        <span>
          Equivale a <span className="tabular-nums text-brand-800">{quantity === null ? '—' : formatNumber(quantity)}</span> árboles
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRemoveSpecies(index)}
          aria-label={`Quitar ${nombre} del ${showCurrent ? 'plan' : 'mix'}`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-danger-700 transition hover:bg-danger-100 disabled:opacity-50"
        >
          <Icon name="trash" className="h-3 w-3" />
          Quitar
        </button>
      </div>
      {!manualQuantities && error?.cantidad && <p className="mt-2 text-xs font-semibold text-danger-700">{error.cantidad}</p>}
      {hasStockReference && <p className="mt-2 text-[10.5px] font-semibold text-neutral-500">La referencia de vivero no es stock asignado a esta subcampaña.</p>}
      {(noStock || exceedsStock) && (
        <p className="mt-2 rounded-xl bg-warning-50 px-2 py-1 text-[10.5px] font-extrabold text-warning-800 ring-1 ring-warning-100">
          {noStock
            ? 'No hay stock en vivero todavía. Puedes definir la planificación.'
            : `La cantidad planificada supera la referencia de vivero (${formatNumber(item.saldo_disponible!)}). No bloquea el plan.`}
        </p>
      )}
    </div>
  )
}

/** Controles compartidos de planificación. Cada flujo carga, confirma y guarda su propio plan. */
function PlanMetaEspeciesForm({
  value, errors, disabled = false, metaLabel = 'Meta total de árboles', manualQuantities = false,
  currentMetas, onMetaChange, onMetaStep, onPercentageChange, onPercentageStep,
  onQuantityChange, onRemoveSpecies, onOpenCatalog, onRecalculate,
}: PlanMetaEspeciesFormProps) {
  const fieldId = useId()
  const metaId = `${fieldId}-meta`
  const total = getPlanPercentageTotal(value.especies)
  const balanced = total === 100
  const percentageStatus = balanced ? ' ✓' : total > 100
    ? ` · excede ${formatNumber(total - 100)}%`
    : ` · falta ${formatNumber(100 - total)}%`

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <legend className="sr-only">Meta y especies del plan</legend>
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={metaId} className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">{metaLabel}</label>
          {value.meta !== '' && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMetaChange('')}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/90 transition hover:bg-white/25 disabled:opacity-50"
            >Limpiar</button>
          )}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <input
            id={metaId}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            pattern="[0-9]*"
            value={value.meta}
            onChange={(event) => onMetaChange(event.target.value)}
            placeholder="0"
            aria-invalid={Boolean(errors?.meta)}
            aria-describedby={errors?.meta ? `${metaId}-error` : undefined}
            className="w-full min-w-0 border-b-2 border-white/30 bg-transparent text-[40px] font-extrabold leading-none tracking-tight tabular-nums text-white outline-none placeholder:text-white/40 focus:border-white"
          />
          <p className="pb-1 text-sm font-extrabold text-white/80">árboles</p>
        </div>
        {errors?.meta && <p id={`${metaId}-error`} className="mt-2 rounded-xl bg-white px-2 py-1 text-xs font-semibold text-danger-700">{errors.meta}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {META_QUICK_STEPS.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={disabled}
              onClick={() => onMetaStep(amount)}
              className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-white/25 disabled:opacity-50"
            >+{formatNumber(amount)}</button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMetaStep(-META_FINE_STEP)}
              aria-label={`Restar ${META_FINE_STEP} a la meta`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:opacity-50"
            ><Icon name="minus" className="h-4 w-4" /></button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onMetaStep(META_FINE_STEP)}
              aria-label={`Sumar ${META_FINE_STEP} a la meta`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:opacity-50"
            ><Icon name="plus" className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
      <section aria-label="Metas por especie" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brand-500">Mix planificado</h3>
          <p className={`text-[11px] font-extrabold tabular-nums ${balanced ? 'text-success-700' : 'text-warning-700'}`}>
            {formatNumber(total)}% asignado{percentageStatus}
          </p>
        </div>
        <p className="text-xs font-semibold text-neutral-500">Las cantidades se recalculan al cambiar la meta o los porcentajes.</p>
        {value.especies.length === 0 && (
          <div className="rounded-2xl bg-white px-4 py-6 text-center shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-extrabold text-brand-800">Aún no hay especies en el mix</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">Agrega especies desde el catálogo para asignarles porcentaje.</p>
          </div>
        )}
        <div className="space-y-2">
          {value.especies.map((item, index) => (
            <PlanSpeciesRow
              key={`${item.planta_id}-${index}`}
              item={item}
              index={index}
              fieldId={fieldId}
              error={errors?.especies[index]}
              manualQuantities={manualQuantities}
              disabled={disabled}
              showCurrent={currentMetas !== undefined}
              current={currentMetas?.find((saved) => saved.planta_id === item.planta_id)}
              onPercentageChange={onPercentageChange}
              onPercentageStep={onPercentageStep}
              onQuantityChange={onQuantityChange}
              onRemoveSpecies={onRemoveSpecies}
            />
          ))}
        </div>
        <Button variant="secondary" fullWidth leftIcon="plus" disabled={disabled} onClick={onOpenCatalog}>Agregar especie del catálogo</Button>
        {manualQuantities && onRecalculate && (
          <Button variant="secondary" fullWidth disabled={disabled} onClick={onRecalculate}>Calcular cantidades desde porcentajes</Button>
        )}
      </section>
    </fieldset>
  )
}

export default PlanMetaEspeciesForm
