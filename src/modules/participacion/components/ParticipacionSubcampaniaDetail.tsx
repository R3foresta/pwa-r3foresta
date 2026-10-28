import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import ImpactoShare from '../../impacto/components/ImpactoShare'
import { useImpactoConsulta } from '../../impacto/hooks/useImpactoConsulta'
import { impactoErrorMessage, impactoErrorStatus } from '../../impacto/utils/consulta'
import SubcampaniaDetailHeader from '../../plantacion/components/SubcampaniaDetailHeader'
import SubcampaniaDetailTabs from '../../plantacion/components/SubcampaniaDetailTabs'
import { useRegistroContext } from '../registro/hooks/useRegistroContext'
import { subcampaniaDetailPath } from '../utils/detailNavigation'
import SubcampaniaSpeciesCard from '../../plantacion/components/SubcampaniaSpeciesCard'
import SubcampaniaPlantacionesMap from '../../plantacion/components/SubcampaniaPlantacionesMap'
import type { CapacidadSubcampania } from '../types'
import PlantadorScopePanel from './PlantadorScopePanel'
import ParticipacionDetalleEquipo from './ParticipacionDetalleEquipo'
import ParticipacionDetalleHistorial from './ParticipacionDetalleHistorial'
import { canRegisterPlantacion, scopeRole } from './plantadorPresentation'

type Props = { actorId: string; scope: CapacidadSubcampania; onBack: () => void }

/** La ruta remonta este detalle al cambiar cuenta o ámbito. */
export default function ParticipacionSubcampaniaDetail({ actorId, scope, onBack }: Props) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const tabValue = params.get('pestana')
  const tab = tabValue === 'equipo' || tabValue === 'mapa' ? tabValue : 'resumen'
  const { data, loading, error, retry, loadMore, loadingMore, pageError, scopeChanged } = useImpactoConsulta({ tipo: 'subcampania', id: scope.subcampania_id }, { limite: 20 })
  const registration = useRegistroContext(actorId, scope.subcampania_id, canRegisterPlantacion(scope))
  const { context } = registration
  const zone = data?.subcampanias.find(item => item.id === scope.subcampania_id)
  const points = data?.mapa.filter(point => point.subcampania_id === scope.subcampania_id) ?? []
  const records = data?.registros.filter(record => record.subcampania_id === scope.subcampania_id) ?? []
  const polygon = context?.subcampania.poligono ?? zone?.poligono ?? null
  const returnTo = subcampaniaDetailPath(scope.subcampania_id, params)
  const publicStatus = <>
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando avance e historial…</p>}
    {Boolean(error) && <div className="space-y-2"><p role={impactoErrorStatus(error) === 404 ? 'status' : 'alert'} className="text-sm text-neutral-600">{impactoErrorStatus(error) === 404 ? 'El detalle público no está disponible para esta subcampaña. Esto no significa que la subcampaña no exista.' : `No pudimos consultar el avance y el historial. ${impactoErrorMessage(error)}`}</p><Button variant="secondary" onClick={retry}>Reintentar mapa y avance</Button></div>}
  </>
  return <section className="relative min-h-screen bg-brand-50 text-brand-700" aria-label="Subcampaña seleccionada">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
    <SubcampaniaDetailHeader onBack={onBack} nombre={scope.nombre} estado={scope.estado} eyebrow={scope.campania_nombre}
      zona={zone?.zona} plantados={zone?.plantacion_inicial} meta={zone?.meta_inicial ?? context?.subcampania.meta_total_arboles} porcentaje={zone?.avance_porcentaje}
      badges={<span className="text-xs font-semibold">{scopeRole(scope)}</span>}>
      {!zone && <p className="mt-3 text-xs text-white/80">El avance y la meta públicos no están disponibles en esta consulta.</p>}
    </SubcampaniaDetailHeader>
    <main className="space-y-4 px-5 pt-2">
    <SubcampaniaDetailTabs active={tab} onChange={value => { const next = new URLSearchParams(params); next.set('pestana', value); setParams(next, { replace: true, state: location.state }) }} />
    {tab === 'resumen' && <div className="space-y-3">
      <PlantadorScopePanel scope={scope} zone={zone} returnTo={returnTo} registration={registration} />
      {publicStatus}
      {context ? <SubcampaniaSpeciesCard items={context.especies.map(species => ({ id: species.planta_id, nombre: species.nombre, imagen_url: species.imagen_url, cantidad_objetivo: species.cantidad_objetivo, porcentaje_objetivo: species.porcentaje_objetivo }))} /> : <Card as="section" className="space-y-2"><h2 className="text-sm font-extrabold">Especies de plantas</h2><p className="text-xs text-neutral-500">Las metas por especie no están disponibles en esta consulta.</p></Card>}
      <p className="px-1 text-[11px] text-neutral-500">El plan indica metas orientativas; la disponibilidad para registrar se consulta por separado.</p>
      {data && <ParticipacionDetalleHistorial records={records} hasMore={Boolean(data.siguiente_cursor)} loadingMore={loadingMore} pageError={pageError} scopeChanged={scopeChanged} onLoadMore={() => void loadMore()} returnTo={returnTo} confirmedEmpty={Boolean(zone && zone.registros === 0 && !data.siguiente_cursor)} />}
      {zone && <div className="flex flex-wrap items-center gap-3"><ImpactoShare path={`/impacto/subcampanias/${scope.subcampania_id}`} title={scope.nombre} /><span className="text-xs text-neutral-500">Comparte solo la consulta pública.</span></div>}
    </div>}
    {tab === 'equipo' && <ParticipacionDetalleEquipo scope={scope} globalAdmin={false} actorId={actorId} />}
    {tab === 'mapa' && <div className="space-y-3">
      <SubcampaniaPlantacionesMap subcampania={{ id: scope.subcampania_id, nombre: scope.nombre, poligono: polygon }}
        puntos={points} registros={records} loading={loading} error={error} onRetry={retry} publishedRecords={zone?.registros} />
      <Link to={`/impacto/campanias/${scope.campania_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline">Explorar el impacto de toda la campaña</Link>
    </div>}
    </main>
    </div>
  </section>
}
