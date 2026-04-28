import { useCallback, useEffect, useRef, useState } from 'react'
import { LotesViveroService } from '../../../services/lotes-vivero.service'
import type { ApiPagination } from '../types/contracts'
import type { ViveroLotCardData } from '../types/view-models'
import type { StageFilter } from '../utils/stageFilters'

type UseViveroLotsOptions = {
  stageFilter: StageFilter
  searchQuery?: string
  page: number
  limit: number
}

type UseViveroLotsResult = {
  lots: ViveroLotCardData[]
  pagination: ApiPagination | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useViveroLots(options: UseViveroLotsOptions): UseViveroLotsResult {
  const { stageFilter, searchQuery, page, limit } = options
  const [lots, setLots] = useState<ViveroLotCardData[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current

    try {
      setLoading(true)
      setError(null)

      const response = await LotesViveroService.listForUi({
        stageFilter,
        searchQuery,
        page,
        limit,
      })

      // Evita que respuestas viejas sobreescriban estado reciente.
      if (requestId !== requestIdRef.current) return

      setLots(response.items)
      setPagination(response.pagination)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : 'Error al cargar lotes de vivero.')
      setLots([])
      setPagination(null)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [limit, page, searchQuery, stageFilter])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { lots, pagination, loading, error, refetch }
}
