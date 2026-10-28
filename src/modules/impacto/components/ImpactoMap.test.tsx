import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'
import ImpactoMap from './ImpactoMap'

type MapEvent = {
  features?: { properties: Record<string, unknown> }[]
  sourceId?: string
  isSourceLoaded?: boolean
  tile?: { state: string }
  error?: Error
  lngLat?: { lng: number; lat: number }
}
type Listener = (event: MapEvent) => void

const engine = vi.hoisted(() => {
  class FakeMap {
    container: HTMLElement
    handlers = new Map<string, Listener[]>()
    sources = new Map<string, { data: unknown; setData: ReturnType<typeof vi.fn> }>()
    layers: { id: string; type: string; source?: string }[] = []
    canvas = document.createElement('canvas')
    constructor(options: { container: HTMLElement; style: string }) { this.container = options.container }
    on = vi.fn((event: string, layerOrListener: string | Listener, listener?: Listener) => {
      const key = typeof layerOrListener === 'string' ? `${event}:${layerOrListener}` : event
      const handler = typeof layerOrListener === 'function' ? layerOrListener : listener!
      this.handlers.set(key, [...(this.handlers.get(key) ?? []), handler])
      return this
    })
    off = vi.fn((event: string, layerOrListener: string | Listener, listener?: Listener) => {
      const key = typeof layerOrListener === 'string' ? `${event}:${layerOrListener}` : event
      const handler = typeof layerOrListener === 'function' ? layerOrListener : listener
      this.handlers.set(key, (this.handlers.get(key) ?? []).filter(item => item !== handler))
      return this
    })
    emit(event: string, payload: MapEvent = {}, layer?: string) {
      this.handlers.get(layer ? `${event}:${layer}` : event)?.forEach(handler => handler(payload))
    }
    addSource = vi.fn((id: string, spec: { data?: unknown }) => {
      const source = { data: spec.data, setData: vi.fn((data: unknown) => { source.data = data }) }
      this.sources.set(id, source)
      return this
    })
    getSource = vi.fn((id: string) => this.sources.get(id))
    addLayer = vi.fn((layer: { id: string; type: string; source?: string }) => { this.layers.push(layer); return this })
    getCanvas = () => this.canvas
    getZoom = () => 12
    resize = vi.fn()
    fitBounds = vi.fn()
    easeTo = vi.fn()
    jumpTo = vi.fn()
    panBy = vi.fn()
    remove = vi.fn()
    touchZoomRotate = { disableRotation: vi.fn() }
  }
  const maps: FakeMap[] = []
  const createMap = vi.fn(function (options: { container: HTMLElement; style: string }) {
    const map = new FakeMap(options)
    maps.push(map)
    return map
  })
  const popups: FakePopup[] = []
  class FakePopup {
    element = document.createElement('div')
    handlers = new Map<string, (() => void)[]>()
    options: { focusAfterOpen?: boolean; maxWidth?: string }
    constructor(options: { focusAfterOpen?: boolean; maxWidth?: string }) { this.options = options; popups.push(this) }
    setDOMContent(content: HTMLElement) {
      const close = document.createElement('button')
      close.type = 'button'
      close.textContent = 'Cerrar registros de esta ubicación'
      close.addEventListener('click', () => this.remove())
      this.element.replaceChildren(content, close)
      return this
    }
    setLngLat = vi.fn(() => this)
    setMaxWidth = vi.fn((width: string) => { this.options.maxWidth = width; return this })
    getElement() { return this.element }
    addTo(map: FakeMap) { map.container.append(this.element); return this }
    remove() { this.element.remove(); this.handlers.get('close')?.forEach(handler => handler()); return this }
    on(event: string, handler: () => void) { this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this }
    off(event: string, handler: () => void) { this.handlers.set(event, (this.handlers.get(event) ?? []).filter(item => item !== handler)); return this }
  }
  class FakeMarker {
    element: HTMLElement
    constructor(options: { element: HTMLElement }) { this.element = options.element }
    setLngLat() { return this }
    getElement() { return this.element }
    addTo(map: FakeMap) { map.container.append(this.element); return this }
    remove() { this.element.remove(); return this }
  }
  const api = {
    Map: createMap,
    Popup: FakePopup,
    Marker: FakeMarker,
    setWorkerUrl: vi.fn(),
  }
  return { maps, popups, createMap, api }
})

vi.mock('maplibre-gl', () => ({ ...engine.api, default: engine.api }))

const scope: ImpactoSubcampania = {
  id: '9007199254740993', campania_id: '800', nombre: 'Zona pública', estado: 'ACTIVA', zona: null,
  poligono: { type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]]] },
  plantacion_inicial: 10, reposiciones: 0, bajas_reportadas: 0, registros: 1,
  meta_inicial: 20, faltantes: 10, avance_porcentaje: 50, url_publica: '/impacto/subcampanias/9007199254740993',
}
const point: ImpactoPunto = {
  registro_id: '9007199254740995', subcampania_id: scope.id,
  longitud: -68.15, latitud: -16.55, cantidad_total_plantada: 10, es_reposicion: false,
  url_publica: '/impacto/registros/9007199254740995',
}

let observers: { callback: ResizeObserverCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[]

beforeEach(() => {
  engine.maps.length = 0
  engine.popups.length = 0
  engine.createMap.mockClear()
  observers = []
  vi.stubGlobal('ResizeObserver', class {
    callback: ResizeObserverCallback
    observe = vi.fn()
    disconnect = vi.fn()
    constructor(callback: ResizeObserverCallback) { this.callback = callback; observers.push(this) }
  })
})

function mountMap(onSelect = vi.fn()) {
  const props = { subcampanias: [scope], puntos: [point], seleccion: null, onSelect, focusRevision: 0 }
  const view = render(<ImpactoMap {...props} />)
  const map = engine.maps[0]
  act(() => map.emit('load'))
  return { ...view, map, props }
}

describe('Mapa público de Impacto con MapLibre', () => {
  it('enfoca el contenido tras montarlo, permite Tab hasta cerrar y devuelve foco al marcador', async () => {
    const user = userEvent.setup()
    mountMap()
    const marker = screen.getByRole('button', { name: `Ver registro ${point.registro_id}` })
    marker.focus()
    await user.keyboard('{Enter}')
    const record = screen.getByRole('button', { name: 'Registro 9007199254740995: 10 iniciales' })
    expect(document.activeElement).toBe(record)
    expect(engine.popups[0].options.focusAfterOpen).toBe(false)
    await user.tab()
    const close = screen.getByRole('button', { name: 'Cerrar registros de esta ubicación' })
    expect(document.activeElement).toBe(close)
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(marker)
    expect(screen.queryByRole('button', { name: 'Registro 9007199254740995: 10 iniciales' })).toBeNull()
  })

  it('cierra con Escape y conserva el foco del marcador que abrió el contenido', async () => {
    const user = userEvent.setup()
    mountMap()
    const marker = screen.getByRole('button', { name: `Ver registro ${point.registro_id}` })
    await user.click(marker)
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(marker)
    expect(screen.queryByRole('button', { name: 'Cerrar registros de esta ubicación' })).toBeNull()
  })

  it('recalcula el anclaje con contenido React y limita el ancho a mapas estrechos', () => {
    const { map } = mountMap()
    Object.defineProperty(map.container, 'clientWidth', { configurable: true, value: 288 })
    Object.defineProperty(map.container, 'clientHeight', { configurable: true, value: 360 })
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    expect(engine.popups[0].setMaxWidth).toHaveBeenLastCalledWith('256px')
    expect(engine.popups[0].setLngLat).toHaveBeenCalledTimes(2)
  })

  it('abre el detalle desde el popup con el retorno de la consulta pública', async () => {
    const user = userEvent.setup()
    function Destination() {
      const location = useLocation()
      return <p data-testid="destination">{location.pathname}|{location.state?.impactoReturnTo}</p>
    }
    render(<MemoryRouter><ImpactoMap subcampanias={[scope]} puntos={[point]} seleccion={null} onSelect={vi.fn()} recordReturnTo="/impacto?desde=2026-10-01" /><Destination /></MemoryRouter>)
    act(() => engine.maps[0].emit('load'))
    await user.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    const link = screen.getByRole('link', { name: `Ver plantación ${point.registro_id}` })
    expect(document.activeElement).toBe(link)
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('destination').textContent).toBe(`/impacto/registros/${point.registro_id}|/impacto?desde=2026-10-01&seleccion=r%3A${point.registro_id}`)
  })

  it('desplaza el mapa si el contenido todavía rebasa su borde tras medirlo', () => {
    const { map } = mountMap()
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    vi.spyOn(map.container, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 288, top: 0, bottom: 360, width: 288, height: 360 } as DOMRect)
    vi.spyOn(engine.popups[0].element, 'getBoundingClientRect').mockReturnValue({ left: 160, right: 380, top: 60, bottom: 250, width: 220, height: 190 } as DOMRect)
    act(() => observers[0].callback([], observers[0] as unknown as ResizeObserver))
    expect(map.panBy).toHaveBeenLastCalledWith([104, 0], { duration: 0 })
  })

  it('carga el estilo Liberty de OpenFreeMap', () => {
    mountMap()
    expect(engine.createMap.mock.calls[0][0].style).toBe('https://tiles.openfreemap.org/styles/liberty')
  })

  it('permite ampliar el mapa compacto y volver sin perder la selección ni reiniciar el motor', () => {
    const onSelect = vi.fn()
    render(<ImpactoMap compact subcampanias={[scope]} puntos={[point]} seleccion={`r:${point.registro_id}`} onSelect={onSelect} />)
    act(() => engine.maps[0].emit('load'))
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }))
    expect(screen.getByRole('button', { name: 'Reducir mapa' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    expect(onSelect).toHaveBeenCalledWith(`r:${point.registro_id}`)
    fireEvent.click(screen.getByRole('button', { name: 'Reducir mapa' }))
    expect(screen.getByRole('button', { name: 'Ampliar mapa' }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }).getAttribute('aria-pressed')).toBe('true')
    expect(engine.createMap).toHaveBeenCalledOnce()
    expect(engine.maps[0].remove).not.toHaveBeenCalled()
  })

  it('explica el alcance vacío sin inicializar el motor gráfico', () => {
    render(<ImpactoMap subcampanias={[]} puntos={[]} seleccion={null} onSelect={vi.fn()} />)
    expect(screen.getByText(/No hay ubicaciones públicas/)).toBeTruthy()
    expect(engine.createMap).not.toHaveBeenCalled()
  })

  it('conserva la instancia y la cámara al cambiar solamente la selección', () => {
    const { rerender, map, props } = mountMap()
    map.fitBounds.mockClear()
    map.easeTo.mockClear()
    map.jumpTo.mockClear()
    rerender(<ImpactoMap {...props} seleccion={`r:${point.registro_id}`} />)
    expect(engine.createMap).toHaveBeenCalledOnce()
    expect(map.remove).not.toHaveBeenCalled()
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(map.easeTo).not.toHaveBeenCalled()
    expect(map.jumpTo).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }).getAttribute('aria-pressed')).toBe('true')
  })

  it('reencuadra al solicitar un enfoque explícito aunque las coordenadas no cambien', () => {
    const { rerender, map, props } = mountMap()
    map.fitBounds.mockClear()
    rerender(<ImpactoMap {...props} focusRevision={1} />)
    expect(map.fitBounds).toHaveBeenCalledOnce()
    expect(engine.createMap).toHaveBeenCalledOnce()
  })

  it('selecciona zonas con IDs exactos usando el callback vigente tras un render nuevo', () => {
    const originalSelect = vi.fn(), currentSelect = vi.fn()
    const { rerender, map, props } = mountMap(originalSelect)
    rerender(<ImpactoMap {...props} onSelect={currentSelect} />)
    act(() => map.emit('click', { features: [{ properties: { id: scope.id } }] }, 'impacto-zones-fill'))
    expect(currentSelect).toHaveBeenCalledWith('s:9007199254740993')
    expect(originalSelect).not.toHaveBeenCalled()
    expect(engine.createMap).toHaveBeenCalledOnce()
  })

  it('actualiza los registros representados sin conservar el ID ni el callback anterior', () => {
    const originalSelect = vi.fn(), currentSelect = vi.fn()
    const { rerender, map, props } = mountMap(originalSelect)
    const updatedPoint = { ...point, registro_id: '9007199254740996', cantidad_total_plantada: 14 }
    map.fitBounds.mockClear()
    rerender(<ImpactoMap {...props} puntos={[updatedPoint]} onSelect={currentSelect} />)
    expect(screen.queryByRole('button', { name: `Ver registro ${point.registro_id}` })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${updatedPoint.registro_id}` }))
    expect(currentSelect).toHaveBeenCalledWith('r:9007199254740996')
    expect(originalSelect).not.toHaveBeenCalled()
    expect(engine.createMap).toHaveBeenCalledOnce()
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Registro 9007199254740996: 14 iniciales' })).toBeTruthy()
  })

  it('usa los datos y la selección más recientes cuando termina la carga del mapa', () => {
    const originalSelect = vi.fn(), currentSelect = vi.fn()
    const { rerender } = render(<ImpactoMap subcampanias={[scope]} puntos={[point]} seleccion={null} onSelect={originalSelect} />)
    const updatedPoint = { ...point, registro_id: '9007199254740996', longitud: -68.16 }
    rerender(<ImpactoMap subcampanias={[scope]} puntos={[updatedPoint]} seleccion={`r:${updatedPoint.registro_id}`} onSelect={currentSelect} />)
    act(() => engine.maps[0].emit('load'))
    expect(screen.queryByRole('button', { name: `Ver registro ${point.registro_id}` })).toBeNull()
    const marker = screen.getByRole('button', { name: `Ver registro ${updatedPoint.registro_id}` })
    expect(marker.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(marker)
    expect(currentSelect).toHaveBeenCalledWith(`r:${updatedPoint.registro_id}`)
    expect(originalSelect).not.toHaveBeenCalled()
    expect(engine.createMap).toHaveBeenCalledOnce()
  })

  it('actualiza el contenido de un popup abierto y no deja elegir registros retirados', () => {
    const originalSelect = vi.fn(), currentSelect = vi.fn()
    const { rerender, props } = mountMap(originalSelect)
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    originalSelect.mockClear()
    const updatedPoint = { ...point, registro_id: '9007199254740996', cantidad_total_plantada: 14 }
    rerender(<ImpactoMap {...props} puntos={[updatedPoint]} onSelect={currentSelect} />)
    expect(screen.queryByRole('button', { name: 'Registro 9007199254740995: 10 iniciales' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Registro 9007199254740996: 14 iniciales' }))
    expect(currentSelect).toHaveBeenCalledWith('r:9007199254740996')
    expect(originalSelect).not.toHaveBeenCalled()
  })

  it('reemplaza las zonas y descarta clics tardíos sobre una zona que ya salió del alcance', () => {
    const onSelect = vi.fn()
    const { rerender, map, props } = mountMap(onSelect)
    const updatedScope = { ...scope, id: '9007199254740994' }
    rerender(<ImpactoMap {...props} subcampanias={[updatedScope]} seleccion={`s:${updatedScope.id}`} />)
    expect(map.sources.get('impacto-zones')?.data).toMatchObject({ features: [{ properties: { id: updatedScope.id, selected: true } }] })
    act(() => map.emit('click', { features: [{ properties: { id: scope.id } }] }, 'impacto-zones-fill'))
    expect(onSelect).not.toHaveBeenCalled()
    act(() => map.emit('click', { features: [{ properties: { id: updatedScope.id } }] }, 'impacto-zones-fill'))
    expect(onSelect).toHaveBeenCalledWith('s:9007199254740994')
    expect(engine.createMap).toHaveBeenCalledOnce()
  })

  it('permite elegir cada registro coincidente de distintos ámbitos sin decidir uno arbitrariamente', () => {
    const onSelect = vi.fn()
    const otherPoint = { ...point, registro_id: '9007199254740996', subcampania_id: '9007199254740994', cantidad_total_plantada: 4, es_reposicion: true }
    render(<ImpactoMap subcampanias={[scope]} puntos={[point, otherPoint]} seleccion={null} onSelect={onSelect} />)
    act(() => engine.maps[0].emit('load'))
    fireEvent.click(screen.getByRole('button', { name: '2 registros en esta ubicación' }))
    expect(onSelect).not.toHaveBeenCalled()
    const initialRecord = screen.getByRole('button', { name: 'Registro 9007199254740995: 10 iniciales' })
    const replacementRecord = screen.getByRole('button', { name: 'Registro 9007199254740996: 4 reposiciones' })
    fireEvent.click(initialRecord)
    expect(onSelect).toHaveBeenLastCalledWith('r:9007199254740995')
    fireEvent.click(replacementRecord)
    expect(onSelect).toHaveBeenLastCalledWith('r:9007199254740996')
  })

  it('distingue un fallo del fondo Liberty del contenido público y permite seguir seleccionando', () => {
    const onSelect = vi.fn()
    const { map } = mountMap(onSelect)
    act(() => map.emit('error', { sourceId: 'liberty-source', error: new Error('No se pudo cargar la tesela') }))
    expect(screen.getByRole('status').textContent).toMatch(/mapa base no está disponible/i)
    fireEvent.click(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` }))
    expect(onSelect).toHaveBeenCalledWith(`r:${point.registro_id}`)
    expect(map.remove).not.toHaveBeenCalled()
    act(() => map.emit('sourcedata', { sourceId: 'liberty-source', isSourceLoaded: true, tile: { state: 'errored' } }))
    expect(screen.getByRole('status').textContent).toMatch(/mapa base no está disponible/i)
    act(() => map.emit('sourcedata', { sourceId: 'liberty-source', isSourceLoaded: true, tile: { state: 'loaded' } }))
    expect(screen.queryByText(/mapa base no está disponible/i)).toBeNull()
  })

  it('retira el mapa anterior cuando el alcance actualizado deja de tener ubicaciones', () => {
    const { rerender, map, props } = mountMap()
    rerender(<ImpactoMap {...props} subcampanias={[]} puntos={[]} />)
    expect(screen.getByText(/No hay ubicaciones públicas/)).toBeTruthy()
    expect(map.remove).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: `Ver registro ${point.registro_id}` })).toBeNull()
  })

  it('ajusta el tamaño sin recentrar y libera el observador y el mapa al desmontar', () => {
    const { unmount, map } = mountMap()
    expect(observers).toHaveLength(1)
    const observer = observers[0]
    expect(observer.observe).toHaveBeenCalledWith(map.container)
    map.fitBounds.mockClear()
    map.resize.mockClear()
    act(() => observer.callback([], observer as unknown as ResizeObserver))
    expect(map.resize).toHaveBeenCalled()
    expect(map.fitBounds).not.toHaveBeenCalled()
    unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(map.remove).toHaveBeenCalledOnce()
  })

  it('ofrece las listas como alternativa si WebGL no permite crear el mapa', () => {
    engine.createMap.mockImplementationOnce(() => { throw new Error('WebGL no disponible') })
    render(<ImpactoMap subcampanias={[scope]} puntos={[point]} seleccion={null} onSelect={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toMatch(/mapa.*(?:mostrar|disponible)/i)
    expect(screen.getByRole('status').textContent).toMatch(/listas/i)
  })

  it('libera el motor al perder WebGL y permite reintentar con los mismos datos públicos', () => {
    const { map } = mountMap()
    act(() => map.emit('webglcontextlost'))
    expect(screen.getByRole('status').textContent).toMatch(/listas/i)
    expect(map.remove).toHaveBeenCalledOnce()
    expect(observers[0].disconnect).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }))
    expect(engine.createMap).toHaveBeenCalledTimes(2)
    act(() => engine.maps[1].emit('load'))
    expect(screen.getByRole('button', { name: `Ver registro ${point.registro_id}` })).toBeTruthy()
    expect(screen.queryByText(/El mapa no se pudo mostrar/)).toBeNull()
  })
})
