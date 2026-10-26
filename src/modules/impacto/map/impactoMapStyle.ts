import type { StyleSpecification } from 'maplibre-gl'

export const ZONE_SOURCE = 'impacto-zones'
export const ZONE_FILL = 'impacto-zones-fill'
export const OSM_SOURCE = 'osm'

/** Sin estilos remotos, claves, fuentes ni sprites adicionales. El navegador respeta la caché HTTP de OSM. */
export function createImpactoMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [OSM_SOURCE]: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      },
    },
    layers: [{
      id: 'osm-base', type: 'raster', source: OSM_SOURCE,
      paint: { 'raster-saturation': -0.55, 'raster-contrast': -0.08, 'raster-opacity': 0.9, 'raster-fade-duration': 0 },
    }],
  }
}
