import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui'
import MapPointPopup from '../../../components/map/MapPointPopup'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'
import { buildImpactoMapData } from '../map/impactoMapData'
import { createImpactoMapController } from '../map/impactoMapController'
import type { ImpactoMapController, ImpactoMapPopup, ImpactoMapSnapshot } from '../map/impactoMapController'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../map/impactoMap.css'

export type ImpactoMapProps = {
  subcampanias: Pick<ImpactoSubcampania, 'id' | 'nombre' | 'poligono'>[]
  puntos: ImpactoPunto[]
  seleccion: string | null
  onSelect: (value: string) => void
  focusRevision?: number
  compact?: boolean
  /** Ocupa el contenedor de la vista de selección a pantalla completa. */
  fill?: boolean
  privateScope?: boolean
  /** Habilita el detalle público; una función permite conservar el retorno de cada pantalla. */
  recordReturnTo?: string | ((recordId: string) => string)
}

function selectedRecordReturn(returnTo: string, recordId: string) {
  const [pathname, search] = returnTo.split('?')
  const params = new URLSearchParams(search)
  params.set('seleccion', `r:${recordId}`)
  return `${pathname}?${params}`
}

export default function ImpactoMap({ subcampanias, puntos, seleccion, onSelect, focusRevision, compact = false, fill = false, privateScope = false, recordReturnTo }: ImpactoMapProps) {
  const data = useMemo(() => buildImpactoMapData(subcampanias, puntos, seleccion), [subcampanias, puntos, seleccion])
  const [attempt, setAttempt] = useState(0)
  if (!data.bounds) return <p className="rounded-2xl bg-brand-50 p-5 text-sm text-neutral-600">{privateScope ? 'No hay ubicación disponible para esta subcampaña.' : 'No hay ubicaciones públicas para representar en este alcance.'}</p>
  return <InteractiveMap key={attempt} data={data} onSelect={onSelect} focusRevision={focusRevision} compact={compact} fill={fill} privateScope={privateScope} recordReturnTo={recordReturnTo} onRetry={() => setAttempt(value => value + 1)} />
}

function InteractiveMap({ data, onSelect, focusRevision, onRetry, compact, fill, privateScope, recordReturnTo }: ImpactoMapSnapshot & { onRetry: () => void; compact: boolean; fill: boolean; privateScope: boolean; recordReturnTo?: ImpactoMapProps['recordReturnTo'] }) {
  const container = useRef<HTMLDivElement>(null)
  const controller = useRef<ImpactoMapController | null>(null)
  const initial = useRef({ data, onSelect, focusRevision })
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [baseMapFailed, setBaseMapFailed] = useState(false)
  const [popup, setPopup] = useState<ImpactoMapPopup | null>(null)
  const [expanded, setExpanded] = useState(false)
  const focusedPopup = useRef<ImpactoMapPopup | null>(null)
  const group = data.groups.find(item => item.id === popup?.groupId)

  useEffect(() => {
    if (!container.current) return
    const onFailure = () => { setFailed(true); controller.current?.destroy(); controller.current = null }
    try {
      controller.current = createImpactoMapController(container.current, initial.current, {
        onFailure, onReady: () => setReady(true), onBaseMapError: setBaseMapFailed, onPopup: setPopup,
      })
    } catch { onFailure() }
    return () => { controller.current?.destroy(); controller.current = null }
  }, [])
  useEffect(() => { controller.current?.update({ data, onSelect, focusRevision }) }, [data, onSelect, focusRevision])
  useLayoutEffect(() => {
    if (popup && group) controller.current?.popupReady(popup.container, focusedPopup.current !== popup)
    focusedPopup.current = popup
  }, [popup, group])

  if (failed) return (
    <div className="space-y-3 rounded-2xl bg-neutral-50 p-5">
      <p role="status" className="text-sm text-neutral-600">
        El mapa no se pudo mostrar. Puedes consultar y seleccionar las zonas y registros en las listas siguientes.
      </p>
      <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar mapa</Button>
    </div>
  )

  return <div className={fill ? "flex h-full min-h-48 flex-col" : "space-y-3"}>
    <div className={`impacto-map relative isolate overflow-hidden rounded-3xl bg-brand-50 ring-1 ring-brand-200 ${fill ? 'min-h-48 flex-1' : compact ? expanded ? 'h-[65svh] min-h-80' : 'h-[clamp(14rem,32svh,18rem)] sm:h-[420px]' : 'h-[360px] sm:h-[460px]'}`} role="region" aria-label={privateScope ? "Mapa de esta subcampaña" : fill ? "Mapa de subcampañas" : "Mapa público de zonas y registros grupales"}>
      <div ref={container} className="h-full w-full" />
      {!ready && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-50/80 text-sm text-brand-800">{privateScope ? 'Cargando mapa…' : 'Cargando mapa público…'}</div>}
      <div className="absolute left-3 top-3 z-10">
        <Button size="sm" variant="secondary" className="min-h-11 bg-white/95 shadow-soft" disabled={!ready} aria-label="Ver todas las ubicaciones del mapa" onClick={() => controller.current?.fit()}>
          Centrar mapa
        </Button>
      </div>
      {compact && <div className="absolute right-3 top-3 z-10"><Button size="sm" variant="secondary" className="min-h-11 bg-white/95 shadow-soft" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Reducir mapa' : 'Ampliar mapa'}</Button></div>}
      <div className="absolute bottom-12 right-3 z-10 flex flex-col gap-2">
        <Button size="sm" variant="secondary" className="h-11 w-11 rounded-xl bg-white/95 text-xl shadow-soft" disabled={!ready} aria-label="Acercar mapa" onClick={() => controller.current?.zoom(1)}>+</Button>
        <Button size="sm" variant="secondary" className="h-11 w-11 rounded-xl bg-white/95 text-xl shadow-soft" disabled={!ready} aria-label="Alejar mapa" onClick={() => controller.current?.zoom(-1)}>−</Button>
      </div>
    </div>
    {fill ? <p className="px-3 py-2 text-sm text-neutral-600">Verde: zona · Naranja: selección. Arrastra con el ratón o usa dos dedos para mover el mapa.</p> : compact ? <details className="px-2 text-sm text-neutral-600"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Leyenda y ayuda del mapa</summary><p className="pb-3 leading-5">Verde: plantación y zona de trabajo. Naranja: selección. Selecciona un punto o una zona para consultar. Arrastra con el ratón o usa dos dedos para mover el mapa; los botones + y − permiten acercar o alejar.</p></details> : <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Leyenda del mapa">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-700" aria-hidden="true" />Registro grupal
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm border border-brand-600 bg-brand-100" aria-hidden="true" />Zona de trabajo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-700" aria-hidden="true" />Selección
        </span>
      </div>
      <span>Arrastra con el ratón o usa dos dedos para mover el mapa.</span>
    </div>}
    {baseMapFailed && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4">
        <p role="status" className="max-w-2xl text-sm text-amber-900">
          El mapa base no está disponible. Las zonas y los registros siguen visibles; también puedes consultarlos en las listas.
        </p>
        <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar mapa</Button>
      </div>
    )}
    {popup && group && createPortal(
      <MapPointPopup title={group.puntos.length === 1 ? 'Plantación en esta ubicación' : `${group.puntos.length} plantaciones en esta ubicación`}>
          {group.puntos.map(point => recordReturnTo ? (
            <div key={point.registro_id} className="space-y-1">
              <p className="text-sm">{point.cantidad_total_plantada} {point.cantidad_total_plantada === 1 ? 'planta' : 'plantas'} {point.es_reposicion ? 'de reposición' : point.cantidad_total_plantada === 1 ? 'inicial' : 'iniciales'}</p>
              <Link to={`/impacto/registros/${point.registro_id}`} state={{ impactoReturnTo: typeof recordReturnTo === 'function' ? recordReturnTo(point.registro_id) : selectedRecordReturn(recordReturnTo, point.registro_id) }} onClick={() => onSelect(`r:${point.registro_id}`)} className="inline-flex min-h-11 w-full items-center rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Ver plantación {point.registro_id}</Link>
            </div>
          ) : (
            <Button key={point.registro_id} size="sm" variant="secondary" className="min-h-11 w-full text-left" onClick={() => onSelect(`r:${point.registro_id}`)}>
              Registro {point.registro_id}: {point.cantidad_total_plantada} {point.es_reposicion ? 'reposiciones' : 'iniciales'}
            </Button>
          ))}
      </MapPointPopup>, popup.container,
    )}
  </div>
}
