import Icon from '../../../components/Icon'
import type { MaterialType, Unit } from '../recoleccionTypes'
import { useEffect } from 'react'

type Props = {
  value: string
  tipoMaterial: MaterialType
  unidad: Unit
  error?: boolean
  onChange: (value: string) => void
}

function sanitizeQuantity(value: string, tipo: MaterialType, unidad: Unit): string {
  if (!value) return ''

  const requiresInteger = tipo === 'cutting' || unidad === 'units'

  let clean = value.trim().replace(',', '.')

  if (requiresInteger) {
    clean = clean.replace(/[^\d.,]/g, '')
    clean = clean.split(/[.,]/)[0]
    clean = clean.replace(/^0+(?=\d)/, '')
    return clean
  }

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


function CantidadInput({ value, tipoMaterial, unidad, error, onChange, onErrorClear }: Props) {
  const requiresInteger = tipoMaterial === 'cutting' || unidad === 'units'

  const handleInput = (next: string) => {
    const sanitized = sanitizeQuantity(next, tipoMaterial, unidad)
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

  useEffect(() => {
    if (!requiresInteger) return
    if (!value.includes('.')) return

    const integerValue = Math.floor(Number(value) || 0).toString()
    onChange(integerValue)
  }, [requiresInteger, value, onChange])

  const numericValue = Number.parseFloat(value) || 0

  return (
    <div className="space-y-2">
      <p className="text-base font-extrabold text-brand-700">Cantidad</p>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => changeQuantity(-1)}
          disabled={numericValue <= 0}
          className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded-2xl border border-slate-200 p-3 text-slate-600 transition hover:border-slate-300"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold text-red-500">
          {requiresInteger ? 'Ingresa un entero ≥ 1' : 'Ingresa una cantidad mayor a 0'}
        </p>
      )}
    </div>
  )
}

export default CantidadInput
