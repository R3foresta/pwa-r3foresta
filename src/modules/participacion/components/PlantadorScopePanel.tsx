import { Link } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { Badge, Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import type { ImpactoSubcampania } from '../../impacto/types'
import { formatImpactoNumber } from '../../impacto/utils/consulta'
import type { useRegistroContext } from '../registro/hooks/useRegistroContext'
import type { CapacidadSubcampania } from '../types'
import { canRegisterPlantacion } from './plantadorPresentation'

type Props = { scope: CapacidadSubcampania; zone?: ImpactoSubcampania; returnTo: string; registration: ReturnType<typeof useRegistroContext> }

/** Una lectura operativa por selección. El padre remonta al cambiar de ámbito. */
export default function PlantadorScopePanel({ scope, zone, returnTo, registration }: Props) {
  const { login } = useAuth()
  const allowed = Boolean(scope && canRegisterPlantacion(scope))
  const { context, loading, error, sessionExpired, refresh } = registration
  const hasStock = context?.disponibilidad === 'DISPONIBLE'
  const draftsButton = <Link to="/app/participacion/borradores" state={{ participacionReturnTo: returnTo }} className="flex min-h-12 items-center justify-center rounded-2xl border border-brand-600 bg-white px-4 py-3 text-center text-base font-bold text-brand-700 shadow-soft hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">Plantaciones en Borrador</Link>
  return <div className="space-y-3">
    {!allowed ? <><p className="text-sm leading-6 text-neutral-600">{scope ? 'El registro de plantaciones no está habilitado en esta subcampaña. Puedes consultar su avance e historial.' : 'Esta subcampaña pertenece a la campaña, pero tu cuenta no está habilitada para registrar aquí.'}</p>{draftsButton}</> : <>
      {hasStock && scope ? (
        <Link to={`/app/participacion/subcampanias/${scope.subcampania_id}/registrar`} state={{ participacionReturnTo: returnTo }} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-center text-base font-bold text-white shadow-soft hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
          <span aria-hidden="true"><Icon name="plus" className="h-5 w-5 shrink-0" /></span>
          Registrar plantación
        </Link>
      ) : (
        <Button fullWidth disabled loading={loading} className="min-h-12 text-base">
          {context ? 'Sin stock para registrar' : 'Registrar plantación'}
        </Button>
      )}
      {draftsButton}
      {loading && <p role="status" className="text-sm text-neutral-600">Consultando stock de esta subcampaña…</p>}
      {error && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">No pudimos comprobar el stock. {error}</p><Button variant="secondary" onClick={() => { if (sessionExpired) void login().then(refresh).catch(() => undefined); else refresh() }}>{sessionExpired ? 'Recuperar sesión' : 'Reintentar stock'}</Button></div>}
      {context && <>
        {!hasStock && <p className="text-sm leading-6 text-neutral-600">Coordina la disponibilidad con tu equipo o elige otra subcampaña.</p>}
        <details className="group border-t border-neutral-100 pt-1">
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
            <Button size="sm" variant="ghost" className="min-h-11 w-full" onClick={refresh}>Actualizar stock</Button>
          </div>
        </details>
      </>}
    </>}
    {zone && <Link to={`/impacto/subcampanias/${zone.id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">Ver historial de la subcampaña</Link>}
  </div>

}
