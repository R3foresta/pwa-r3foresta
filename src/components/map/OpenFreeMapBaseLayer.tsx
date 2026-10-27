import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { DomEvent } from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import type { Map as LibreMap } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useMap } from 'react-leaflet'
import { OPENFREEMAP_LIBERTY_STYLE_URL } from '../../config/map'
import { Button } from '../ui'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

function removeBaseLayer(map: LeafletMap, layer: ReturnType<typeof maplibreGL> | undefined) {
  if (!layer || !map.hasLayer(layer)) return

  // Leaflet registra la capa y sus listeners antes de crear WebGL. Si falla el
  // constructor, el onRemove del adaptador intenta destruir un motor inexistente.
  if (!layer.getMaplibreMap()) {
    layer.onRemove = function () {
      this.getContainer()?.remove()
      return this
    }
  }
  map.removeLayer(layer)
}

/** Base vectorial Liberty; los marcadores y polígonos permanecen en Leaflet. */
export default function OpenFreeMapBaseLayer({ allowRetry = true }: { allowRetry?: boolean }) {
  const map = useMap()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let layer: ReturnType<typeof maplibreGL> | undefined
    let gl: LibreMap | undefined
    let disposed = false
    const onFailure = () => { if (!disposed) setFailed(true) }
    const onReady = () => { if (!disposed) setFailed(false) }

    try {
      layer = maplibreGL({ style: OPENFREEMAP_LIBERTY_STYLE_URL })
      map.addLayer(layer)
      gl = layer.getMaplibreMap()
      gl.on('error', onFailure)
      gl.on('webglcontextlost', onFailure)
      gl.on('load', onReady)
      gl.on('webglcontextrestored', onReady)
    } catch {
      removeBaseLayer(map, layer)
      onFailure()
    }

    return () => {
      disposed = true
      gl?.off('error', onFailure)
      gl?.off('webglcontextlost', onFailure)
      gl?.off('load', onReady)
      gl?.off('webglcontextrestored', onReady)
      removeBaseLayer(map, layer)
    }
  }, [map, attempt])

  if (!failed) return null
  return createPortal(
    <div className="pointer-events-none absolute inset-x-3 bottom-8 z-[1000]">
      <div ref={element => { if (element && allowRetry) { DomEvent.disableClickPropagation(element); DomEvent.disableScrollPropagation(element) } }} className={`${allowRetry ? 'pointer-events-auto' : ''} space-y-2 rounded-2xl bg-amber-50 p-3 shadow-soft ring-1 ring-amber-200`}>
        <p role="status" className="text-sm text-amber-900">El fondo del mapa no está disponible.{allowRetry && ' Puedes seguir usando los puntos, las zonas y el resto de la pantalla.'}</p>
        {allowRetry && <Button size="sm" variant="secondary" className="min-h-11" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Reintentar fondo</Button>}
      </div>
    </div>,
    map.getContainer(),
  )
}
