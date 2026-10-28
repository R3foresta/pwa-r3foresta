import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'
import { formatImpactoNumber } from '../utils/consulta'

type Props = { points: ImpactoPunto[]; zones: ImpactoSubcampania[]; selected: string | null; returnTo: string; onSelect: (value: string) => void }

/** Alternativa completa al mapa; no depende de la página de registros cargada. */
export default function ImpactoPointList({ points, zones, selected, returnTo, onSelect }: Props) {
  return <section aria-labelledby="impacto-lista-title" className="space-y-3 rounded-2xl bg-brand-50 p-4">
    <h3 id="impacto-lista-title" className="font-bold text-brand-800">Plantaciones ubicadas · {formatImpactoNumber(points.length)}</h3>
    {!points.length && <p className="text-sm text-neutral-700">No hay plantaciones ubicadas en esta vista. Las zonas disponibles se pueden explorar en las tarjetas.</p>}
    <ul className="grid max-h-96 gap-3 overflow-y-auto sm:grid-cols-2">
      {points.map(point => <li key={point.registro_id} className="space-y-1 rounded-xl bg-white p-3">
        <p className="break-words text-sm font-semibold text-brand-800">{zones.find(zone => zone.id === point.subcampania_id)?.nombre ?? 'Zona pública'}</p>
        <p className="text-sm text-neutral-700">{formatImpactoNumber(point.cantidad_total_plantada)} {point.cantidad_total_plantada === 1 ? 'planta' : 'plantas'} · {point.es_reposicion ? 'Reposición' : 'Inicial'} · Registro {point.registro_id}</p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/impacto/registros/${point.registro_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4">Ver plantación {point.registro_id}</Link>
          <Button size="sm" variant="ghost" className="min-h-11" aria-pressed={selected === `r:${point.registro_id}`} onClick={() => onSelect(`r:${point.registro_id}`)}>Ubicar registro {point.registro_id}</Button>
        </div>
      </li>)}
    </ul>
  </section>
}
