import { describe, expect, it } from 'vitest'
import type { ImpactoPunto, ImpactoSubcampania } from '../types'
import { buildImpactoMapData, getImpactoGroupSelection } from './impactoMapData'

const scope: ImpactoSubcampania = {
  id: '9007199254740993', campania_id: '800', nombre: 'Zona pública', estado: 'ACTIVA', zona: null,
  poligono: {
    type: 'Polygon',
    coordinates: [
      [[-68.3, -16.7], [-68.1, -16.7], [-68.1, -16.5], [-68.3, -16.5], [-68.3, -16.7]],
      [[-68.25, -16.65], [-68.25, -16.55], [-68.15, -16.55], [-68.15, -16.65], [-68.25, -16.65]],
    ],
  },
  plantacion_inicial: 10, reposiciones: 0, bajas_reportadas: 0, registros: 1,
  meta_inicial: 20, faltantes: 10, avance_porcentaje: 50, url_publica: '/impacto/subcampanias/9007199254740993',
}
const point: ImpactoPunto = {
  registro_id: '9007199254740995', subcampania_id: scope.id,
  longitud: -68.2, latitud: -16.6, cantidad_total_plantada: 10, es_reposicion: false,
  url_publica: '/impacto/registros/9007199254740995',
}

describe('Datos geográficos del mapa de Impacto', () => {
  it('conserva longitud/latitud, todos los anillos del polígono y IDs BIGINT exactos', () => {
    const data = buildImpactoMapData([scope], [point], `s:${scope.id}`)
    const zone = data.zones.features[0]
    expect(zone.geometry).toEqual(scope.poligono)
    expect(zone.geometry.coordinates).toHaveLength(2)
    expect(zone.properties).toMatchObject({ id: '9007199254740993', selected: true })
    expect(data.groups[0].coordinates).toEqual([-68.2, -16.6])
    expect(data.groups[0].puntos[0].registro_id).toBe('9007199254740995')
    expect(data.bounds).toEqual([[-68.3, -16.7], [-68.1, -16.5]])
  })

  it('incluye puntos fuera de las zonas al calcular la extensión visible', () => {
    const data = buildImpactoMapData([scope], [{ ...point, longitud: -68.4, latitud: -16.4 }], null)
    expect(data.bounds).toEqual([[-68.4, -16.7], [-68.1, -16.4]])
  })

  it('agrupa coordenadas coincidentes sin perder registros de distintos ámbitos', () => {
    const otherPoint = { ...point, registro_id: '9007199254740996', subcampania_id: '9007199254740994', cantidad_total_plantada: 4, es_reposicion: true }
    const nearbyPoint = { ...point, registro_id: '9007199254740997', longitud: point.longitud + 0.000001 }
    const points = [point, otherPoint, nearbyPoint]
    const data = buildImpactoMapData([scope], points, `r:${otherPoint.registro_id}`)
    expect(data.groups).toHaveLength(2)
    const group = data.groups.find(item => item.puntos.length === 2)!
    expect(group.puntos).toEqual([point, otherPoint])
    expect(group.selected).toBe(true)
    expect(getImpactoGroupSelection(group)).toBeNull()
    expect(data.groups.flatMap(item => item.puntos).map(item => item.registro_id).sort()).toEqual(points.map(item => item.registro_id).sort())
  })

  it('selecciona el registro único o la zona compartida sin convertir los IDs a números', () => {
    const single = buildImpactoMapData([], [point], null).groups[0]
    expect(getImpactoGroupSelection(single)).toBe('r:9007199254740995')
    const shared = buildImpactoMapData([], [point, { ...point, registro_id: '9007199254740996' }], null).groups[0]
    expect(getImpactoGroupSelection(shared)).toBe('s:9007199254740993')
  })

  it('cambiar la selección o metadatos no cambia la geometría que controla el enfoque', () => {
    const initial = buildImpactoMapData([scope], [point], null)
    const selected = buildImpactoMapData([{ ...scope, nombre: 'Nombre actualizado' }], [{ ...point, cantidad_total_plantada: 12 }], `r:${point.registro_id}`)
    expect(selected.geometryKey).toBe(initial.geometryKey)
    expect(selected.groups[0].selected).toBe(true)
    expect(selected.groups[0].puntos[0].cantidad_total_plantada).toBe(12)
    expect(initial.groups[0].selected).toBe(false)
  })

  it('cambiar coordenadas cambia la clave para volver a encuadrar el alcance', () => {
    const initial = buildImpactoMapData([], [point], null)
    const moved = buildImpactoMapData([], [{ ...point, longitud: -68.4 }], null)
    expect(moved.geometryKey).not.toBe(initial.geometryKey)
  })

  it('un alcance sin geometría produce colecciones vacías y ninguna extensión', () => {
    const data = buildImpactoMapData([{ ...scope, poligono: null }], [], null)
    expect(data.zones.features).toEqual([])
    expect(data.groups).toEqual([])
    expect(data.coordinates).toEqual([])
    expect(data.bounds).toBeNull()
  })
})
