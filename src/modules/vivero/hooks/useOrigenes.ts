import { useEffect, useState } from 'react'
import { OrigenesService, type OrigenesLectura } from '../api/origenes.api'

export function useOrigenes(actorId: string | null, viveroId: string | null, page = 1, version = 0, incluirRequisitosInicio = false) {
  const key = JSON.stringify([actorId, viveroId, page, version, incluirRequisitosInicio])
  const [state, setState] = useState<{ key: string; reading: OrigenesLectura | null; error: string | null } | null>(null)
  useEffect(() => {
    if (!actorId || !viveroId) return
    const controller = new AbortController()
    void OrigenesService.listar(actorId, viveroId, page, controller.signal, incluirRequisitosInicio).then(reading => {
      if (!controller.signal.aborted) setState({ key, reading, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, reading: null, error: error instanceof Error ? error.message : 'No se pudo consultar el material.' })
    })
    return () => controller.abort()
  }, [actorId, viveroId, page, incluirRequisitosInicio, key])
  const current = state?.key === key ? state : null
  return { items: current?.reading?.data ?? [], pagination: current?.reading?.pagination ?? null, loading: Boolean(actorId && viveroId && !current), error: current?.error ?? null }
}
