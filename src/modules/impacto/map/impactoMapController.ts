import { Map as LibreMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import type { ErrorEvent, GeoJSONSource, MapLayerMouseEvent, MapSourceDataEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { getImpactoGroupSelection } from './impactoMapData'
import type { ImpactoMapData } from './impactoMapData'
import { OPENFREEMAP_LIBERTY_STYLE_URL, ZONE_FILL, ZONE_SOURCE } from './impactoMapStyle'

setWorkerUrl(workerUrl)

export type ImpactoMapSnapshot = { data: ImpactoMapData; onSelect: (value: string) => void; focusRevision?: number }
export type ImpactoMapPopup = { groupId: string; container: HTMLDivElement }

/** React conserva los datos y la selección; MapLibre dibuja y comunica interacciones. */
export function createImpactoMapController(container: HTMLDivElement, initial: ImpactoMapSnapshot, events: {
  onFailure: () => void
  onReady: () => void
  onBaseMapError: (failed: boolean) => void
  onPopup: (popup: ImpactoMapPopup | null) => void
}) {
  let current = initial
  let loaded = false
  let disposed = false
  let popup: Popup | null = null
  let popupGroup: string | null = null
  const markers = new Map<string, { marker: Marker; button: HTMLButtonElement }>()
  const map = new LibreMap({
    container, style: OPENFREEMAP_LIBERTY_STYLE_URL, center: initial.data.coordinates[0], zoom: 12,
    maxZoom: 19, maxPitch: 0, renderWorldCopies: false, scrollZoom: false, dragRotate: false,
    touchPitch: false, cooperativeGestures: true, attributionControl: { compact: false },
    locale: { 'Map.Title': 'Mapa público de zonas y registros grupales', 'Popup.Close': 'Cerrar registros de esta ubicación', 'AttributionControl.ToggleAttribution': 'Mostrar atribución', 'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa', 'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl y la rueda para acercar el mapa', 'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ y la rueda para acercar el mapa' },
  })
  map.touchZoomRotate.disableRotation()

  function closePopup() {
    const previous = popup
    popup = null
    popupGroup = null
    previous?.remove()
    if (!disposed) events.onPopup(null)
  }
  function openGroup(id: string) {
    const group = current.data.groups.find(item => item.id === id)
    if (!group) return
    closePopup()
    const selection = getImpactoGroupSelection(group)
    if (selection) current.onSelect(selection)
    const content = document.createElement('div')
    popupGroup = id
    popup = new Popup({ closeButton: true, closeOnClick: false, maxWidth: '290px', offset: 18 })
      .setLngLat(group.coordinates).setDOMContent(content).addTo(map)
    popup.on('close', () => { popup = null; popupGroup = null; if (!disposed) events.onPopup(null) })
    events.onPopup({ groupId: id, container: content })
  }
  function syncMarkers() {
    const visible = new Set(current.data.groups.map(group => group.id))
    for (const [id, entry] of markers) {
      if (!visible.has(id)) { entry.marker.remove(); markers.delete(id) }
    }
    for (const group of current.data.groups) {
      let entry = markers.get(group.id)
      if (!entry) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'impacto-map-marker'
        button.addEventListener('click', event => { event.stopPropagation(); openGroup(group.id) })
        entry = { button, marker: new Marker({ element: button, anchor: 'center' }).setLngLat(group.coordinates).addTo(map) }
        markers.set(group.id, entry)
      }
      const label = group.puntos.length === 1 ? `Ver registro ${group.puntos[0].registro_id}` : `${group.puntos.length} registros en esta ubicación`
      entry.button.setAttribute('aria-label', label)
      entry.button.setAttribute('aria-pressed', String(group.selected))
      entry.button.title = label
      entry.button.dataset.selected = String(group.selected)
      entry.button.textContent = group.puntos.length > 1 ? String(group.puntos.length) : ''
    }
    if (popupGroup && !visible.has(popupGroup)) closePopup()
  }
  function fit() {
    if (!disposed && current.data.bounds) map.fitBounds(current.data.bounds, { padding: 48, maxZoom: 15, duration: 0 })
  }
  function sync() {
    if (!loaded || disposed) return
    map.getSource<GeoJSONSource>(ZONE_SOURCE)?.setData(current.data.zones)
    syncMarkers()
  }
  function onLoad() {
    if (disposed || loaded) return
    try {
      map.addSource(ZONE_SOURCE, { type: 'geojson', data: current.data.zones })
      map.addLayer({
        id: ZONE_FILL, type: 'fill', source: ZONE_SOURCE,
        paint: { 'fill-color': ['case', ['get', 'selected'], '#b45309', '#167449'], 'fill-opacity': ['case', ['get', 'selected'], 0.25, 0.12] },
      })
      map.addLayer({
        id: 'impacto-zones-line', type: 'line', source: ZONE_SOURCE,
        paint: { 'line-color': ['case', ['get', 'selected'], '#b45309', '#167449'], 'line-width': ['case', ['get', 'selected'], 3, 2] },
      })
      if (disposed) return
      loaded = true
      syncMarkers()
      fit()
      events.onReady()
    } catch { events.onFailure() }
  }
  function onZoneClick(event: MapLayerMouseEvent) {
    const id: unknown = event.features?.[0]?.properties.id
    if (typeof id === 'string' && current.data.zones.features.some(zone => zone.properties.id === id)) {
      closePopup()
      current.onSelect(`s:${id}`)
    }
  }
  function onError(event: ErrorEvent) {
    if ('sourceId' in event && event.sourceId && event.sourceId !== ZONE_SOURCE) events.onBaseMapError(true)
    else events.onFailure()
  }
  function onSourceData(event: MapSourceDataEvent) {
    // isSourceLoaded también puede ser true con teselas fallidas: exigir contenido cargado.
    if (event.sourceId !== ZONE_SOURCE && event.isSourceLoaded && event.tile?.state === 'loaded') events.onBaseMapError(false)
  }
  function onMouseEnter() { map.getCanvas().style.cursor = 'pointer' }
  function onMouseLeave() { map.getCanvas().style.cursor = '' }
  map.on('load', onLoad)
  // Las zonas y los marcadores no esperan a que terminen de descargar las teselas de Liberty.
  map.on('style.load', onLoad)
  map.on('error', onError)
  map.on('sourcedata', onSourceData)
  map.on('webglcontextlost', events.onFailure)
  map.on('click', ZONE_FILL, onZoneClick)
  map.on('mouseenter', ZONE_FILL, onMouseEnter)
  map.on('mouseleave', ZONE_FILL, onMouseLeave)
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!disposed) map.resize() })
  observer?.observe(container)

  return {
    update(next: ImpactoMapSnapshot) {
      const refit = current.data.geometryKey !== next.data.geometryKey || current.focusRevision !== next.focusRevision
      current = next
      sync()
      if (loaded && refit) fit()
    },
    fit,
    zoom(delta: number) { if (!disposed) map.easeTo({ zoom: Math.min(19, Math.max(0, map.getZoom() + delta)), duration: 0 }) },
    destroy() {
      if (disposed) return
      disposed = true
      observer?.disconnect()
      map.off('load', onLoad)
      map.off('style.load', onLoad)
      map.off('error', onError)
      map.off('sourcedata', onSourceData)
      map.off('webglcontextlost', events.onFailure)
      map.off('click', ZONE_FILL, onZoneClick)
      map.off('mouseenter', ZONE_FILL, onMouseEnter)
      map.off('mouseleave', ZONE_FILL, onMouseLeave)
      closePopup()
      markers.forEach(entry => entry.marker.remove())
      markers.clear()
      map.remove()
    },
  }
}

export type ImpactoMapController = ReturnType<typeof createImpactoMapController>
