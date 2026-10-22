import { useMemo, useState, type UIEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import Icon from '../../../components/Icon'
import { PublicPhoto } from '../components/ImpactoRegistroContent'
import ImpactoFilters from '../components/ImpactoFilters'
import ImpactoMapPanel from '../components/ImpactoMapPanel'
import ImpactoShare from '../components/ImpactoShare'
import ImpactoSubcampaniaCard from '../components/ImpactoSubcampaniaCard'
import { useImpactoConsulta } from '../hooks/useImpactoConsulta'
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

  const viewKey = location.pathname + JSON.stringify(parsed.query)
  const [focus, setFocus] = useState<{ key: string; id: string } | null>(null)
  const focused = focus?.key === viewKey ? focus.id : null
  const choices = scope.tipo === 'global' ? data?.campanias.map(c => ({ id: c.id, nombre: c.nombre, count: c.plantacion_inicial, photo: data.registros.find(r => r.campania_id === c.id && r.fotos.length)?.fotos[0]?.id }))
    : data?.subcampanias.map(s => ({ id: s.id, nombre: s.zona || s.nombre, count: s.plantacion_inicial, photo: data.registros.find(r => r.subcampania_id === s.id && r.fotos.length)?.fotos[0]?.id }))
  choices?.sort((a, b) => b.count - a.count)
  const choice = choices?.find(c => c.id === focused)
  const zones = data?.subcampanias.filter(s => !choice || (scope.tipo === 'global' ? s.campania_id === choice.id : s.id === choice.id)) ?? []
  const zoneIds = new Set(zones.map(s => s.id))
  const points = data?.mapa.filter(p => !choice || zoneIds.has(p.subcampania_id)) ?? []
  function scrollCards(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    const center = el.getBoundingClientRect().left + el.clientWidth / 2
    const nearest = [...el.querySelectorAll<HTMLElement>('[data-campaign]')].reduce<HTMLElement | null>((best, card) => {
      const distance = (node: HTMLElement) => Math.abs(node.getBoundingClientRect().left + node.offsetWidth / 2 - center)
      return !best || distance(card) < distance(best) ? card : best
    }, null)
    if (nearest?.dataset.campaign) setFocus({ key: viewKey, id: nearest.dataset.campaign })
  }

  function select(value: string) {
    const next = new URLSearchParams(params)
    next.set('seleccion', value)
    setParams(next, { replace: true, state: location.state })
  }
  function clear() { setParams({}, { state: location.state }) }
  function scopeHref(path: string, level: 'campania' | 'subcampania') {
    const next = new URLSearchParams(params)
    next.delete('campania_id'); next.delete('cursor'); next.delete('seleccion')
    if (level === 'subcampania') next.delete('subcampania_id')
    return path + (next.size ? `?${next}` : '')
  }

  return <main className="mx-auto max-w-6xl space-y-5 px-5 pb-36 pt-2">
    {scope.tipo !== 'global' && <PageHeader title={title} eyebrow="Nuestra huella" backTo={backTo} />}
    <div className="flex flex-wrap items-center justify-between gap-3">{scope.tipo === 'global' ? <h1 className="text-sm font-semibold text-brand-600">Nuestra huella, juntos</h1> : <Link to="/impacto" className="text-sm font-semibold underline underline-offset-4">Ver todo el impacto</Link>}<ImpactoShare key={returnTo} path={returnTo} title={title} /></div>
    {filtered && <div className="flex flex-wrap items-center gap-2 text-sm"><p>Estás viendo una selección del impacto.</p><Button variant="ghost" size="sm" onClick={clear}>Ver todo</Button></div>}
    {parsed.error && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{parsed.error}</p><Button variant="secondary" onClick={clear}>Limpiar filtros del enlace</Button></Card>}
    {loading && <Card><p role="status" className="text-sm text-neutral-600">Consultando impacto público…</p></Card>}
    {error && <Card className="space-y-3"><h2 className="font-bold text-brand-800">{impactoErrorStatus(error) === 404 ? 'Ámbito público no disponible' : 'No se pudo consultar el impacto'}</h2><p role="alert" className="text-sm text-danger-700">{impactoErrorStatus(error) === 404 ? 'El recurso no existe o no está disponible para consulta pública.' : impactoErrorMessage(error)}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={retry}>Reintentar consulta</Button>{filtered && <Button variant="ghost" onClick={clear}>Limpiar filtros</Button>}</div></Card>}
    {data && <>
      {scopeChanged && <Card className="space-y-3"><p role="status" className="text-sm text-neutral-700">El alcance público cambió durante la consulta. El mapa y los indicadores se actualizaron; las filas que dejaron de estar disponibles se retiraron.</p><Button size="sm" variant="secondary" onClick={retry}>Actualizar alcance y lista</Button></Card>}
      <section aria-label="Indicadores de impacto" className="pb-3">
        <p className="text-6xl font-bold tracking-tighter text-brand-900 sm:text-8xl">{formatImpactoNumber(data.indicadores.plantacion_inicial)}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">plantas registradas</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">Plantaciones iniciales realizadas en equipo{filtered ? ' en esta selección' : ''}. Descubre dónde están y conoce cada jornada.</p>
        <details className="mt-2 text-xs text-neutral-500"><summary className="inline-flex min-h-8 cursor-pointer items-center underline underline-offset-4">Qué cuenta este número</summary><p className="mt-2">Bajas reportadas: {formatImpactoNumber(data.indicadores.bajas_reportadas)} · Reposiciones: {formatImpactoNumber(data.indicadores.reposiciones)}</p><p className="mt-1">Se presentan por separado de la plantación inicial; no representan supervivencia comprobada.</p></details>
      </section>
      {data.indicadores.registros === 0 && <Card className="space-y-3"><h2 className="font-bold text-brand-800">{filtered ? 'Sin registros para estos filtros' : 'Sin registros públicos en este alcance'}</h2><p className="text-sm text-neutral-600">{filtered ? 'Cambia o limpia los filtros para consultar otros hechos públicos.' : 'Las zonas públicas disponibles se muestran abajo cuando existen.'}</p>{filtered && <Button variant="secondary" onClick={clear}>Limpiar filtros</Button>}</Card>}
      <section aria-labelledby="impacto-mapa-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="impacto-mapa-title" className="text-lg font-bold">Aquí estamos plantando</h2><p className="mt-1 text-sm text-neutral-500" aria-live="polite">{choice?.nombre ?? 'Todas las ubicaciones públicas'}</p></div>{choice && <Button variant="secondary" size="sm" onClick={() => setFocus(null)}>Ver todas las ubicaciones</Button>}</div>
        <ImpactoMapPanel subcampanias={zones} puntos={points} seleccion={selected} onSelect={select} />
        <div className="flex items-center justify-between gap-2"><h3 className="font-bold">{scope.tipo === 'global' ? 'Descubre las campañas' : 'Explora las zonas'}</h3><span className="text-xs text-neutral-500">Desliza para explorar →</span></div>
        <div onScroll={scrollCards} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 pt-1" aria-label="Explorar campañas y zonas">
          {choices?.map(c => <Card as="article" padding="none" key={c.id} data-campaign={c.id} className={`w-[78%] max-w-72 shrink-0 snap-center overflow-hidden ${choice?.id === c.id ? 'ring-2 ring-brand-500' : ''}`}>
            {c.photo ? <PublicPhoto key={c.photo} id={c.photo} cover /> : <div className="flex h-32 items-center justify-center gap-2 bg-brand-100/70 text-brand-600"><Icon name="leaf" className="h-7 w-7" /><span className="text-xs">Sin foto pública disponible</span></div>}
            <div className="space-y-2 p-4"><h4 className="font-bold">{c.nombre}</h4><p className="text-sm text-neutral-600">{formatImpactoNumber(c.count)} plantas iniciales</p><Button variant="ghost" size="sm" className="min-h-11 w-full" aria-label={`Ver en el mapa: ${c.nombre}`} aria-pressed={choice?.id === c.id} onClick={() => setFocus({ key: viewKey, id: c.id })}>Ver en el mapa</Button><Link to={scopeHref(`/impacto/${scope.tipo === 'global' ? 'campanias' : 'subcampanias'}/${c.id}`, scope.tipo === 'global' ? 'campania' : 'subcampania')} state={{ impactoReturnTo: returnTo }} className="flex min-h-11 items-center justify-between text-sm font-bold text-brand-700">{scope.tipo === 'global' ? 'Conocer campaña' : 'Conocer zona'}<Icon name="chevron-right" className="h-4 w-4" /></Link></div>
          </Card>)}
        </div>
        <p className="text-xs leading-5 text-neutral-500">Cada punto reúne una plantación realizada en equipo. Tócalo para conocer su historia.</p>
      </section>
      {selectedSub && <section aria-label="Resumen de zona seleccionada" className="space-y-2"><h2 className="font-bold text-brand-800">Zona seleccionada</h2><ImpactoSubcampaniaCard data={selectedSub} returnTo={returnTo} filtered={factsFiltered} href={scopeHref(`/impacto/subcampanias/${selectedSub.id}`, 'subcampania')} /></section>}
      {selectedPoint && <Card as="section" className="space-y-2" aria-label="Resumen del registro seleccionado"><h2 className="font-bold text-brand-800">{selectedRecord?.codigo_trazabilidad ?? `Registro ${selectedPoint.registro_id}`}</h2><p className="text-sm text-neutral-700">{formatImpactoNumber(selectedPoint.cantidad_total_plantada)} plantas {selectedPoint.es_reposicion ? 'de reposición' : 'iniciales'} · Registro grupal</p>{selectedRecord && <p className="text-sm text-neutral-600">{formatImpactoDate(selectedRecord.fecha_plantacion)} · {selectedRecord.subcampania_nombre}</p>}<Link className="inline-block text-sm font-bold text-brand-700 underline underline-offset-4" to={`/impacto/registros/${selectedPoint.registro_id}`} state={{ impactoReturnTo: returnTo }}>Abrir detalle público</Link></Card>}
      <details className="space-y-4 rounded-2xl border border-brand-100 bg-white p-4"><summary className="cursor-pointer py-2 text-sm font-semibold">Ver detalle de las zonas y las plantaciones</summary>
      <section aria-labelledby="impacto-subcampanias-title" className="space-y-3"><h2 id="impacto-subcampanias-title" className="text-lg font-bold text-brand-800">{scope.tipo === 'subcampania' ? 'Meta y avance inicial' : 'Subcampañas públicas'}</h2>{data.subcampanias.length ? <div className="grid gap-3 md:grid-cols-2">{data.subcampanias.map((sub) => <div key={sub.id} className="space-y-2"><ImpactoSubcampaniaCard data={sub} returnTo={returnTo} filtered={factsFiltered} href={scopeHref(`/impacto/subcampanias/${sub.id}`, 'subcampania')} /><div className="flex gap-2"><Button size="sm" variant="secondary" aria-pressed={selected === `s:${sub.id}`} onClick={() => select(`s:${sub.id}`)}>Seleccionar zona: {sub.nombre}</Button></div></div>)}</div> : <p className="text-sm text-neutral-600">No hay subcampañas públicas para esta consulta.</p>}</section>
      <section aria-labelledby="impacto-puntos-title" className="space-y-3"><h2 id="impacto-puntos-title" className="text-lg font-bold text-brand-800">Todos los puntos del mapa</h2><details className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200"><summary className="cursor-pointer text-sm font-semibold text-brand-700">Lista accesible de {formatImpactoNumber(data.mapa.length)} registros ubicados</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{data.mapa.map((point) => <li key={point.registro_id} className="flex flex-wrap items-center gap-2 rounded-xl bg-neutral-50 p-2"><Button size="sm" variant="ghost" aria-pressed={selected === `r:${point.registro_id}`} onClick={() => select(`r:${point.registro_id}`)}>Seleccionar registro {point.registro_id}</Button><span className="text-xs text-neutral-600">{point.cantidad_total_plantada} plantas · {point.es_reposicion ? 'Reposición' : 'Inicial'}</span><Link to={`/impacto/registros/${point.registro_id}`} state={{ impactoReturnTo: returnTo }} className="text-xs font-bold text-brand-700 underline">Abrir registro {point.registro_id}</Link></li>)}</ul></details></section>
      <section aria-labelledby="impacto-registros-title" className="space-y-3"><h2 id="impacto-registros-title" className="text-lg font-bold text-brand-800">Registros del alcance consultado</h2><p className="text-xs text-neutral-500">Mostrando {data.registros.length} de {formatImpactoNumber(data.indicadores.registros)} registros grupales.</p><div className="grid gap-3 sm:grid-cols-2">{data.registros.map((record) => <Card as="article" key={record.id} className="space-y-2"><h3 className="break-words font-bold text-brand-800">{record.codigo_trazabilidad}</h3><p className="text-sm text-neutral-600">{formatImpactoDate(record.fecha_plantacion)} · {record.subcampania_nombre}</p><p className="text-sm font-semibold text-brand-800">{formatImpactoNumber(record.cantidad_total_plantada)} plantas {record.es_reposicion ? 'de reposición' : 'iniciales'}</p><Link to={`/impacto/registros/${record.id}`} state={{ impactoReturnTo: returnTo }} className="text-sm font-bold text-brand-700 underline underline-offset-4">Ver registro público {record.id}</Link></Card>)}</div>{pageError && <div className="space-y-2"><p role="alert" className="text-sm text-danger-700">No se pudo cargar la siguiente página. {impactoErrorMessage(pageError)}</p><Button size="sm" variant="ghost" onClick={retry}>Actualizar alcance y lista</Button></div>}{data.siguiente_cursor && <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>{pageError ? 'Reintentar siguiente página' : 'Cargar más registros'}</Button>}</section>
      </details>
    </>}
    <details className="rounded-2xl border border-brand-100 p-4"><summary className="cursor-pointer py-2 text-xs text-neutral-500">Consulta avanzada</summary><div className="mt-3"><ImpactoFilters scope={scope} search={location.search} options={options} onApply={(filters) => setParams(filters, { state: location.state })} onClear={clear} /></div></details>
  </main>
}
