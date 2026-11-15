import { useAuth } from '../../../contexts/AuthContext'
import { useOperationalAccess } from '../../accesos/capabilitiesContext'
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
  subcampaniaId?: string | number
}

type UseViveroLotsResult = {
  lots: ViveroLotCardData[]
  pagination: ApiPagination | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useViveroLots(options: UseViveroLotsOptions): UseViveroLotsResult {
  const { user } = useAuth()
  const { m2 } = useOperationalAccess()
  const token = localStorage.getItem('authToken')
  const accessKey = JSON.stringify([user?.id, token, m2.status, m2.data])
  const { stageFilter, searchQuery, page, limit, subcampaniaId } = options
  const [lots, setLots] = useState<ViveroLotCardData[]>([])
  const [pagination, setPagination] = useState<ApiPagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const queryKey = JSON.stringify([accessKey, limit, page, searchQuery, stageFilter, subcampaniaId])

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
        subcampaniaId,
      }, { token })

      // Evita que respuestas viejas sobreescriban estado reciente.
      if (requestId !== requestIdRef.current || localStorage.getItem('authToken') !== token) return

      setLoadedKey(queryKey)
      setLots(response.items)
      setPagination(response.pagination)
    } catch (err) {
      if (requestId !== requestIdRef.current || localStorage.getItem('authToken') !== token) return
      setLoadedKey(queryKey)
      setError(err instanceof Error ? err.message : 'Error al cargar lotes de vivero.')
      setLots([])
      setPagination(null)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [limit, page, searchQuery, stageFilter, subcampaniaId, token, queryKey])

  useEffect(() => {
    void refetch()
    return () => { requestIdRef.current += 1 }
  }, [refetch])

  const current = loadedKey === queryKey
  return { lots: current ? lots : [], pagination: current ? pagination : null, loading: !current || loading, error: current ? error : null, refetch }
}
