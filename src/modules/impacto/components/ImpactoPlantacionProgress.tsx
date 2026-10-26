import { formatImpactoNumber } from '../utils/consulta'

type Props = { plantacionInicial: number; meta: number }

/** Resumen de la plantación inicial; no suma reposiciones ni descuenta bajas. */
export default function ImpactoPlantacionProgress({ plantacionInicial, meta }: Props) {
  return (
    <dl className="grid grid-cols-2 gap-4">
      <div className="min-w-0">
        <dt className="min-h-8 text-xs text-neutral-600">Árboles plantados inicialmente</dt>
        <dd className="mt-1 break-words text-2xl font-bold tabular-nums tracking-tight text-brand-800">{formatImpactoNumber(plantacionInicial)}</dd>
      </div>
      <div className="min-w-0 border-l border-neutral-200 pl-4">
        <dt className="min-h-8 text-xs text-neutral-600">Meta de plantación</dt>
        <dd className="mt-1 break-words text-2xl font-bold tabular-nums tracking-tight text-neutral-800">{formatImpactoNumber(meta)}</dd>
      </div>
    </dl>
  )
}
