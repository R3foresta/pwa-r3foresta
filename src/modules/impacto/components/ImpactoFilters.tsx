import { Button, Card, inputClasses } from '../../../components/ui'
import type { ImpactoScope } from '../types'
import { FILTER_KEYS } from '../utils/consulta'
import type { ImpactoFilters as Filters } from '../utils/consulta'

type Option = { id: string; nombre: string }
type Props = {
  scope: ImpactoScope
  search: string
  options: { campanias: Option[]; subcampanias: Option[]; organizaciones: Option[]; especies: Option[] }
  onApply: (filters: Filters) => void
  onClear: () => void
}

export default function ImpactoFilters({ scope, search, options, onApply, onClear }: Props) {
  const params = new URLSearchParams(search)
  const formKey = FILTER_KEYS.map((key) => params.get(key) ?? '').join('|')
  return <Card as="section"><details><summary className="cursor-pointer font-bold text-brand-800">Filtrar impacto público</summary><form key={formKey} className="mt-4 space-y-4" onSubmit={(event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const filters: Filters = {}
    FILTER_KEYS.forEach((key) => { const value = String(data.get(key) ?? '').trim(); if (value) filters[key] = value })
    onApply(filters)
  }}><p className="text-xs text-neutral-500">Las fechas corresponden al día de plantación. La especie conserva los grupos completos; la organización filtra campañas asociadas.</p><div className="grid gap-3 sm:grid-cols-2">
    {scope.tipo === 'global' && <IdFilter label="Campaña" name="campania_id" value={params.get('campania_id') ?? ''} options={options.campanias} />}
    {scope.tipo !== 'subcampania' && <IdFilter label="Subcampaña" name="subcampania_id" value={params.get('subcampania_id') ?? ''} options={options.subcampanias} />}
    <IdFilter label="Organización de campaña" name="organizacion_id" value={params.get('organizacion_id') ?? ''} options={options.organizaciones} />
    <IdFilter label="Especie" name="planta_id" value={params.get('planta_id') ?? ''} options={options.especies} />
    <label className="space-y-1 text-sm font-semibold text-neutral-700">Desde<input name="desde" type="date" defaultValue={params.get('desde') ?? ''} className={inputClasses(false)} /></label>
    <label className="space-y-1 text-sm font-semibold text-neutral-700">Hasta<input name="hasta" type="date" defaultValue={params.get('hasta') ?? ''} className={inputClasses(false)} /></label>
  </div><div className="flex flex-wrap gap-2"><Button type="submit" size="sm">Aplicar filtros</Button><Button size="sm" variant="ghost" onClick={onClear}>Limpiar filtros</Button></div></form></details></Card>
}

function IdFilter({ label, name, value, options }: { label: string; name: string; value: string; options: Option[] }) {
  return <div><label className="block space-y-1 text-sm font-semibold text-neutral-700">{label}<input name={name} defaultValue={value} list={`impacto-${name}`} inputMode="numeric" pattern="[1-9][0-9]*" placeholder="Todos · selecciona o ingresa ID" className={inputClasses(false)} /></label><datalist id={`impacto-${name}`}>{options.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}</datalist></div>
}
