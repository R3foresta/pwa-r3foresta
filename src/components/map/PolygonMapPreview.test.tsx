import type { ReactNode } from 'react'
import type { LatLngBounds } from 'leaflet'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PolygonMapPreview, { type PolygonMapPreviewProps } from './PolygonMapPreview'

const mapState = vi.hoisted(() => ({
  map: { fitBounds: vi.fn() },
  container: vi.fn(),
  polygon: vi.fn(),
  baseFailed: false,
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: { children: ReactNode }) => {
    mapState.container(props)
    return <div>{children}</div>
  },
  Polygon: (props: unknown) => { mapState.polygon(props); return null },
  useMap: () => mapState.map,
}))
vi.mock('./OpenFreeMapBaseLayer', () => ({
  default: ({ allowRetry }: { allowRetry: boolean }) => mapState.baseFailed
    ? <><p role="status">El fondo del mapa no está disponible.</p>{allowRetry && <button>Reintentar fondo</button>}</>
    : null,
}))

const polygons: PolygonMapPreviewProps['polygons'] = [
  { id: '51', poligono: { type: 'Polygon', coordinates: [
    [[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]],
    [[-68.18, -16.58], [-68.16, -16.58], [-68.16, -16.56], [-68.18, -16.58]],
  ] } },
  { id: '52', poligono: { type: 'Polygon', coordinates: [
    [[-67.2, -15.6], [-67.1, -15.6], [-67.1, -15.5], [-67.2, -15.6]],
  ] } },
]

beforeEach(() => {
  mapState.baseFailed = false
  mapState.map.fitBounds.mockClear()
  mapState.container.mockClear()
  mapState.polygon.mockClear()
})

describe('Vista previa geográfica compartida', () => {
  it('encuadra todos los polígonos y conserva anillos interiores en latitud/longitud', () => {
    render(<PolygonMapPreview polygons={polygons} label="Cobertura de campaña" onClick={vi.fn()} />)
    expect(mapState.polygon).toHaveBeenCalledTimes(2)
    expect(mapState.polygon.mock.calls[0][0]).toMatchObject({
      positions: [
        [[-16.6, -68.2], [-16.6, -68.1], [-16.5, -68.1], [-16.6, -68.2]],
        [[-16.58, -68.18], [-16.58, -68.16], [-16.56, -68.16], [-16.58, -68.18]],
      ],
      interactive: false,
    })
    const bounds = mapState.map.fitBounds.mock.calls[0][0] as LatLngBounds
    expect(bounds.getSouthWest()).toMatchObject({ lat: -16.6, lng: -68.2 })
    expect(bounds.getNorthEast()).toMatchObject({ lat: -15.5, lng: -67.1 })
    expect(mapState.container.mock.calls[0][0]).toMatchObject({
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, keyboard: false, zoomControl: false,
    })
  })

  it('vuelve a encuadrar al cambiar la geometría sin conservar la campaña anterior', () => {
    const onClick = vi.fn()
    const view = render(<PolygonMapPreview polygons={polygons} label="Campaña" onClick={onClick} />)
    view.rerender(<PolygonMapPreview polygons={[polygons[1]]} label="Otra campaña" onClick={onClick} />)
    expect(mapState.map.fitBounds).toHaveBeenCalledTimes(2)
    const bounds = mapState.map.fitBounds.mock.calls[1][0] as LatLngBounds
    expect(bounds.getSouthWest()).toMatchObject({ lat: -15.6, lng: -67.2 })
    expect(bounds.getNorthEast()).toMatchObject({ lat: -15.5, lng: -67.1 })
  })

  it('conserva la apertura del mapa si falla el fondo y no anida botones de reintento', () => {
    mapState.baseFailed = true
    const onClick = vi.fn()
    render(<PolygonMapPreview polygons={polygons} label="Cobertura" onClick={onClick} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Reintentar fondo' })).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa completo' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('explica la falta de polígonos sin colocar el mapa en una ubicación ficticia', () => {
    const onClick = vi.fn()
    render(<PolygonMapPreview polygons={[]} label="Cobertura" onClick={onClick} />)
    expect(screen.getByText('Sin polígonos disponibles')).toBeTruthy()
    expect(mapState.container).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver mapa completo' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
