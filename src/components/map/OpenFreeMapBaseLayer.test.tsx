import { StrictMode, useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { divIcon, type Map as LeafletMap } from 'leaflet'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import OpenFreeMapBaseLayer from './OpenFreeMapBaseLayer'

type Listener = () => void

const engine = vi.hoisted(() => {
  class FakeMap {
    _canvas = document.createElement('canvas')
    handlers = new Map<string, Listener[]>()
    constructor(options: { container: HTMLElement }) { options.container.append(this._canvas) }
    on(event: string, listener: Listener) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), listener])
      return this
    }
    off(event: string, listener: Listener) {
      this.handlers.set(event, (this.handlers.get(event) ?? []).filter(item => item !== listener))
      return this
    }
    emit(event: string) { [...(this.handlers.get(event) ?? [])].forEach(listener => listener()) }
    getStyle = () => ({ sources: {} })
    setTransformConstrain = vi.fn()
    jumpTo = vi.fn()
    remove = vi.fn(() => { this.handlers.clear(); this._canvas.remove() })
  }
  const maps: FakeMap[] = []
  const createMap = vi.fn(function (options: { container: HTMLElement }) {
    const map = new FakeMap(options)
    maps.push(map)
    return map
  })
  return { maps, createMap }
})

vi.mock('maplibre-gl', () => ({ Map: engine.createMap, setWorkerUrl: vi.fn() }))

const markerIcon = divIcon({ html: '<span>Ubicación conservada</span>' })

function MapContents({ onMap, onSelect }: { onMap: (map: LeafletMap) => void; onSelect: () => void }) {
  const map = useMap()
  useMapEvents({ click: onSelect })
  useEffect(() => { onMap(map) }, [map, onMap])
  return <><OpenFreeMapBaseLayer /><Marker position={[-16.5, -68.15]} icon={markerIcon} /></>
}

function mountMap(strict = false) {
  let map: LeafletMap | undefined
  const onMap = (value: LeafletMap) => { map = value }
  const onSelect = vi.fn()
  const content = <><label>Observaciones<input defaultValue="Captura en curso" /></label><MapContainer center={[-16.5, -68.15]} zoom={12} zoomAnimation={false}><MapContents onMap={onMap} onSelect={onSelect} /></MapContainer></>
  const view = render(strict ? <StrictMode>{content}</StrictMode> : content)
  if (!map) throw new Error('No se montó el mapa Leaflet')
  return { ...view, map, onSelect }
}

beforeEach(() => {
  engine.maps.length = 0
  engine.createMap.mockReset()
})

describe('Recuperación del fondo Liberty en mapas operativos', () => {
  it('conserva el formulario y la ubicación cuando WebGL falla y retira la capa parcialmente creada', () => {
    engine.createMap.mockImplementationOnce(() => { throw new Error('WebGL2 no disponible') })
    const { map, onSelect, unmount } = mountMap()
    expect(engine.createMap).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toMatch(/fondo del mapa no está disponible/i)
    expect(screen.getByText('Ubicación conservada')).toBeTruthy()
    const input = screen.getByRole('textbox', { name: 'Observaciones' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mantener esta captura' } })
    expect(document.querySelector('.leaflet-gl-layer')).toBeNull()
    expect(() => act(() => { map.setZoom(13); map.panTo([-16.51, -68.16]); map.fire('click') })).not.toThrow()
    expect(onSelect).toHaveBeenCalledOnce()
    expect(input.value).toBe('Mantener esta captura')
    expect(() => unmount()).not.toThrow()
  })

  it('reintenta solo el fondo y conserva la misma instancia Leaflet y los datos escritos', () => {
    engine.createMap.mockImplementationOnce(() => { throw new Error('WebGL2 no disponible') })
    const { map, onSelect } = mountMap()
    const input = screen.getByRole('textbox', { name: 'Observaciones' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Conservar al reintentar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar fondo' }))
    expect(onSelect).not.toHaveBeenCalled()
    act(() => engine.maps[0].emit('load'))
    expect(engine.createMap).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelectorAll('.leaflet-gl-layer')).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Observaciones' })).toBe(input)
    expect(input.value).toBe('Conservar al reintentar')
    act(() => map.fire('click'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.getByText('Ubicación conservada')).toBeTruthy()
  })

  it('avisa de un fallo de carga recuperable sin desmontar el mapa ni sus marcadores', () => {
    const { map, onSelect } = mountMap()
    const base = engine.maps[0]
    act(() => base.emit('error'))
    expect(screen.getByRole('status').textContent).toMatch(/fondo del mapa no está disponible/i)
    expect(base.remove).not.toHaveBeenCalled()
    act(() => map.fire('click'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.getByText('Ubicación conservada')).toBeTruthy()
    act(() => base.emit('load'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('permite recuperar la pérdida de contexto y libera el motor anterior al reintentar', () => {
    const { unmount } = mountMap()
    const first = engine.maps[0]
    act(() => first.emit('webglcontextlost'))
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => first.emit('webglcontextrestored'))
    expect(screen.queryByRole('status')).toBeNull()
    act(() => first.emit('webglcontextlost'))
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar fondo' }))
    expect(first.remove).toHaveBeenCalledOnce()
    act(() => engine.maps[1].emit('load'))
    expect(screen.queryByRole('status')).toBeNull()
    expect(() => unmount()).not.toThrow()
    expect(engine.maps[1].remove).toHaveBeenCalledOnce()
  })

  it('mantiene el acceso al mapa completo desde una vista previa sin anidar el botón de reintento', () => {
    engine.createMap.mockImplementationOnce(() => { throw new Error('WebGL2 no disponible') })
    const onOpen = vi.fn()
    render(<button type="button" onClick={onOpen}>Ver mapa completo<MapContainer center={[-16.5, -68.15]} zoom={12} zoomAnimation={false} zoomControl={false} attributionControl={false}><OpenFreeMapBaseLayer allowRetry={false} /></MapContainer></button>)
    expect(screen.getByRole('status').textContent).toMatch(/fondo del mapa no está disponible/i)
    expect(screen.queryByRole('button', { name: 'Reintentar fondo' })).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    fireEvent.click(screen.getByRole('status'))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('tolera StrictMode, incluido un primer intento fallido, sin capas ni motores pendientes al salir', () => {
    engine.createMap.mockImplementationOnce(() => { throw new Error('WebGL2 no disponible') })
    const { map, unmount } = mountMap(true)
    expect(() => act(() => map.setZoom(13))).not.toThrow()
    expect(document.querySelectorAll('.leaflet-gl-layer').length).toBeLessThanOrEqual(1)
    expect(() => unmount()).not.toThrow()
    expect(document.querySelector('.leaflet-gl-layer')).toBeNull()
    engine.maps.forEach(base => expect(base.remove).toHaveBeenCalledOnce())
  })
})
