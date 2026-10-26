import { useEffect, useMemo, useState } from 'react'
import { ImpactoApiError, ImpactoService } from '../../impacto/api/impacto.api'
import type { ImpactoSubcampania } from '../../impacto/types'
import type { CapacidadSubcampania } from '../types'

type Result = { key: object; zones: ImpactoSubcampania[]; failures: string[] }

/** Geometría pública opcional; capacidades sigue siendo la fuente del conjunto autorizado. */
export function useParticipacionInicioMap(scopes: CapacidadSubcampania[]) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const serialized = JSON.stringify(scopes.map(scope => [scope.campania_id, scope.subcampania_id]))
  const key = useMemo(() => ({ serialized, revision }), [serialized, revision])
  useEffect(() => {
    const controller = new AbortController()
    const pairs = JSON.parse(key.serialized) as [string, string][]
    const campaigns = [...new Set(pairs.map(([id]) => id))]
    const allowed = new Set(pairs.map(([campaign, id]) => `${campaign}:${id}`))
    const zones: ImpactoSubcampania[] = []
    const failures: string[] = []
    let next = 0
    async function worker() {
      while (next < campaigns.length && !controller.signal.aborted) {
        const id = campaigns[next++]
        try {
          // Subcampañas es una proyección completa; cursor pagina sólo registros.
          const { data } = await ImpactoService.consultar({ tipo: 'campania', id }, { limite: 1 }, controller.signal)
          zones.push(...data.subcampanias.filter(zone => allowed.has(`${zone.campania_id}:${zone.id}`) && zone.poligono))
        } catch (error) {
          // Un ámbito no público no es un fallo ni concede acceso a lecturas internas.
          if (!(error instanceof ImpactoApiError && error.status === 404)) failures.push(id)
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, campaigns.length) }, worker)).then(() => {
      if (!controller.signal.aborted) setResult({ key, zones, failures })
    })
    return () => controller.abort()
  }, [key])
  const current = result?.key === key ? result : null
  return { zones: current?.zones ?? [], failures: current?.failures ?? [], loading: !current, retry: () => setRevision(value => value + 1) }
}
