import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import ImpactoMapPanel from '../../impacto/components/ImpactoMapPanel'
import type { ImpactoPunto, ImpactoRegistro, ImpactoSubcampania } from '../../impacto/types'
import { formatImpactoNumber, impactoErrorMessage, impactoErrorStatus, safeCampaniaMapReturn } from '../../impacto/utils/consulta'
import { subcampaniaDetailPath } from '../../participacion/utils/detailNavigation'

export type SubcampaniaPlantacionesMapProps = {
  subcampania: Pick<ImpactoSubcampania, 'id' | 'nombre' | 'poligono'>
  puntos: ImpactoPunto[]
  registros: ImpactoRegistro[]
  loading: boolean
  error: unknown
  onRetry: () => void
  publishedRecords?: number
  campaniaId?: string
}

/** Consulta cartográfica compartida; cada audiencia conserva sus propias lecturas. */
export default function SubcampaniaPlantacionesMap({ subcampania, puntos, registros, loading, error, onRetry, publishedRecords, campaniaId }: SubcampaniaPlantacionesMapProps) {
  const [params, setParams] = useSearchParams()
  const { state } = useLocation()
  const points = puntos.filter(point => point.subcampania_id === subcampania.id)
  const selectedId = params.get('registro')
  const selected = points.find(point => point.registro_id === selectedId)
  const selectedRecord = registros.find(record => record.subcampania_id === subcampania.id && record.id === selected?.registro_id)
  const recordReturnTo = (recordId: string) => subcampaniaDetailPath(subcampania.id, new URLSearchParams({ pestana: 'mapa', registro: recordId }))
  const campaignReturn = campaniaId ? safeCampaniaMapReturn(state?.campaniaReturnTo, campaniaId, subcampania.id) : null
  const recordReturnState = campaignReturn ? { campaniaReturnTo: campaignReturn } : undefined

  function selectMap(value: string) {
    const point = points.find(item => `r:${item.registro_id}` === value)
    const next = new URLSearchParams(params)
    next.set('pestana', 'mapa')
    if (point) next.set('registro', point.registro_id)
    else next.delete('registro')
    setParams(next, { replace: true, state })
  }

  return <Card as="section" className="space-y-3" aria-label="Mapa de esta subcampaña">
    <h2 className="text-lg font-extrabold text-brand-800">Mapa de {subcampania.nombre}</h2>
    <p className="text-xs leading-5 text-neutral-500">Polígono de la subcampaña y ubicaciones de plantaciones publicadas. Selecciona un punto para ver su tarjeta y abrir la plantación.</p>
    {loading && <p role="status" className="text-sm text-neutral-600">Consultando las plantaciones del mapa…</p>}
    {Boolean(error) && <div className="space-y-2">
      <p role={impactoErrorStatus(error) === 404 ? 'status' : 'alert'} className="text-sm text-neutral-600">{impactoErrorStatus(error) === 404 ? 'Las plantaciones públicas no están disponibles para esta subcampaña. Esto no significa que no existan registros.' : `No pudimos consultar las plantaciones del mapa. ${impactoErrorMessage(error)}`}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar plantaciones del mapa</Button>
    </div>}
    <ImpactoMapPanel compact privateScope subcampanias={[subcampania]} puntos={points}
      seleccion={selected ? `r:${selected.registro_id}` : `s:${subcampania.id}`} onSelect={selectMap} recordReturnTo={recordReturnTo} recordReturnState={recordReturnState} />
    {!subcampania.poligono && <p className="text-sm text-neutral-500">El polígono no está disponible en las consultas de esta subcampaña.</p>}
    {!loading && !error && points.length === 0 && <p role="status" className="text-sm text-neutral-600">{publishedRecords === 0 ? 'Todavía no hay plantaciones publicadas en esta subcampaña.' : 'Las ubicaciones de plantaciones no están disponibles en esta consulta.'}</p>}
    {points.length > 0 && <label className="block text-sm font-semibold text-brand-800">Seleccionar plantación
      <select value={selected?.registro_id ?? ''} onChange={event => selectMap(`r:${event.target.value}`)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3">
        <option value="">Ver subcampaña</option>
        {points.map(point => <option key={point.registro_id} value={point.registro_id}>Registro {point.registro_id} · {formatImpactoNumber(point.cantidad_total_plantada)} plantas</option>)}
      </select>
    </label>}
    {selectedId && !selected && !loading && !error && <p role="status" className="text-sm text-neutral-600">La plantación seleccionada no está disponible en esta consulta del mapa.</p>}
    {selected && <div className="space-y-2 rounded-2xl bg-brand-50 p-4 text-sm">
      <h3 className="break-words font-extrabold text-brand-800">{selectedRecord?.codigo_trazabilidad ?? `Registro ${selected.registro_id}`}</h3>
      <p>{formatImpactoNumber(selected.cantidad_total_plantada)} {selected.es_reposicion ? 'plantas de reposición' : 'plantas iniciales'} · Registro grupal</p>
      <Link to={`/impacto/registros/${selected.registro_id}`} state={{ impactoReturnTo: recordReturnTo(selected.registro_id), ...recordReturnState }} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Abrir ficha pública</Link>
    </div>}
  </Card>
}
