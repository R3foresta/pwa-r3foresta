import Icon from '../../../components/Icon'
import { Badge, Button } from '../../../components/ui'
import { formatImpactoNumber } from '../../impacto/utils/consulta'
import type { ContextoRegistro } from '../../participacion/registroTypes'

type Props = {
  context: ContextoRegistro | null
  loading: boolean
  error: string | null
  sessionExpired: boolean
  onRefresh: () => void
  onRecoverSession: () => void
  expanded?: boolean
}

/** Disponibilidad de inicial recibida del servidor, compartida por ambas audiencias. */
export default function SubcampaniaStockDisponible({
  context, loading, error, sessionExpired, onRefresh, onRecoverSession, expanded = false,
}: Props) {
  const hasStock = context?.disponibilidad === 'DISPONIBLE'
  return <div className="space-y-3">
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando stock de esta subcampaña…</p>}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">No pudimos comprobar el stock. {error}</p><Button variant="secondary" onClick={sessionExpired ? onRecoverSession : onRefresh}>{sessionExpired ? 'Recuperar sesión' : 'Reintentar stock'}</Button></div>}
    {context && <>
      {!hasStock && <p className="text-sm leading-6 text-neutral-600">Coordina la disponibilidad con tu equipo o elige otra subcampaña.</p>}
      <details open={expanded} className="group border-t border-neutral-100 pt-1">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg py-2 text-sm focus-visible:outline-brand-500 [&::-webkit-details-marker]:hidden">
          <span className="mr-auto font-semibold text-brand-700">Disponibles para registrar</span>
          <Badge variant={hasStock ? 'success' : 'warning'}>{hasStock ? 'Stock disponible' : 'Sin stock'}</Badge>
          <span aria-hidden="true"><Icon name="chevron-down" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></span>
        </summary>
        <div className="space-y-3 pt-2">
          <ul aria-label="Stock por especie" className="divide-y divide-brand-100 rounded-2xl bg-brand-50 px-3">
            {context.especies.map(species => <li key={species.planta_id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 break-words text-neutral-700">{species.nombre}</span><strong className="shrink-0 text-brand-800">{formatImpactoNumber(species.saldo_elegible)} <span className="text-xs font-normal">plantas</span></strong></li>)}
          </ul>
          <p className="text-xs leading-5 text-neutral-500">Stock de esta subcampaña. Se comprueba otra vez al registrar; la meta es orientativa.</p>
          <Button size="sm" variant="ghost" className="min-h-11 w-full" onClick={onRefresh}>Actualizar stock</Button>
        </div>
      </details>
    </>}
  </div>
}
