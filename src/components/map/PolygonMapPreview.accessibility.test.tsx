import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PolygonMapPreview from './PolygonMapPreview'

// JSDOM no anuncia SVG aunque sí permite dibujar sus nodos. Leaflet real usa
// esta detección al importar para elegir el renderer de los polígonos.
vi.hoisted(() => {
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', { configurable: true, value: () => ({}) })
})
vi.mock('./OpenFreeMapBaseLayer', () => ({ default: () => null }))

describe('Acceso por teclado a la vista previa con Leaflet real', () => {
  it('permite activar los créditos con Enter sin abrir el mapa y abre una sola vez desde su botón', async () => {
    const onOpen = vi.fn()
    render(<PolygonMapPreview polygons={[{ id: '51', poligono: {
      type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]]],
    } }]} label="Cobertura de campaña" onClick={onOpen} />)
    const button = screen.getByRole('button', { name: 'Ver mapa completo' })
    const attribution = screen.getByRole('link', { name: 'Leaflet' })
    expect(attribution.getAttribute('href')).toBe('https://leafletjs.com')
    expect(attribution.closest('button')).toBeNull()
    expect(button.contains(attribution)).toBe(false)
    const activateAttribution = vi.fn((event: Event) => event.preventDefault())
    attribution.addEventListener('click', activateAttribution)

    const user = userEvent.setup()
    await user.tab()
    expect(document.activeElement).toBe(button)
    await user.tab()
    expect(document.activeElement).toBe(attribution)
    await user.keyboard('{Enter}')
    expect(activateAttribution).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(button)
    await user.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledOnce()
    expect(activateAttribution).toHaveBeenCalledOnce()
  })
})
