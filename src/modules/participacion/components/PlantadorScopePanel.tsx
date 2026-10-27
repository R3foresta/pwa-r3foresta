import { Link } from 'react-router-dom'
import Icon from '../../../components/Icon'
import { Button } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import type { ImpactoSubcampania } from '../../impacto/types'
import SubcampaniaStockDisponible from '../../plantacion/components/SubcampaniaStockDisponible'
import type { useRegistroContext } from '../registro/hooks/useRegistroContext'
import type { CapacidadSubcampania } from '../types'
import { canRegisterPlantacion } from './plantadorPresentation'

type Props = { scope: CapacidadSubcampania; zone?: ImpactoSubcampania; returnTo: string; registration: ReturnType<typeof useRegistroContext> }

/** Una lectura operativa por selección. El padre remonta al cambiar de ámbito. */
export default function PlantadorScopePanel({ scope, zone, returnTo, registration }: Props) {
  const { login } = useAuth()
  const allowed = canRegisterPlantacion(scope)
  const { context, loading, refresh } = registration
  const hasStock = context?.disponibilidad === 'DISPONIBLE'
  const draftsButton = <Link to="/app/participacion/borradores" state={{ participacionReturnTo: returnTo }} className="flex min-h-12 items-center justify-center rounded-2xl border border-brand-600 bg-white px-4 py-3 text-center text-base font-bold text-brand-700 shadow-soft hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">Plantaciones en Borrador</Link>
  return <div className="space-y-3">
    {!allowed ? <><p className="text-sm leading-6 text-neutral-600">El registro de plantaciones no está habilitado en esta subcampaña. Puedes consultar su avance e historial.</p>{draftsButton}</> : <>
      {hasStock ? (
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
      <SubcampaniaStockDisponible {...registration} onRefresh={refresh}
        onRecoverSession={() => { void login().then(refresh).catch(() => undefined) }} />
    </>}
    {zone && <Link to={`/impacto/subcampanias/${zone.id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">Ver historial de la subcampaña</Link>}
  </div>
}
