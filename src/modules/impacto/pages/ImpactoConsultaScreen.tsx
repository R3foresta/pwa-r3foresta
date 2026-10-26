import { useMemo } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import ImpactoFilters from '../components/ImpactoFilters'
import ImpactoExplorer from '../components/ImpactoExplorer'
import ImpactoSummary from '../components/ImpactoSummary'
import ImpactoShare from '../components/ImpactoShare'
import ImpactoSubcampaniaCard from '../components/ImpactoSubcampaniaCard'
import { useImpactoConsulta } from '../hooks/useImpactoConsulta'
import { useImpactoExplorer } from '../hooks/useImpactoExplorer'
import type { ImpactoScope } from '../types'
import { FILTER_KEYS, formatImpactoDate, formatImpactoNumber, impactoErrorMessage, impactoErrorStatus, readImpactoQuery, safeImpactoReturn } from '../utils/consulta'

export default function ImpactoConsultaScreen() {
  const { campaniaId, subcampaniaId } = useParams()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const scope: ImpactoScope = subcampaniaId ? { tipo: 'subcampania', id: subcampaniaId } : campaniaId ? { tipo: 'campania', id: campaniaId } : { tipo: 'global' }
  const parsed = readImpactoQuery(location.search, scope)
  const { data, error, loading, loadingMore, pageError, scopeChanged, retry, loadMore } = useImpactoConsulta(scope, parsed.query, !parsed.error)
  const returnTo = location.pathname + location.search
  const selected = params.get('seleccion')
  const filtered = FILTER_KEYS.some((key) => Boolean(params.get(key)))
  const factsFiltered = Boolean(params.get('desde') || params.get('hasta') || params.get('planta_id'))
  const selectedSub = data?.subcampanias.find((item) => `s:${item.id}` === selected)
  const selectedPoint = data?.mapa.find((item) => `r:${item.registro_id}` === selected)
  const selectedRecord = data?.registros.find((item) => `r:${item.id}` === selected)
  const pathSub = subcampaniaId ? data?.subcampanias.find((item) => item.id === subcampaniaId) : null
  const pathCampaign = campaniaId ? data?.campanias.find((item) => item.id === campaniaId) : null
  const title = scope.tipo === 'global' ? 'Impacto global' : pathSub?.nombre ?? pathCampaign?.nombre ?? (scope.tipo === 'subcampania' ? 'Impacto de subcampaña' : 'Impacto de campaña')
  const backTo = safeImpactoReturn(location.state?.impactoReturnTo) ?? (pathSub ? `/impacto/campanias/${pathSub.campania_id}` : '/impacto')
  const options = useMemo(() => ({
    campanias: data?.campanias ?? [], subcampanias: data?.subcampanias ?? [],
    organizaciones: [...new Map(data?.registros.flatMap((item) => item.organizaciones_campania).map((item) => [item.id, item]) ?? []).values()],
    especies: [...new Map(data?.registros.flatMap((item) => item.especies).map((item) => [item.planta_id, { id: item.planta_id, nombre: item.nombre ?? 'Nombre histórico no disponible' }]) ?? []).values()],
  }), [data])

  const explorer = useImpactoExplorer({
    data,
    scope,
    queryKey: location.pathname + JSON.stringify(parsed.query),
    selected,
    onSelectionChange(value) {
      const next = new URLSearchParams(params)
      if (value) next.set('seleccion', value)
      else next.delete('seleccion')
      setParams(next, { replace: true, state: location.state })
    },
  })

  function clear() { setParams({}, { state: location.state }) }
  function scopeHref(path: string, level: 'campania' | 'subcampania') {
    const next = new URLSearchParams(params)
    next.delete('campania_id'); next.delete('cursor'); next.delete('seleccion')
    if (level === 'subcampania') next.delete('subcampania_id')
    return path + (next.size ? `?${next}` : '')
  }

  const notFound = impactoErrorStatus(error) === 404

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 pb-36 pt-2 sm:px-6 sm:pt-4">
      {scope.tipo !== 'global' && <PageHeader title={title} eyebrow="Nuestra huella" backTo={backTo} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {scope.tipo === 'global' ? (
          <h1 className="text-lg font-semibold tracking-tight text-brand-700 sm:text-xl">Nuestra huella, juntos</h1>
        ) : (
          <Link to="/impacto" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Ver todo el impacto</Link>
        )}
        <ImpactoShare key={returnTo} path={returnTo} title={title} />
      </div>
      {filtered && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2 text-sm">
          <p>Estás viendo una selección del impacto.</p>
          <Button variant="ghost" size="sm" className="min-h-11" onClick={clear}>Ver todo</Button>
        </div>
      )}
      {parsed.error && (
        <Card className="space-y-3">
          <p role="alert" className="text-sm text-danger-700">{parsed.error}</p>
          <Button variant="secondary" onClick={clear}>Limpiar filtros del enlace</Button>
        </Card>
      )}
      {loading && <Card><p role="status" className="text-sm text-neutral-600">Consultando impacto público…</p></Card>}
      {error && (
        <Card className="space-y-3">
          <h2 className="font-bold text-brand-800">{notFound ? 'Ámbito público no disponible' : 'No se pudo consultar el impacto'}</h2>
          <p role="alert" className="text-sm text-danger-700">{notFound ? 'El recurso no existe o no está disponible para consulta pública.' : impactoErrorMessage(error)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={retry}>Reintentar consulta</Button>
            {filtered && <Button variant="ghost" onClick={clear}>Limpiar filtros</Button>}
          </div>
        </Card>
      )}
      {data && <>
        {scopeChanged && (
          <Card className="space-y-3">
            <p role="status" className="text-sm text-neutral-700">El alcance público cambió durante la consulta. El mapa y los indicadores se actualizaron; las filas que dejaron de estar disponibles se retiraron.</p>
            <Button size="sm" variant="secondary" onClick={retry}>Actualizar alcance y lista</Button>
          </Card>
        )}
        <ImpactoSummary indicadores={data.indicadores} filtered={filtered} />
        {data.indicadores.registros === 0 && (
          <Card className="space-y-3">
            <h2 className="font-bold text-brand-800">{filtered ? 'Sin registros para estos filtros' : 'Sin registros públicos en este alcance'}</h2>
            <p className="text-sm text-neutral-600">{filtered ? 'Cambia o limpia los filtros para consultar otros hechos públicos.' : 'Las zonas públicas disponibles se muestran abajo cuando existen.'}</p>
            {filtered && <Button variant="secondary" onClick={clear}>Limpiar filtros</Button>}
          </Card>
        )}
        <ImpactoExplorer
          explorer={explorer}
          global={scope.tipo === 'global'}
          currentSubcampaniaId={subcampaniaId}
          selected={selected}
          returnTo={returnTo}
          scopeHref={scopeHref}
        />
        {selectedSub && (
          <section aria-label="Resumen de zona seleccionada" className="space-y-2">
            <h2 className="font-bold text-brand-800">Zona seleccionada</h2>
            <ImpactoSubcampaniaCard
              current={selectedSub.id === subcampaniaId}
              data={selectedSub}
              returnTo={returnTo}
              filtered={factsFiltered}
              href={scopeHref(`/impacto/subcampanias/${selectedSub.id}`, 'subcampania')}
            />
          </section>
        )}
        {selectedPoint && (
          <Card as="section" className="space-y-2" aria-label="Resumen del registro seleccionado">
            <h2 className="font-bold text-brand-800">{selectedRecord?.codigo_trazabilidad ?? `Registro ${selectedPoint.registro_id}`}</h2>
            <p className="text-sm text-neutral-700">{formatImpactoNumber(selectedPoint.cantidad_total_plantada)} plantas {selectedPoint.es_reposicion ? 'de reposición' : 'iniciales'} · Registro grupal</p>
            {selectedRecord && <p className="text-sm text-neutral-600">{formatImpactoDate(selectedRecord.fecha_plantacion)} · {selectedRecord.subcampania_nombre}</p>}
            <Link className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4" to={`/impacto/registros/${selectedPoint.registro_id}`} state={{ impactoReturnTo: returnTo }}>Abrir detalle público</Link>
          </Card>
        )}
        <details className="space-y-4 rounded-3xl border border-brand-100 bg-white p-4 sm:p-5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ver detalle de las zonas y las plantaciones</summary>
          <section aria-labelledby="impacto-subcampanias-title" className="space-y-3">
            <h2 id="impacto-subcampanias-title" className="text-lg font-bold text-brand-800">{scope.tipo === 'subcampania' ? 'Meta y avance inicial' : 'Subcampañas públicas'}</h2>
            {data.subcampanias.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.subcampanias.map(sub => (
                  <div key={sub.id} className="space-y-2">
                    <ImpactoSubcampaniaCard current={sub.id === subcampaniaId} data={sub} returnTo={returnTo} filtered={factsFiltered} href={scopeHref(`/impacto/subcampanias/${sub.id}`, 'subcampania')} />
                    <Button size="sm" variant="secondary" className="min-h-11" aria-pressed={selected === `s:${sub.id}`} onClick={() => explorer.select(`s:${sub.id}`)}>Seleccionar zona: {sub.nombre}</Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-600">No hay subcampañas públicas para esta consulta.</p>}
          </section>
          <section aria-labelledby="impacto-puntos-title" className="space-y-3">
            <h2 id="impacto-puntos-title" className="text-lg font-bold text-brand-800">Todos los puntos del mapa</h2>
            <details className="rounded-2xl bg-neutral-50 p-4">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-brand-700">Lista accesible de {formatImpactoNumber(data.mapa.length)} registros ubicados</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.mapa.map(point => (
                  <li key={point.registro_id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2">
                    <Button size="sm" variant="ghost" className="min-h-11" aria-pressed={selected === `r:${point.registro_id}`} onClick={() => explorer.select(`r:${point.registro_id}`)}>Seleccionar registro {point.registro_id}</Button>
                    <span className="text-xs text-neutral-600">{point.cantidad_total_plantada} plantas · {point.es_reposicion ? 'Reposición' : 'Inicial'}</span>
                    <Link to={`/impacto/registros/${point.registro_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-xs font-bold text-brand-700 underline">Abrir registro {point.registro_id}</Link>
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <section aria-labelledby="impacto-registros-title" className="space-y-3">
            <h2 id="impacto-registros-title" className="text-lg font-bold text-brand-800">Registros del alcance consultado</h2>
            <p className="text-xs text-neutral-500">Mostrando {data.registros.length} de {formatImpactoNumber(data.indicadores.registros)} registros grupales.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.registros.map(record => (
                <Card as="article" key={record.id} className="space-y-2">
                  <h3 className="break-words font-bold text-brand-800">{record.codigo_trazabilidad}</h3>
                  <p className="text-sm text-neutral-600">{formatImpactoDate(record.fecha_plantacion)} · {record.subcampania_nombre}</p>
                  <p className="text-sm font-semibold text-brand-800">{formatImpactoNumber(record.cantidad_total_plantada)} plantas {record.es_reposicion ? 'de reposición' : 'iniciales'}</p>
                  <Link to={`/impacto/registros/${record.id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4">Ver registro público {record.id}</Link>
                </Card>
              ))}
            </div>
            {pageError && (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-danger-700">No se pudo cargar la siguiente página. {impactoErrorMessage(pageError)}</p>
                <Button size="sm" variant="ghost" onClick={retry}>Actualizar alcance y lista</Button>
              </div>
            )}
            {data.siguiente_cursor && <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>{pageError ? 'Reintentar siguiente página' : 'Cargar más registros'}</Button>}
          </section>
        </details>
      </>}
      <details className="rounded-3xl border border-brand-100 p-4 sm:p-5">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-neutral-600">Consulta avanzada</summary>
        <div className="mt-3">
          <ImpactoFilters scope={scope} search={location.search} options={options} onApply={filters => setParams(filters, { state: location.state })} onClear={clear} />
        </div>
      </details>
    </main>
  )
}
