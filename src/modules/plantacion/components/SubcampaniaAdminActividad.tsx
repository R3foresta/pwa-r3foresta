import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import ImpactoMapPanel from '../../impacto/components/ImpactoMapPanel'
import { useImpactoConsulta } from '../../impacto/hooks/useImpactoConsulta'
import { formatImpactoNumber, impactoErrorMessage, impactoErrorStatus } from '../../impacto/utils/consulta'
import type { GeoJsonPolygon, Subcampania } from '../types/contracts'
import type { DetailTab } from './SubcampaniaDetailTabs'
import SubcampaniaAdminHistorial from './SubcampaniaAdminHistorial'

type Props = { subcampania: Subcampania; poligono: GeoJsonPolygon | null; tab: DetailTab }

/** Resumen, historial y puntos comparten lectura; el polígono prioriza detalle/contexto autorizados. */
export default function SubcampaniaAdminActividad({ subcampania, poligono, tab }: Props) {
  const { pathname, search, state } = useLocation()
  const scopeId = String(subcampania.id)
  const consulta = useImpactoConsulta({ tipo: 'subcampania', id: scopeId }, { limite: 20 })
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('registro')
  const points = consulta.data?.mapa.filter(point => point.subcampania_id === scopeId) ?? []
  const records = consulta.data?.registros.filter(record => record.subcampania_id === scopeId) ?? []
  const zone = consulta.data?.subcampanias.find(item => item.id === scopeId)
  const polygon = poligono ?? zone?.poligono ?? null
  const selected = points.find(point => point.registro_id === selectedId)
  const selectedRecord = records.find(record => record.id === selected?.registro_id)
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

  function selectRecord(recordId: string | null) {
    const next = new URLSearchParams(params)
    if (recordId) next.set('registro', recordId)
    else next.delete('registro')
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

  return <Card as="section" className="space-y-3" aria-label="Mapa de la subcampaña para administración">
    <h2 className="text-lg font-extrabold text-brand-800">Mapa de {subcampania.nombre}</h2>
    <p className="text-xs leading-5 text-neutral-500">Polígono de la subcampaña y ubicaciones de plantaciones disponibles en la consulta pública. Vista de consulta.</p>
    {consulta.loading && <p role="status" className="text-sm text-neutral-600">Consultando las plantaciones del mapa…</p>}
    {Boolean(consulta.error) && <div className="space-y-2"><p role={impactoErrorStatus(consulta.error) === 404 ? 'status' : 'alert'} className="text-sm text-neutral-600">{impactoErrorStatus(consulta.error) === 404 ? 'Las plantaciones públicas no están disponibles para esta subcampaña. Esto no significa que no existan registros.' : `No pudimos consultar las plantaciones del mapa. ${impactoErrorMessage(consulta.error)}`}</p><Button size="sm" variant="secondary" onClick={consulta.retry}>Reintentar plantaciones del mapa</Button></div>}
    <ImpactoMapPanel compact privateScope subcampanias={[{ id: scopeId, nombre: subcampania.nombre, poligono: polygon }]}
      puntos={points} seleccion={selected ? `r:${selected.registro_id}` : `s:${scopeId}`}
      onSelect={value => selectRecord(points.find(point => value === `r:${point.registro_id}`)?.registro_id ?? null)} />
    {!polygon && <p className="text-sm text-neutral-500">El polígono no está disponible en las consultas de esta subcampaña.</p>}
    {points.length > 0 && <label className="block text-sm font-semibold text-brand-800">Seleccionar plantación
      <select value={selected?.registro_id ?? ''} onChange={event => selectRecord(event.target.value || null)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3">
        <option value="">Ver subcampaña</option>
        {points.map(point => <option key={point.registro_id} value={point.registro_id}>Registro {point.registro_id} · {formatImpactoNumber(point.cantidad_total_plantada)} plantas</option>)}
      </select>
    </label>}
    {selectedId && !selected && !consulta.loading && <p role="status" className="text-sm text-neutral-600">La plantación seleccionada no está disponible en esta consulta del mapa.</p>}
    {selected && <div className="space-y-2 rounded-2xl bg-brand-50 p-4 text-sm">
      <h3 className="break-words font-extrabold text-brand-800">{selectedRecord?.codigo_trazabilidad ?? `Registro ${selected.registro_id}`}</h3>
      <p>{formatImpactoNumber(selected.cantidad_total_plantada)} {selected.es_reposicion ? 'plantas de reposición' : 'plantas iniciales'} · Registro grupal</p>
      <Link to={`/impacto/registros/${selected.registro_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Abrir ficha pública</Link>
    </div>}
  </Card>
}
