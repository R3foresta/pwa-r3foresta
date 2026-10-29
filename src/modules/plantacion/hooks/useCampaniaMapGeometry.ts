import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlantacionService } from '../../../services/plantacion.service'
import type { GeoJsonPolygon, Subcampania } from '../types/contracts'

type Target = { id: number; campaniaId: number }
type ScopeKey = { serialized: string }
type GeometryCache = {
  key: ScopeKey
  polygons: Map<string, GeoJsonPolygon>
  incomplete: Set<number>
}
type GeometryResult = {
  key: ScopeKey
  revision: number
  polygons: Map<string, GeoJsonPolygon>
  pending: number
  errors: number
}

/** Completa sólo la geometría omitida por el listado interno autorizado. */
export function useCampaniaMapGeometry(subcampanias: Subcampania[], authId?: string, enabled = true) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<GeometryResult | null>(null)
  const cache = useRef<GeometryCache | null>(null)
  const emptyPolygons = useMemo(() => new Map<string, GeoJsonPolygon>(), [])
  const targets = [...new Map(subcampanias.filter(sub => !sub.poligono)
    .map(sub => [sub.id, { id: sub.id, campaniaId: sub.campania_id }])).values()]
    .sort((first, second) => first.id - second.id)
  const serialized = JSON.stringify([targets, authId ?? null, enabled])
  // La identidad cambia también en A → B → A: no reaparece una lectura antigua.
  const scopeKey = useMemo(() => ({ serialized }), [serialized])

  useEffect(() => {
    if (!enabled) return
    const [requested, requestedAuth] = JSON.parse(scopeKey.serialized) as [Target[], string | null]
    const currentCache: GeometryCache = cache.current?.key === scopeKey ? cache.current : {
      key: scopeKey, polygons: new Map(), incomplete: new Set(requested.map(target => target.id)),
    }
    cache.current = currentCache
    // Los null confirmados y los polígonos correctos no se vuelven a consultar al reintentar.
    const queue = requested.filter(target => currentCache.incomplete.has(target.id))
    let disposed = false
    let nextIndex = 0
    let pending = queue.length
    let errors = 0
    const publish = () => setResult({ key: scopeKey, revision,
      polygons: new Map(currentCache.polygons), pending, errors })
    publish()

    async function worker() {
      while (!disposed && nextIndex < queue.length) {
        const target = queue[nextIndex++]
        try {
          const detail = await PlantacionService.getSubcampania(target.id, requestedAuth ?? undefined)
          if (disposed) return
          if (detail.id !== target.id || detail.campania_id !== target.campaniaId) {
            throw new Error('La geometría recibida no corresponde a la subcampaña solicitada.')
          }
          if (detail.poligono) currentCache.polygons.set(String(target.id), detail.poligono)
          currentCache.incomplete.delete(target.id)
        } catch {
          if (disposed) return
          errors += 1
        }
        pending -= 1
        publish()
      }
    }

    for (let index = 0; index < Math.min(4, queue.length); index += 1) void worker()
    return () => { disposed = true }
  }, [scopeKey, revision, enabled])

  const current = result?.key === scopeKey ? result : null
  const retry = useCallback(() => setRevision(value => value + 1), [])
  return {
    polygons: enabled ? current?.polygons ?? emptyPolygons : emptyPolygons,
    loading: enabled && targets.length > 0 && (!current || current.revision !== revision || current.pending > 0),
    errors: enabled ? current?.errors ?? 0 : 0,
    retry,
  }
}
