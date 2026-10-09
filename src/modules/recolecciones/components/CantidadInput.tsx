import Icon from '../../../components/Icon'
import type { MaterialType, Unit } from '../recoleccionTypes'

type Props = {
  value: string
  tipoMaterial: MaterialType
  unidad: Unit
  error?: boolean
  onChange: (value: string) => void
}

function sanitizeQuantity(value: string): string {
  if (!value) return ''

  let clean = value.trim().replace(',', '.')
  // Mantener la fracción ingresada para mostrar un error, sin truncarla en silencio.
  clean = clean.replace(/[^\d.]/g, '')

  const firstDotIndex = clean.indexOf('.')

  if (firstDotIndex !== -1) {
    const beforeDot = clean.slice(0, firstDotIndex + 1)
    const afterDot = clean.slice(firstDotIndex + 1).replace(/\./g, '')
    clean = beforeDot + afterDot
  }

  clean = clean.replace(/^0+(?=\d)/, '')

  return clean
}


function CantidadInput({ value, tipoMaterial, unidad, error, onChange}: Props) {
  const requiresInteger = tipoMaterial === 'cutting' || unidad === 'units'

  const handleInput = (next: string) => {
    const sanitized = sanitizeQuantity(next)
    onChange(sanitized)
  }

  const changeQuantity = (delta: number) => {
    const numValue = Number.parseFloat(value) || 0
    let newValue = Math.max(0, numValue + delta)

    if (requiresInteger) {
      newValue = Math.floor(newValue)
    }

    handleInput(newValue.toString())
  }

  const numericValue = Number.parseFloat(value) || 0
  const quantityError = numericValue <= 0
    ? 'Ingresa una cantidad mayor a 0'
    : requiresInteger
      ? 'Ingresa un entero ≥ 1'
      : unidad === 'g'
        ? 'En G se permite máximo un decimal'
        : 'En kg se permiten hasta cuatro decimales (0,1 G)'

  return (
    <div className="space-y-2">
      <p className="text-base font-extrabold text-brand-700">Cantidad</p>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => changeQuantity(-1)}
          disabled={numericValue <= 0}
          className="rounded-2xl border border-neutral-200 p-3 text-neutral-600 transition hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode={requiresInteger ? 'numeric' : 'decimal'}
          value={value}
          onChange={(event) => handleInput(event.target.value)}
          className="w-full border-none bg-transparent text-center text-3xl font-extrabold text-brand-700 outline-none"
        />
        <button
          type="button"
          onClick={() => changeQuantity(1)}
          className="rounded-2xl border border-neutral-200 p-3 text-neutral-600 transition hover:border-neutral-300"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold text-danger-500">
          {quantityError}
        </p>
      )}
    </div>
  )
}

export default CantidadInput
