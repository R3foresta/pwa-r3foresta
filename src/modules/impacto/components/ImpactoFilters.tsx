import { useState } from 'react'
import { Button, Card, inputClasses } from '../../../components/ui'
import { validarImpactoFecha, validarImpactoId } from '../api/impacto.contract'
import type { ImpactoScope } from '../types'
import { FILTER_KEYS } from '../utils/consulta'
import type { ImpactoFilters as Filters } from '../utils/consulta'

type Option = { id: string; nombre: string }
type FilterKey = (typeof FILTER_KEYS)[number]
type IdFilterKey = Exclude<FilterKey, 'desde' | 'hasta'>
export type ImpactoFilterNames = Partial<Record<IdFilterKey, string>>
type Props = {
  scope: ImpactoScope
  search: string
  options: { campanias: Option[]; subcampanias: Option[]; organizaciones: Option[]; especies: Option[] }
  selectedNames?: ImpactoFilterNames
  onApply: (filters: Filters) => void
  onClear: () => void
}

type Errors = Partial<Record<FilterKey, string>>

export default function ImpactoFilters(props: Props) {
  const params = new URLSearchParams(props.search)
  // Cambiar filtros por navegación restaura el formulario y sus errores juntos.
  const formKey = FILTER_KEYS.map((key) => params.get(key) ?? '').join('|')
  return <FilterForm key={formKey} {...props} />
}

function FilterForm({ scope, search, options, selectedNames, onApply, onClear }: Props) {
  const params = new URLSearchParams(search)
  const [errors, setErrors] = useState<Errors>({})

  return (
    <Card as="section" aria-label="Filtros de impacto">
      <form noValidate className="space-y-4" onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        const filters: Filters = {}
        const nextErrors: Errors = {}
        FILTER_KEYS.forEach((key) => {
          const value = String(data.get(key) ?? '').trim()
          const field = form.elements.namedItem(key)
          if ((key === 'desde' || key === 'hasta') && field instanceof HTMLInputElement && field.validity.badInput) {
            nextErrors[key] = 'Ingresa una fecha válida y completa.'
          }
          if (!value) return
          try {
            if (key === 'desde' || key === 'hasta') validarImpactoFecha(value)
            else validarImpactoId(value)
            filters[key] = value
          } catch {
            nextErrors[key] = key === 'desde' || key === 'hasta'
              ? 'Ingresa una fecha válida y completa.'
              : 'La selección del enlace no es válida. Elige una opción o limpia el filtro.'
          }
        })
        if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
          nextErrors.hasta = 'La fecha hasta debe ser igual o posterior a la fecha desde.'
        }
        setErrors(nextErrors)
        const firstError = FILTER_KEYS.find((key) => nextErrors[key])
        if (firstError) {
          const field = form.elements.namedItem(firstError)
          if (field instanceof HTMLElement) field.focus()
          return
        }
        onApply(filters)
      }}>
        <p className="text-sm text-neutral-700">Las fechas corresponden al día de plantación. La especie conserva los grupos completos; la organización filtra campañas asociadas.</p>
        <p id="impacto-filter-suggestions" className="text-sm text-neutral-700">Las opciones de especies y organizaciones son sugerencias de las plantaciones cargadas en esta consulta; no son un catálogo completo.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {scope.tipo === 'global' && <NameFilter label="Campaña" name="campania_id" value={params.get('campania_id') ?? ''} options={options.campanias} selectedName={selectedNames?.campania_id} error={errors.campania_id} />}
          {scope.tipo !== 'subcampania' && <NameFilter label="Zona" name="subcampania_id" value={params.get('subcampania_id') ?? ''} options={options.subcampanias} selectedName={selectedNames?.subcampania_id} error={errors.subcampania_id} />}
          <NameFilter label="Organización de campaña" name="organizacion_id" value={params.get('organizacion_id') ?? ''} options={options.organizaciones} selectedName={selectedNames?.organizacion_id} error={errors.organizacion_id} partial />
          <NameFilter label="Especie" name="planta_id" value={params.get('planta_id') ?? ''} options={options.especies} selectedName={selectedNames?.planta_id} error={errors.planta_id} partial />
          {(['desde', 'hasta'] as const).map((name) => (
            <div key={name} className="space-y-1">
              <label htmlFor={`impacto-${name}`} className="block text-sm font-semibold text-neutral-700">{name === 'desde' ? 'Desde' : 'Hasta'}</label>
              <input id={`impacto-${name}`} name={name} type="date" defaultValue={params.get(name) ?? ''} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `impacto-${name}-error` : undefined} className={inputClasses(Boolean(errors[name]))} />
              {errors[name] && <p id={`impacto-${name}-error`} role="alert" className="text-sm text-danger-700">{errors[name]}</p>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-11">Aplicar filtros</Button>
          <Button variant="ghost" className="min-h-11" onClick={onClear}>Limpiar filtros</Button>
        </div>
      </form>
    </Card>
  )
}

function NameFilter({ label, name, value, options, selectedName, error, partial = false }: { label: string; name: IdFilterKey; value: string; options: Option[]; selectedName?: string; error?: string; partial?: boolean }) {
  const [draftValue, setDraftValue] = useState(value)
  const unknownSelection = draftValue && !options.some(option => option.id === draftValue)
  const describedBy = [partial ? 'impacto-filter-suggestions' : '', error ? `impacto-${name}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1">
      <label htmlFor={`impacto-${name}`} className="block text-sm font-semibold text-neutral-700">{label}</label>
      <select id={`impacto-${name}`} name={name} value={draftValue} onChange={event => setDraftValue(event.currentTarget.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={inputClasses(Boolean(error))}>
        <option value="">Todas las opciones</option>
        {unknownSelection && <option key={`preserved:${draftValue}`} value={draftValue}>{draftValue === value && selectedName ? selectedName : 'Selección conservada · nombre no disponible'}</option>}
        {[...options].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(option => <option key={option.id} value={option.id}>{option.nombre}</option>)}
      </select>
      {error && <p id={`impacto-${name}-error`} role="alert" className="text-sm text-danger-700">{error}</p>}
    </div>
  )
}
