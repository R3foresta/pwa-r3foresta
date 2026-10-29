import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeoJsonPolygon, Subcampania } from '../modules/plantacion/types/contracts'
import { PlantacionService } from './plantacion.service'

const backendPolygon: GeoJsonPolygon = {
  type: 'Polygon', coordinates: [[[-68.2, -16.6], [-68.1, -16.6], [-68.1, -16.5], [-68.2, -16.6]]],
}
const preferredPolygon: GeoJsonPolygon = {
  type: 'Polygon', coordinates: [[[-67.2, -16.6], [-67.1, -16.6], [-67.1, -16.5], [-67.2, -16.6]]],
}
const base: Subcampania = {
  id: 53, campania_id: 20, nombre: 'Zona borrador', zona_id: 3, estado: 'BORRADOR',
  meta_total_arboles: 60, created_at: '2026-10-28',
}

function respond(data: unknown) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { status: 200 }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

beforeEach(() => { localStorage.setItem('authToken', 'jwt') })
afterEach(() => { vi.unstubAllGlobals() })

describe('Geometría del detalle interno de subcampaña', () => {
  it('representa poligono_geojson del DTO real sin perder su nombre original ni los demás campos', async () => {
    const wire = { ...base, poligono_geojson: backendPolygon }
    const fetcher = respond(wire)
    const result = await PlantacionService.getSubcampania(53, 'auth-1')
    expect(result).toEqual({ ...wire, poligono: backendPolygon })
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/subcampanias/53'), {
      method: 'GET', headers: { 'x-auth-id': 'auth-1', Authorization: 'Bearer jwt' },
    })
  })

  it('prioriza poligono cuando el detalle entrega ambos campos', async () => {
    const wire = { ...base, poligono: preferredPolygon, poligono_geojson: backendPolygon }
    respond(wire)
    expect(await PlantacionService.getSubcampania(53, 'auth-1')).toEqual(wire)
  })

  it('usa la geometría del backend cuando poligono es null', async () => {
    const wire = { ...base, poligono: null, poligono_geojson: backendPolygon }
    respond(wire)
    expect(await PlantacionService.getSubcampania(53, 'auth-1')).toEqual({ ...wire, poligono: backendPolygon })
  })

  it.each([
    {}, { poligono: null }, { poligono_geojson: null }, { poligono: null, poligono_geojson: null },
  ])('conserva ausencia de geometría sin inventar coordenadas: %j', geometry => {
    const wire = { ...base, ...geometry }
    respond(wire)
    return expect(PlantacionService.getSubcampania(53, 'auth-1')).resolves.toEqual({ ...wire, poligono: null })
  })
})
