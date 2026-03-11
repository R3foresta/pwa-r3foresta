import Icon from '../../../components/Icon'
import type { MaterialType } from '../recoleccionTypes'

type Props = {
  value: string
  tipoMaterial: MaterialType
  error?: boolean
  onChange: (value: string) => void
  onErrorClear?: () => void
}

function sanitizeQuantity(value: string, tipo: MaterialType): string {
  if (!value) return '0'

  // remove leading zeros except decimals
  const clean = value.replace(/^0+(?=\d)/, '')
  const regex = tipo === 'cutting' ? /^\d*$/ : /^\d*\.?\d*$/
  if (!regex.test(clean)) return clean.slice(0, -1)
  return clean
}

function CantidadInput({ value, tipoMaterial, error, onChange, onErrorClear }: Props) {
  const handleInput = (next: string) => {
    const sanitized = sanitizeQuantity(next, tipoMaterial)
    onChange(sanitized || '0')
    if (onErrorClear) onErrorClear()
  }

  const changeQuantity = (delta: number) => {
    const numValue = parseFloat(value) || 0
    const newValue = Math.max(0, numValue + delta)
    handleInput(newValue.toString())
  }

  return (
    <div className="space-y-2">
      <p className="text-base font-extrabold text-brand-700">Cantidad</p>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => changeQuantity(-1)}
          className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:border-slate-300"
        >
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode={tipoMaterial === 'cutting' ? 'numeric' : 'decimal'}
          value={value}
          onChange={(event) => handleInput(event.target.value)}
          className="w-full border-none bg-transparent text-center text-3xl font-extrabold text-brand-700 outline-none"
        />
        <button
          type="button"
          onClick={() => changeQuantity(1)}
          className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:border-slate-300"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold text-red-500">
          {tipoMaterial === 'cutting' ? 'Ingresa un entero ≥ 1' : 'Ingresa una cantidad mayor a 0'}
        </p>
      )}
    </div>
  )
}

export default CantidadInput
