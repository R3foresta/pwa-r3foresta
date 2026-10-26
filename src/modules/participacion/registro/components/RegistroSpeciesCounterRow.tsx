import Icon from '../../../../components/Icon'
import RegistroSpeciesProgressBar from './RegistroSpeciesProgressBar'

type Props = {
  nombre: string
  metaOrientativa: number
  disponible: number
  avance: { plantado: number; pendiente: number } | null
  value: string
  cantidad: number
  error: string | null
  onChange: (value: string) => void
}

// La meta orienta y solo el saldo elegible limita los incrementos.
export default function RegistroSpeciesCounterRow({ nombre, metaOrientativa, disponible, avance, value, cantidad, error, onChange }: Props) {
  const numericValue = (value === '' || /^\d+$/.test(value)) && Number.isSafeInteger(cantidad) && cantidad >= 0
  const propuestaValida = numericValue && !error ? cantidad : 0

  function step(delta: -1 | 1) {
    if (!numericValue || (delta === 1 && error)) return
    const next = cantidad + delta
    if (next < 0 || (delta === 1 && next > disponible)) return
    onChange(next === 0 ? '' : String(next))
  }

  return <div className={`rounded-3xl bg-white p-4 shadow-soft ring-1 transition ${error ? 'ring-danger-300' : cantidad > 0 ? 'ring-brand-300' : 'ring-black/5'}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="min-w-0 text-sm font-extrabold leading-tight text-brand-800">{nombre}</p>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${disponible === 0 ? 'bg-neutral-100 text-neutral-500' : 'bg-brand-50 text-brand-700'}`}>
        hasta {disponible}
      </span>
    </div>

    <div className="mt-3 flex items-center justify-between gap-3">
      <button type="button" onClick={() => step(-1)} disabled={!numericValue || cantidad === 0} aria-label={`Restar 1 a ${nombre}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
        <Icon name="minus" className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <input type="text" inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value)} placeholder="0" aria-label={`Cantidad de ${nombre}`} aria-invalid={Boolean(error)} className={`w-full bg-transparent text-center text-[28px] font-extrabold leading-none tracking-tight tabular-nums outline-none placeholder:text-neutral-300 focus-visible:ring-2 focus-visible:ring-brand-400 ${error ? 'text-danger-500' : 'text-brand-800'}`} />
        <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-500">plantas</p>
      </div>
      <button type="button" onClick={() => step(1)} disabled={!numericValue || Boolean(error) || cantidad >= disponible} aria-label={`Sumar 1 a ${nombre}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
        <Icon name="plus" className="h-5 w-5" />
      </button>
    </div>

    <RegistroSpeciesProgressBar nombre={nombre} metaOrientativa={metaOrientativa} disponible={disponible} avance={avance} cantidadPropuesta={propuestaValida} />
    {error && <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>}
  </div>
}
