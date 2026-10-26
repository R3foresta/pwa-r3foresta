type Props = {
  nombre: string
  metaOrientativa: number
  disponible: number
  avance: { plantado: number; pendiente: number } | null
  cantidadPropuesta: number
}

export default function RegistroSpeciesProgressBar({ nombre, metaOrientativa, disponible, avance, cantidadPropuesta }: Props) {
  const totalMostrado = (avance?.plantado ?? 0) + cantidadPropuesta
  const porcentajePrevio = avance && metaOrientativa > 0 ? Math.min(100, avance.plantado / metaOrientativa * 100) : 0
  const porcentajePropuesta = metaOrientativa > 0 ? Math.min(100 - porcentajePrevio, cantidadPropuesta / metaOrientativa * 100) : 0

  return <div className="mt-3">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
        {avance ? cantidadPropuesta > 0 ? 'Avance si guardas' : 'Avance de meta' : 'Propuesta frente a meta'}
      </p>
      <output aria-label={`Avance de meta de ${nombre}`} className="text-[11px] font-extrabold tabular-nums text-brand-700">
        {totalMostrado}<span className="text-neutral-400"> / {metaOrientativa}</span>
      </output>
    </div>
    <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
      {avance && <div className="h-full bg-brand-300" style={{ width: `${porcentajePrevio}%` }} />}
      <div className="h-full bg-success-500" style={{ width: `${porcentajePropuesta}%` }} />
    </div>
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold text-neutral-500">
      {avance ? <>
        <span>Plantado antes: {avance.plantado}</span>
        <span className="text-brand-700">Pendiente de meta: {avance.pendiente}</span>
      </> : <span>Avance previo no disponible; la barra muestra sólo esta propuesta.</span>}
      <span className={disponible > 0 ? 'text-success-700' : 'text-danger-600'}>Disponible: {disponible} plantas</span>
    </div>
    {cantidadPropuesta > 0 && totalMostrado > metaOrientativa && <p className="mt-2 text-xs font-semibold text-brand-700">
      {avance ? 'El avance propuesto supera la meta orientativa y está dentro del saldo disponible.' : 'La cantidad supera la meta orientativa y está dentro del saldo disponible.'}
    </p>}
  </div>
}
