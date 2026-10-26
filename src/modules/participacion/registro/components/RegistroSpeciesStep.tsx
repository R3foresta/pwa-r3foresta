import { useState } from 'react'
import { Button, Card, inputClasses } from '../../../../components/ui'
import StepFooter from '../../../plantacion/components/registro/StepFooter'
import type { ContextoRegistro, EspecieRegistro } from '../../registroTypes'
import RegistroSpeciesCounterRow from './RegistroSpeciesCounterRow'

type Values = { especies: EspecieRegistro[]; fecha_plantacion: string; observaciones: string | null }
type Props = { context: ContextoRegistro; values: Values; disabled: boolean; onChange: (patch: Partial<Values>) => void; onNext: () => void; onBack: () => void }

export default function RegistroSpeciesStep({ context, values, disabled, onChange, onNext, onBack }: Props) {
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries(values.especies.map((species) => [species.planta_id, String(species.cantidad)])))
  const [touched, setTouched] = useState(false)
  const entries = context.especies.map((species) => ({ ...species, raw: raw[species.planta_id] ?? '', quantity: Number(raw[species.planta_id] ?? 0) }))
  const invalidQuantities = entries.some((species) => !/^\d*$/.test(species.raw) || !Number.isSafeInteger(species.quantity) || species.quantity < 0 || species.quantity > species.saldo_elegible)
  const unknown = values.especies.filter((species) => !context.especies.some((current) => current.planta_id === species.planta_id))
  const total = entries.reduce((sum, species) => sum + (Number.isSafeInteger(species.quantity) && species.quantity >= 0 ? species.quantity : 0), 0)
  const especiesConCantidad = entries.filter((species) => species.quantity > 0).length
  const dateValid = values.fecha_plantacion >= context.reglas.fecha_minima_ventana && values.fecha_plantacion <= context.reglas.fecha_maxima
  const valid = !invalidQuantities && total > 0 && unknown.length === 0 && dateValid && (values.observaciones?.length ?? 0) <= 2000

  function changeQuantity(id: string, value: string) {
    setRaw((current) => ({ ...current, [id]: value }))
    // Mantener propuestas válidas aunque excedan el saldo actual: no recortarlas.
    if (/^\d*$/.test(value) && Number.isSafeInteger(Number(value))) {
      const next = values.especies.filter((species) => species.planta_id !== id)
      if (Number(value) > 0) next.push({ planta_id: id, cantidad: Number(value) })
      onChange({ especies: next })
    }
  }

  return <div className="space-y-4">
    <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-4 text-white shadow-soft">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Total propuesto para esta plantación</p>
      <p className="mt-1 text-5xl font-extrabold leading-none tracking-tight tabular-nums">{total}</p>
      <p className="mt-1 text-[11px] font-bold text-white/80">{total === 1 ? 'planta' : 'plantas'} en {especiesConCantidad} {especiesConCantidad === 1 ? 'especie' : 'especies'}</p>
    </div>
    <Card><p className="text-sm text-neutral-700">El saldo es compartido de esta subcampaña. La meta orienta: puedes superarla dentro del saldo disponible. El servidor vuelve a validar al guardar.</p></Card>
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="sr-only">Especies y cantidades plantadas</legend>
      {entries.map((species) => {
        const invalid = species.raw !== '' && (!/^\d+$/.test(species.raw) || !Number.isSafeInteger(species.quantity) || species.quantity < 0 || species.quantity > species.saldo_elegible)
        return <RegistroSpeciesCounterRow key={species.planta_id} nombre={species.nombre} metaOrientativa={species.cantidad_objetivo} disponible={species.saldo_elegible} value={species.raw} cantidad={species.quantity} error={invalid ? `Usa una cantidad entera entre 0 y ${species.saldo_elegible}. Tu propuesta no se ha reducido.` : null} onChange={(value) => changeQuantity(species.planta_id, value)} />
      })}
    </fieldset>
    {unknown.length > 0 && <Card className="space-y-2"><p role="alert" className="text-sm text-danger-700">El plan ya no incluye alguna especie de tu propuesta. Revisa y retírala expresamente para continuar.</p>{unknown.map((species) => <div key={species.planta_id} className="flex items-center justify-between gap-2 text-sm"><span>Especie {species.planta_id}: {species.cantidad}</span><Button size="sm" variant="secondary" disabled={disabled} onClick={() => onChange({ especies: values.especies.filter((item) => item.planta_id !== species.planta_id) })}>Retirar de la propuesta</Button></div>)}</Card>}
    <Card as="section" className="space-y-3">
      <h2 className="font-bold text-brand-800">Fecha del trabajo</h2>
      <p className="text-xs text-neutral-600">Hoy operativo: {context.reglas.hoy_operativo} · {context.reglas.zona_horaria}</p>
      <label className="block text-sm font-semibold text-brand-800">Fecha de plantación<input type="date" value={values.fecha_plantacion} min={context.reglas.fecha_minima_ventana} max={context.reglas.fecha_maxima} disabled={disabled} onChange={(event) => onChange({ fecha_plantacion: event.target.value })} className={inputClasses(touched && !dateValid)} /></label>
      <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ fecha_plantacion: context.reglas.hoy_operativo })}>Usar hoy operativo</Button>
      <p className="text-xs text-neutral-600">Ventana inclusiva: {context.reglas.fecha_minima_ventana} al {context.reglas.fecha_maxima}. La entrega utilizada debe permitir la fecha elegida.</p>
      {touched && !dateValid && <p role="alert" className="text-sm text-danger-700">Elige una fecha dentro de la ventana indicada.</p>}
      <label className="block text-sm font-semibold text-brand-800">Observaciones (opcional)<textarea value={values.observaciones ?? ''} maxLength={2000} rows={3} disabled={disabled} onChange={(event) => onChange({ observaciones: event.target.value })} className={inputClasses(false)} /></label>
      <p className="text-right text-xs text-neutral-500">{values.observaciones?.length ?? 0}/2000</p>
    </Card>
    <Button variant="secondary" disabled={disabled} onClick={onBack}>Volver a fotos y ubicación</Button>
    <StepFooter label="Continuar a participantes" disabled={disabled} onClick={() => { setTouched(true); if (valid) onNext() }} hint={touched && !valid ? 'Revisa las cantidades, la fecha y las especies antes de continuar.' : null} />
  </div>
}
