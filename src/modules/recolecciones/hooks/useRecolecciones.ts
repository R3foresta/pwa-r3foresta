import { useEffect, useState } from 'react'
import { RecoleccionesService, type ListRecoleccionesResult, type TipoMaterialCanonico } from '../../../services/recolecciones.service'

export type MaterialFilter = 'all' | TipoMaterialCanonico
type Read = { key: string } & ({ data: ListRecoleccionesResult; error?: never } | { data?: never; error: string })

export function useRecolecciones(query: string, filter: MaterialFilter, page: number, actor: string | undefined, token: string | null) {
  const [read, setRead] = useState<Read | null>(null)
  const [attempt, setAttempt] = useState(0)
  const search = query.trim()
  const key = JSON.stringify([search, filter, page, actor, token, attempt])

  useEffect(() => {
    const controller = new AbortController()
    const current = () => !controller.signal.aborted && localStorage.getItem('authToken') === token
    const timeout = setTimeout(() => {
      RecoleccionesService.list({ page, limit: 30, q: search || undefined, tipo_material: filter === 'all' ? undefined : filter }, controller.signal).then(
        data => { if (current()) setRead({ key, data }) },
        error => { if (current()) setRead({ key, error: error instanceof Error ? error.message : 'No se pudo cargar recolecciones.' }) },
      )
    }, search ? 350 : 0)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [key, search, filter, page, token])

  const visible = read?.key === key ? read : null
  return {
    items: visible?.data?.data ?? [],
    pagination: visible?.data?.pagination ?? null,
    loading: visible === null,
    error: visible?.error ?? null,
    retry: () => setAttempt(value => value + 1),
  }
}
