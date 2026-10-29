import { useLocation, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { useImpactoConsulta } from '../../impacto/hooks/useImpactoConsulta'
import { formatImpactoNumber, impactoErrorMessage, impactoErrorStatus } from '../../impacto/utils/consulta'
import type { GeoJsonPolygon, Subcampania } from '../types/contracts'
import type { DetailTab } from './SubcampaniaDetailTabs'
import SubcampaniaAdminHistorial from './SubcampaniaAdminHistorial'
import SubcampaniaPlantacionesMap from './SubcampaniaPlantacionesMap'

type Props = { subcampania: Subcampania; poligono: GeoJsonPolygon | null; tab: DetailTab }

/** Resumen, historial y puntos comparten lectura; el polígono prioriza detalle/contexto autorizados. */
export default function SubcampaniaAdminActividad({ subcampania, poligono, tab }: Props) {
  const { pathname, search, state } = useLocation()
  const scopeId = String(subcampania.id)
  const consulta = useImpactoConsulta({ tipo: 'subcampania', id: scopeId }, { limite: 20 })
  const [params, setParams] = useSearchParams()
  const points = consulta.data?.mapa.filter(point => point.subcampania_id === scopeId) ?? []
  const records = consulta.data?.registros.filter(record => record.subcampania_id === scopeId) ?? []
  const zone = consulta.data?.subcampanias.find(item => item.id === scopeId)
  const polygon = poligono ?? zone?.poligono ?? null
  const returnTo = pathname + search

  function showRecords() {
    const next = new URLSearchParams(params)
    next.set('pestana', 'registros')
    setParams(next, { replace: true, state })
  }

  function showMap(recordId: string) {
    const next = new URLSearchParams(params)
    next.set('pestana', 'mapa')
    next.set('registro', recordId)
    setParams(next, { replace: true, state })
  }

  if (tab === 'resumen') return <Card as="section" className="space-y-3" aria-label="Actividad de plantación">
    <h2 className="text-lg font-extrabold text-brand-800">Actividad de plantación</h2>
    <p className="text-xs text-neutral-500">Solo registros publicados. Consulta el historial detallado en Registros.</p>
    {consulta.loading && <p role="status" className="text-sm text-neutral-600">Consultando resumen de actividad…</p>}
    {Boolean(consulta.error) && <div className="space-y-2">
      <p role={impactoErrorStatus(consulta.error) === 404 ? 'status' : 'alert'} className="text-sm text-neutral-600">{impactoErrorStatus(consulta.error) === 404 ? 'El resumen público no está disponible para esta subcampaña. Esto no significa que no existan plantaciones.' : `No pudimos consultar el resumen de actividad. ${impactoErrorMessage(consulta.error)}`}</p>
      <Button size="sm" variant="secondary" onClick={consulta.retry}>Reintentar resumen de actividad</Button>
    </div>}
    {zone && <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-brand-50 p-3">
      {[
        { label: 'Registros', value: zone.registros },
        { label: 'Plantación inicial', value: zone.plantacion_inicial },
        { label: 'Reposiciones', value: zone.reposiciones },
      ].map(metric => <div key={metric.label} className="min-w-0">
        <dt className="text-[11px] font-semibold text-neutral-600">{metric.label}</dt>
        <dd className="mt-1 break-words text-xl font-extrabold tabular-nums text-brand-800">{formatImpactoNumber(metric.value)}</dd>
      </div>)}
    </dl>}
    {!consulta.loading && !consulta.error && !zone && <p role="status" className="text-sm text-neutral-600">El resumen de actividad no está disponible en esta consulta.</p>}
    <Button size="sm" variant="secondary" onClick={showRecords}>Ver registros</Button>
  </Card>

  if (tab === 'registros') return <SubcampaniaAdminHistorial records={records} loading={consulta.loading}
    error={consulta.error} onRetry={consulta.retry} hasMore={Boolean(consulta.data?.siguiente_cursor)}
    loadingMore={consulta.loadingMore} pageError={consulta.pageError} onLoadMore={() => { void consulta.loadMore() }}
    onShowMap={showMap} confirmedEmpty={Boolean(zone && zone.registros === 0 && !consulta.data?.siguiente_cursor)}
    scopeChanged={consulta.scopeChanged} returnTo={returnTo} />

  if (tab !== 'mapa') return null

  return <SubcampaniaPlantacionesMap campaniaId={String(subcampania.campania_id)} subcampania={{ id: scopeId, nombre: subcampania.nombre, poligono: polygon }}
    puntos={points} registros={records} loading={consulta.loading} error={consulta.error} onRetry={consulta.retry} publishedRecords={zone?.registros} />
}
