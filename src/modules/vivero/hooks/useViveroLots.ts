import { useEffect, useState } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type { LoteViveroItem } from '../types/contracts'
import {
  buildBackendQueryForStageFilter,
  matchesStageFilter,
  type StageFilter,
} from '../utils/stageFilters'

type UseViveroLotsResult = {
  lots: LoteViveroItem[]
  loading: boolean
  error: string | null
}

export function useViveroLots(stageFilter: StageFilter): UseViveroLotsResult {
  const [lots, setLots] = useState<LoteViveroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLots = async () => {
      try {
        setLoading(true)
        setError(null)

        const query = {
          page: 1,
          limit: 50,
          ...buildBackendQueryForStageFilter(stageFilter),
        }

        const response = await LotesViveroService.list(query)
        const stageScoped = response.data.filter((lot) => matchesStageFilter(lot, stageFilter))

        if (isMounted) {
          setLots(stageScoped)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar lotes de vivero.')
          setLots([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLots()
    return () => {
      isMounted = false
    }
  }, [stageFilter])

  return { lots, loading, error }
}
