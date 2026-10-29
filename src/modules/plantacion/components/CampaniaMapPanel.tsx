import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import ImpactoMapPanel from '../../impacto/components/ImpactoMapPanel'
import type { ImpactoPunto, ImpactoSubcampania } from '../../impacto/types'
import { formatImpactoNumber, impactoErrorMessage, impactoErrorStatus } from '../../impacto/utils/consulta'
import type { Subcampania } from '../types/contracts'

type MapStatusProps = {
  loading: boolean
  error: unknown
  onRetry: () => void
  geometryLoading?: boolean
  geometryErrors?: number
  onGeometryRetry?: () => void
}

export function CampaniaMapStatus({ loading, error, onRetry, geometryLoading = false, geometryErrors = 0, onGeometryRetry }: MapStatusProps) {
  return <>
    {geometryLoading && <p role="status" className="text-sm text-neutral-600">Consultando los polígonos de las subcampañas…</p>}
    {geometryErrors > 0 && <div className="space-y-2 rounded-2xl bg-amber-50 p-4">
      <p role="alert" className="text-sm text-amber-900">No pudimos consultar el polígono de {geometryErrors} subcampaña{geometryErrors === 1 ? '' : 's'}. Las demás ubicaciones siguen disponibles.</p>
      {onGeometryRetry && <Button size="sm" variant="secondary" disabled={geometryLoading} onClick={onGeometryRetry}>Reintentar polígonos</Button>}
    </div>}
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando las ubicaciones publicadas de la campaña…</p>}
    {Boolean(error) && <div className="space-y-2 rounded-2xl bg-amber-50 p-4">
      <p role={impactoErrorStatus(error) === 404 ? 'status' : 'alert'} className="text-sm text-amber-900">
        {impactoErrorStatus(error) === 404
          ? 'La consulta pública de esta campaña no está disponible. Esto no significa que no existan polígonos o plantaciones internas.'
          : `No pudimos consultar las ubicaciones publicadas. ${impactoErrorMessage(error)}`}
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar ubicaciones</Button>
    </div>}
  </>
}

type Props = MapStatusProps & {
  campaniaId: string
  nombre: string
  subcampanias: Subcampania[]
  zonas: Pick<ImpactoSubcampania, 'id' | 'nombre' | 'poligono'>[]
  puntos: ImpactoPunto[]
}

/** La lista interna delimita el alcance; las plantaciones proceden de la proyección pública. */
export default function CampaniaMapPanel({ campaniaId, nombre, subcampanias, zonas, puntos, loading, error, onRetry, geometryLoading, geometryErrors, onGeometryRetry }: Props) {
  const [params, setParams] = useSearchParams()
  const requestedSub = params.get('subcampania')
  const requestedRecord = params.get('registro')
  const selectedSub = subcampanias.find(sub => String(sub.id) === requestedSub)
  const selectedPoint = puntos.find(point => point.registro_id === requestedRecord && (!requestedSub || point.subcampania_id === requestedSub))
  const scopeId = selectedSub ? String(selectedSub.id) : selectedPoint?.subcampania_id
  const visibleZones = scopeId ? zonas.filter(zone => zone.id === scopeId) : zonas
  const visiblePoints = scopeId ? puntos.filter(point => point.subcampania_id === scopeId) : puntos
  const detail = selectedSub ?? subcampanias.find(sub => String(sub.id) === scopeId)

  function selectMap(value: string) {
    const next = new URLSearchParams(params)
    next.set('pestana', 'mapa')
    next.delete('subcampania')
    next.delete('registro')
    const zone = zonas.find(item => `s:${item.id}` === value)
    const point = puntos.find(item => `r:${item.registro_id}` === value)
    if (zone) next.set('subcampania', zone.id)
    if (point) {
      next.set('subcampania', point.subcampania_id)
      next.set('registro', point.registro_id)
    }
    setParams(next, { replace: true })
  }

  function recordReturnTo(recordId: string) {
    const point = puntos.find(item => item.registro_id === recordId)
    const search = new URLSearchParams({ pestana: 'mapa' })
    if (point) search.set('subcampania', point.subcampania_id)
    search.set('registro', recordId)
    return `/app/planting/campanias/${campaniaId}?${search}`
  }

  const returnSearch = new URLSearchParams({ pestana: 'mapa' })
  if (scopeId) returnSearch.set('subcampania', scopeId)
  if (selectedPoint) returnSearch.set('registro', selectedPoint.registro_id)
  const returnTo = `/app/planting/campanias/${campaniaId}?${returnSearch}`

  return <Card as="section" className="space-y-4" aria-label="Cobertura geográfica de la campaña">
    <div className="space-y-2">
      <h2 className="text-lg font-extrabold text-brand-800">Mapa de {nombre}</h2>
      <p className="text-sm leading-5 text-neutral-600">Consulta los polígonos de las subcampañas y las plantaciones publicadas. Selecciona una zona para acercarte y abrir su detalle.</p>
      <p className="text-xs leading-5 text-neutral-500">Los puntos representan registros grupales publicados; esta vista no incluye el historial privado completo.</p>
    </div>
    <CampaniaMapStatus loading={loading} error={error} onRetry={onRetry} geometryLoading={geometryLoading} geometryErrors={geometryErrors} onGeometryRetry={onGeometryRetry} />
    {subcampanias.length > 0 ? <label className="block text-sm font-semibold text-brand-800">Ver subcampaña
      <select value={scopeId ?? ''} onChange={event => selectMap(`s:${event.target.value}`)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3">
        <option value="">Toda la campaña</option>
        {subcampanias.map(sub => <option key={sub.id} value={String(sub.id)}>{sub.nombre} · {sub.estado.replace(/_/g, ' ')}</option>)}
      </select>
    </label> : <p role="status" className="text-sm text-neutral-600">No hay subcampañas disponibles en esta campaña.</p>}
    {requestedSub && !selectedSub && <p role="status" className="text-sm text-neutral-600">La subcampaña seleccionada no está disponible en esta campaña.</p>}
    {detail && <div className="space-y-2 rounded-2xl bg-brand-50 p-4 text-sm">
      <h3 className="break-words font-extrabold text-brand-800">{detail.nombre}</h3>
      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-200">{detail.estado.replace(/_/g, ' ')}</span>
      {detail.zona_nombre && <p>{detail.zona_nombre}</p>}
      <p>Meta: {formatImpactoNumber(detail.meta_total_arboles)} árboles</p>
      {!geometryLoading && !loading && !visibleZones.some(zone => zone.poligono) && <p>El polígono de esta subcampaña no está disponible en las consultas actuales.</p>}
      <Link to={`/app/planting/subcampanias/${detail.id}`} state={{ campaniaReturnTo: returnTo }} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Abrir detalle de subcampaña</Link>
      <Button size="sm" variant="secondary" onClick={() => selectMap('')}>Ver toda la campaña</Button>
    </div>}
    {(visibleZones.some(zone => zone.poligono) || visiblePoints.length > 0 || (!loading && !geometryLoading)) && <ImpactoMapPanel compact privateScope scopeLabel="esta campaña" subcampanias={visibleZones} puntos={visiblePoints}
      seleccion={selectedPoint ? `r:${selectedPoint.registro_id}` : scopeId ? `s:${scopeId}` : null}
      onSelect={selectMap} recordReturnTo={recordReturnTo} />}
    {!loading && !error && visiblePoints.length === 0 && <p role="status" className="text-sm text-neutral-600">No hay ubicaciones de plantaciones publicadas disponibles en este alcance.</p>}
    {!scopeId && !geometryLoading && !loading && zonas.some(zone => !zone.poligono) && <p className="text-sm text-neutral-500">Algunas subcampañas no tienen un polígono disponible. Puedes seleccionarlas para abrir su detalle.</p>}
    {visiblePoints.length > 0 && <label className="block text-sm font-semibold text-brand-800">Seleccionar plantación
      <select value={selectedPoint?.registro_id ?? ''} onChange={event => selectMap(event.target.value ? `r:${event.target.value}` : scopeId ? `s:${scopeId}` : '')} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3">
        <option value="">Sin plantación seleccionada</option>
        {visiblePoints.map(point => <option key={point.registro_id} value={point.registro_id}>Registro {point.registro_id} · {formatImpactoNumber(point.cantidad_total_plantada)} plantas</option>)}
      </select>
    </label>}
    {requestedRecord && !selectedPoint && !loading && !error && <p role="status" className="text-sm text-neutral-600">La plantación seleccionada no está disponible en esta consulta del mapa.</p>}
    {selectedPoint && <div className="space-y-2 rounded-2xl bg-brand-50 p-4 text-sm">
      <h3 className="font-extrabold text-brand-800">Registro {selectedPoint.registro_id}</h3>
      <p>{formatImpactoNumber(selectedPoint.cantidad_total_plantada)} {selectedPoint.es_reposicion ? 'plantas de reposición' : 'plantas iniciales'} · Registro grupal</p>
      <Link to={`/impacto/registros/${selectedPoint.registro_id}`} state={{ impactoReturnTo: recordReturnTo(selectedPoint.registro_id) }} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Abrir ficha pública</Link>
    </div>}
  </Card>
}
