import Icon from '../../../../components/Icon'

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
  const avancePropuesto = avance ? avance.plantado + propuestaValida : propuestaValida
  const porcentajePrevio = avance && metaOrientativa > 0 ? Math.min(100, avance.plantado / metaOrientativa * 100) : 0
  const porcentajeNuevo = avance && metaOrientativa > 0 ? Math.min(100 - porcentajePrevio, propuestaValida / metaOrientativa * 100) : 0

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

    {avance ? <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">{propuestaValida > 0 ? 'Avance si guardas' : 'Avance de meta'}</p>
        <output aria-label={`Avance de meta de ${nombre}`} className="text-[11px] font-extrabold tabular-nums text-brand-700">{avancePropuesto}<span className="text-neutral-400"> / {metaOrientativa}</span></output>
      </div>
      <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        <div className="h-full bg-brand-300" style={{ width: `${porcentajePrevio}%` }} />
        <div className="h-full bg-success-500" style={{ width: `${porcentajeNuevo}%` }} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold text-neutral-500">
        <span>Plantado antes: {avance.plantado}</span>
        <span className="text-brand-700">Pendiente de meta: {avance.pendiente}</span>
        <span className={disponible > 0 ? 'text-success-700' : 'text-danger-600'}>Disponible: {disponible} plantas</span>
      </div>
    </div> : <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold">
      <span className="text-neutral-600">Meta orientativa: {metaOrientativa}</span>
      <span className={disponible > 0 ? 'text-success-700' : 'text-danger-600'}>Disponible: {disponible} plantas</span>
    </div>}
    {propuestaValida > 0 && avancePropuesto > metaOrientativa && <p className="mt-2 text-xs font-semibold text-brand-700">{avance ? 'El avance propuesto supera la meta orientativa y está dentro del saldo disponible.' : 'La cantidad supera la meta orientativa y está dentro del saldo disponible.'}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p>}
  </div>
}
