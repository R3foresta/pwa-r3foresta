import { Button, Card, StatusBadge } from '../../../components/ui'
import type { CapacidadSubcampania } from '../types'

type Props = {
  scopes: CapacidadSubcampania[]
  selected: string[]
  disabled: boolean
  onChange: (ids: string[]) => void
}

export default function AccessScopeSelector({ scopes, selected, disabled, onChange }: Props) {
  return (
    <Card as="section" className="space-y-3">
      <h2 className="font-bold text-brand-800">2. Subcampañas actuales</h2>
      <p className="text-sm text-neutral-600">Selecciona hasta 100. «Todas» fija esta lista actual y no incluye subcampañas futuras.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={disabled || scopes.length === 0 || scopes.length > 100} onClick={() => onChange(scopes.map((scope) => scope.subcampania_id))}>Seleccionar todas las actuales ({scopes.length})</Button>
        <Button variant="ghost" size="sm" disabled={disabled || selected.length === 0} onClick={() => onChange([])}>Limpiar selección</Button>
      </div>
      {scopes.length > 100 && <p className="text-sm text-warning-700">Hay más de 100 ámbitos. Selecciona expresamente hasta 100 para un solo comando.</p>}
      {scopes.length === 0 && <p className="text-sm text-neutral-600">No hay subcampañas con esta acción disponible.</p>}
      <fieldset disabled={disabled} className="max-h-80 space-y-2 overflow-y-auto">
        <legend className="sr-only">Subcampañas donde aplicar el cambio</legend>
        {scopes.map((scope) => {
          const checked = selected.includes(scope.subcampania_id)
          return <label key={scope.subcampania_id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
            <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 100} onChange={() => onChange(checked ? selected.filter((id) => id !== scope.subcampania_id) : [...selected, scope.subcampania_id])} className="h-4 w-4 accent-brand-600" />
            <span className="min-w-0 flex-1 text-sm"><span className="block font-bold text-brand-800">{scope.nombre}</span><span className="text-neutral-600">{scope.campania_nombre}</span></span>
            <StatusBadge status={scope.estado} />
          </label>
        })}
      </fieldset>
      <p className="text-xs font-semibold text-brand-700">{selected.length} subcampaña(s) seleccionada(s). El cambio se aplica completo o se rechaza completo.</p>
    </Card>
  )
}
