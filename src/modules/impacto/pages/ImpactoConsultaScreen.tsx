import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import ImpactoFilters from '../components/ImpactoFilters'
import type { ImpactoFilterNames } from '../components/ImpactoFilters'
import ImpactoExplorer from '../components/ImpactoExplorer'
import ImpactoSummary from '../components/ImpactoSummary'
import ImpactoShare from '../components/ImpactoShare'
import ImpactoSubcampaniaCard from '../components/ImpactoSubcampaniaCard'
import ImpactoSelectionSummary from '../components/ImpactoSelectionSummary'
import ImpactoPointList from '../components/ImpactoPointList'
import { useImpactoConsulta } from '../hooks/useImpactoConsulta'
import { useImpactoExplorer } from '../hooks/useImpactoExplorer'
import { useImpactoPageTitle } from '../hooks/useImpactoPageTitle'
import { useImpactoPageFocus } from '../hooks/useImpactoPageFocus'
import type { ImpactoScope } from '../types'
import { FILTER_KEYS, formatImpactoDate, formatImpactoNumber, impactoErrorMessage, impactoErrorStatus, readImpactoQuery, safeImpactoReturn } from '../utils/consulta'
import type { ImpactoFilters as Filters } from '../utils/consulta'

export default function ImpactoConsultaScreen() {
  const { campaniaId, subcampaniaId } = useParams()
  const location = useLocation()
  const mainRef = useImpactoPageFocus()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [knownNames, setKnownNames] = useState<Record<string, string>>({})
  const resultStatus = useRef<HTMLParagraphElement>(null)
  const scope: ImpactoScope = subcampaniaId ? { tipo: 'subcampania', id: subcampaniaId } : campaniaId ? { tipo: 'campania', id: campaniaId } : { tipo: 'global' }
  const parsed = readImpactoQuery(location.search, scope)
  const { data, error, loading, loadingMore, pageError, scopeChanged, retry, loadMore } = useImpactoConsulta(scope, parsed.query, !parsed.error)
  const returnTo = location.pathname + location.search
  const selected = params.get('seleccion')
  const filtered = FILTER_KEYS.some((key) => Boolean(params.get(key)))
  const factsFiltered = Boolean(params.get('desde') || params.get('hasta') || params.get('planta_id'))
  const pathSub = subcampaniaId ? data?.subcampanias.find((item) => item.id === subcampaniaId) : null
  const pathCampaign = campaniaId ? data?.campanias.find((item) => item.id === campaniaId) : null
  const title = scope.tipo === 'global' ? 'Impacto global' : pathSub?.nombre ?? pathCampaign?.nombre ?? (scope.tipo === 'subcampania' ? 'Impacto de subcampaña' : 'Impacto de campaña')
  useImpactoPageTitle(title)
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
    view: { level: scope.tipo === 'global' && params.get('nivel') === 'campania' ? 'campania' : 'subcampania', focusId: params.get('foco') },
    onViewChange(view) {
      const next = new URLSearchParams(params)
      if (view.level === 'campania') next.set('nivel', 'campania')
      else next.delete('nivel')
      if (view.focusId) next.set('foco', view.focusId)
      else next.delete('foco')
      next.delete('seleccion')
      setParams(next, { replace: true, state: location.state })
    },
    onSelectionChange(value) {
      const next = new URLSearchParams(params)
      if (value) next.set('seleccion', value)
      else next.delete('seleccion')
      const zoneId = value?.startsWith('s:') ? value.slice(2) : data?.mapa.find(point => `r:${point.registro_id}` === value)?.subcampania_id
      const zone = data?.subcampanias.find(item => item.id === zoneId)
      const focusId = params.get('foco')
      if (focusId && zone && (params.get('nivel') === 'campania' ? zone.campania_id !== focusId : zone.id !== focusId)) next.delete('foco')
      setParams(next, { replace: true, state: location.state })
    },
  })

  function announceResults() {
    resultStatus.current?.focus({ preventScroll: true })
    resultStatus.current?.scrollIntoView?.({ block: 'center', behavior: 'auto' })
  }
  function apply(filters: Filters) {
    const names: Record<string, string> = {}
    for (const key of ['campania_id', 'subcampania_id', 'organizacion_id', 'planta_id'] as const) {
      const option = filterLabels[key][1].find(item => item.id === filters[key])
      if (option) names[`${key}:${option.id}`] = option.nombre
    }
    setKnownNames(previous => ({ ...previous, ...names }))
    setParams(filters, { state: location.state })
    announceResults()
  }
  function clear() { apply({}) }
  function scopeHref(path: string, level: 'campania' | 'subcampania') {
    const next = new URLSearchParams(params)
    next.delete('campania_id'); next.delete('cursor'); next.delete('seleccion'); next.delete('nivel'); next.delete('foco')
    if (level === 'subcampania') next.delete('subcampania_id')
    return path + (next.size ? `?${next}` : '')
  }

  const notFound = impactoErrorStatus(error) === 404
  const selectedNames: ImpactoFilterNames = Object.fromEntries((['campania_id', 'subcampania_id', 'organizacion_id', 'planta_id'] as const).map(key => [key, knownNames[`${key}:${params.get(key)}`]]))
  const speciesName = params.get('planta_id') ? options.especies.find(item => item.id === params.get('planta_id'))?.nombre ?? selectedNames.planta_id ?? 'la especie seleccionada' : undefined
  const filterLabels = {
    campania_id: ['Campaña', options.campanias], subcampania_id: ['Zona', options.subcampanias],
    organizacion_id: ['Organización', options.organizaciones], planta_id: ['Especie', options.especies],
  } as const
  function selectFromList(value: string) {
    explorer.select(value)
    const heading = explorer.mapSection.current?.querySelector<HTMLElement>('#impacto-mapa-title')
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView?.({ block: 'start', behavior: 'auto' })
  }

  return (
    <main ref={mainRef} className="mx-auto max-w-6xl space-y-6 px-4 pb-36 pt-2 sm:px-6 sm:pt-4">
      {scope.tipo !== 'global' && <PageHeader title={title} eyebrow="Nuestra huella" backTo={backTo} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {scope.tipo === 'global' ? (
          <h1 className="text-lg font-semibold tracking-tight text-brand-700 sm:text-xl">Nuestra huella, juntos</h1>
        ) : (
          <Link to="/impacto" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Ver todo el impacto</Link>
        )}
        <ImpactoShare key={returnTo} path={returnTo} title={title} />
      </div>
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
        <ImpactoSummary indicadores={data.indicadores} filtered={filtered} speciesName={speciesName} scopeLabel={title} />
        {data.indicadores.registros === 0 && (
          <Card className="space-y-3">
            <h2 className="font-bold text-brand-800">{filtered ? 'Sin registros para estos filtros' : 'Sin registros públicos en este alcance'}</h2>
            <p className="text-sm text-neutral-600">{filtered ? 'Cambia o limpia los filtros para consultar otros hechos públicos.' : 'Las zonas públicas disponibles se muestran abajo cuando existen.'}</p>
            {filtered && <Button variant="secondary" onClick={clear}>Limpiar filtros</Button>}
          </Card>
        )}
      </>}
      <section aria-label="Controles de consulta" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="min-h-11" aria-expanded={filtersOpen} aria-controls="impacto-filter-panel" onClick={() => setFiltersOpen(value => !value)}>Filtrar impacto público</Button>
          <Button variant="secondary" className="min-h-11" aria-expanded={listOpen} aria-controls="impacto-point-list" onClick={() => setListOpen(value => !value)}>{listOpen ? 'Ocultar lista' : 'Ver como lista'}</Button>
        </div>
        <p ref={resultStatus} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="rounded-xl text-sm leading-5 text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          {loading ? 'Actualizando resultados…' : error || parsed.error ? 'La consulta no está disponible. Revisa el aviso y vuelve a intentarlo.' : data ? `${formatImpactoNumber(data.mapa.length)} ${data.mapa.length === 1 ? 'plantación ubicada' : 'plantaciones ubicadas'} en la consulta${filtered ? ' con los filtros aplicados' : ''}.` : ''}
        </p>
        {filtered && <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
          {FILTER_KEYS.map(key => {
            const value = params.get(key)
            if (!value) return null
            const label = key === 'desde' ? `Desde: ${formatImpactoDate(value)}` : key === 'hasta' ? `Hasta: ${formatImpactoDate(value)}` : `${filterLabels[key][0]}: ${filterLabels[key][1].find(item => item.id === value)?.nombre ?? selectedNames[key] ?? 'selección del enlace'}`
            return <Button key={key} variant="secondary" size="sm" className="min-h-11 max-w-full whitespace-normal text-left" aria-label={`Quitar filtro ${label}`} onClick={() => {
              const filters: Filters = {}
              FILTER_KEYS.forEach(filterKey => { const entry = params.get(filterKey); if (filterKey !== key && entry) filters[filterKey] = entry })
              apply(filters)
            }}>{label} <span aria-hidden="true">×</span></Button>
          })}
          <Button variant="ghost" className="min-h-11" size="sm" onClick={clear}>Ver todo</Button>
        </div>}
        <div id="impacto-filter-panel" hidden={!filtersOpen}>
          <ImpactoFilters scope={scope} search={location.search} options={options} selectedNames={selectedNames} onApply={apply} onClear={clear} />
        </div>
        <div id="impacto-point-list" hidden={!listOpen}>
          {data && <ImpactoPointList points={explorer.points} zones={explorer.zones} selected={selected} returnTo={returnTo} onSelect={selectFromList} />}
        </div>
      </section>
      {data && <>
        <ImpactoExplorer
          explorer={explorer}
          global={scope.tipo === 'global'}
          currentSubcampaniaId={subcampaniaId}
          selected={selected}
          returnTo={returnTo}
          scopeHref={scopeHref}
          selectedSummary={<ImpactoSelectionSummary data={data} selected={selected} currentSubcampaniaId={subcampaniaId} returnTo={returnTo} filtered={factsFiltered} zoneHref={id => scopeHref(`/impacto/subcampanias/${id}`, 'subcampania')} />}
        />
        <details className="space-y-4 rounded-3xl border border-brand-100 bg-white p-4 sm:p-5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ver detalle de las zonas y las plantaciones</summary>
          <section aria-labelledby="impacto-subcampanias-title" className="space-y-3">
            <h2 id="impacto-subcampanias-title" className="text-lg font-bold text-brand-800">{scope.tipo === 'subcampania' ? 'Meta y avance inicial' : 'Zonas públicas'}</h2>
            {data.subcampanias.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.subcampanias.map(sub => (
                  <div key={sub.id} className="space-y-2">
                    <ImpactoSubcampaniaCard current={sub.id === subcampaniaId} data={sub} returnTo={returnTo} filtered={factsFiltered} href={scopeHref(`/impacto/subcampanias/${sub.id}`, 'subcampania')} />
                    <Button size="sm" variant="secondary" className="min-h-11" aria-pressed={selected === `s:${sub.id}`} onClick={() => selectFromList(`s:${sub.id}`)}>Seleccionar zona: {sub.nombre}</Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-600">No hay zonas públicas para esta consulta.</p>}
          </section>
          <section aria-labelledby="impacto-registros-title" className="space-y-3">
            <h2 id="impacto-registros-title" className="text-lg font-bold text-brand-800">Registros del alcance consultado</h2>
            <p className="text-sm text-neutral-600">Mostrando {data.registros.length} de {formatImpactoNumber(data.indicadores.registros)} {data.indicadores.registros === 1 ? 'registro grupal' : 'registros grupales'}.</p>
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
    </main>
  )
}
