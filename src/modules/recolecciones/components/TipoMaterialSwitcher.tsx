import type { MaterialType } from '../recoleccionTypes'

type Props = {
  value: MaterialType
  onChange: (value: MaterialType) => void
}

function TipoMaterialSwitcher({ value, onChange }: Props) {
  const options: Array<{ label: string; value: MaterialType }> = [
    { label: 'Semilla', value: 'seed' },
    { label: 'Esqueje', value: 'cutting' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-base font-extrabold text-brand-700">Seleccionar tipo</p>
      <div className="flex gap-3">
        {options.map((option) => {
          const isActive = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-center text-base font-extrabold shadow-soft transition ${
                isActive
                  ? 'border-brand-500 bg-success-50 text-brand-600 ring-2 ring-success-100'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TipoMaterialSwitcher
