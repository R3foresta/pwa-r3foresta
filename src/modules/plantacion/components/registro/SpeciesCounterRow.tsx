import Icon from '../../../../components/Icon'

type Props = {
  nombre: string
  nombreCientifico?: string | null
  objetivo: number
  plantado: number
  pendiente: number
  stock: number
  maxRegistrable: number
  /** Valor crudo del input (string) para no perder lo que escribe el usuario. */
  value: string
  /** Cantidad válida parseada (0 si hay error). */
  cantidad: number
  inputError: string | null
  onChange: (value: string) => void
}

/**
 * Tarjeta de especie del paso 2: stepper +/− con número central editable y
 * barra de avance de meta (plantado acumulado + lo que se registra ahora).
 */
function SpeciesCounterRow({
  nombre,
  nombreCientifico,
  objetivo,
  plantado,
  pendiente,
  stock,
  maxRegistrable,
  value,
  cantidad,
  inputError,
  onChange,
}: Props) {
  const disabled = maxRegistrable === 0

  const step = (delta: number) => {
    const next = Math.min(maxRegistrable, Math.max(0, cantidad + delta))
    onChange(next === 0 ? '' : String(next))
  }

  const pctPlantado = objetivo > 0 ? Math.min(100, (plantado / objetivo) * 100) : 0
  const pctNuevo =
    objetivo > 0 ? Math.min(100 - pctPlantado, (cantidad / objetivo) * 100) : 0

  return (
    <div
      className={`rounded-3xl bg-white p-4 shadow-soft ring-1 transition ${
        inputError
          ? 'ring-danger-300'
          : cantidad > 0
            ? 'ring-brand-300'
            : 'ring-black/5'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-tight text-brand-800">{nombre}</p>
          {nombreCientifico && (
            <p className="truncate text-[11px] font-semibold italic text-neutral-400">
              {nombreCientifico}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
            disabled ? 'bg-neutral-100 text-neutral-400' : 'bg-brand-50 text-brand-700'
          }`}
        >
          hasta {maxRegistrable}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || cantidad === 0}
          aria-label={`Restar 1 a ${nombre}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="minus" className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={maxRegistrable}
            step={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            placeholder="0"
            aria-label={`Cantidad de ${nombre}`}
            className={`w-full bg-transparent text-center text-[28px] font-extrabold leading-none tracking-tight tabular-nums outline-none [appearance:textfield] placeholder:text-neutral-300 disabled:text-neutral-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              inputError ? 'text-danger-500' : 'text-brand-800'
            }`}
          />
          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">
            plantas
          </p>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || cantidad >= maxRegistrable}
          aria-label={`Sumar 1 a ${nombre}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
            Avance de meta
          </p>
          <p className="text-[11px] font-extrabold tabular-nums text-brand-700">
            {plantado + cantidad}
            <span className="text-neutral-400"> / {objetivo}</span>
          </p>
        </div>
        <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-brand-300" style={{ width: `${pctPlantado}%` }} />
          <div className="h-full bg-success-500" style={{ width: `${pctNuevo}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold text-neutral-400">
          <span>Plantado {plantado}</span>
          <span className="text-brand-600">Pendiente {pendiente}</span>
          <span className={stock > 0 ? 'text-success-600' : 'text-danger-500'}>
            Stock {stock}
          </span>
        </div>
      </div>

      {inputError && (
        <p className="mt-2 text-xs font-semibold text-danger-500">{inputError}</p>
      )}
      {disabled && !inputError && (
        <p className="mt-2 text-xs font-semibold text-neutral-400">
          {stock === 0
            ? 'Sin stock asignado disponible para esta especie.'
            : 'La meta de esta especie ya está cubierta.'}
        </p>
      )}
    </div>
  )
}

export default SpeciesCounterRow
